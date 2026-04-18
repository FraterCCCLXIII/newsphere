use feed_rs::model;
use feed_rs::parser;
use lru::LruCache;
use parking_lot::Mutex;
use regex::Regex;
use serde::Serialize;
use std::num::NonZeroUsize;
use std::sync::OnceLock;
use url::Url;

use crate::url_policy::{
    parse_allowed_http_url, validate_url_resolved_ips, validate_url_resolved_ips_sync,
    MAX_ARTICLE_HTML_BYTES, MAX_FEED_BYTES,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedItemDto {
    pub title: String,
    pub link: String,
    pub published: Option<String>,
    /// Short excerpt from summary or full content (HTML allowed; client strips for display).
    pub snippet: Option<String>,
    /// Representative image URL from Media RSS / thumbnails when present.
    pub image_url: Option<String>,
}

struct FeedCacheEntry {
    etag: Option<String>,
    last_modified: Option<String>,
    items: Vec<FeedItemDto>,
}

fn feed_cache() -> &'static Mutex<LruCache<String, FeedCacheEntry>> {
    static CACHE: OnceLock<Mutex<LruCache<String, FeedCacheEntry>>> = OnceLock::new();
    CACHE.get_or_init(|| {
        Mutex::new(LruCache::new(
            NonZeroUsize::new(256).expect("non-zero LRU capacity"),
        ))
    })
}

fn redirect_policy() -> reqwest::redirect::Policy {
    reqwest::redirect::Policy::custom(|attempt| {
        if attempt.previous().len() > 5 {
            return attempt.error("Too many redirects");
        }
        match validate_url_resolved_ips_sync(attempt.url()) {
            Ok(()) => attempt.follow(),
            Err(e) => attempt.error(e),
        }
    })
}

fn feed_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Newsphere/0.1")
        .redirect(redirect_policy())
        .build()
        .map_err(|e| e.to_string())
}

fn article_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Newsphere/0.1")
        .redirect(redirect_policy())
        .build()
        .map_err(|e| e.to_string())
}

async fn read_body_capped(
    mut resp: reqwest::Response,
    max_bytes: usize,
) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    loop {
        match resp.chunk().await.map_err(|e| e.to_string())? {
            Some(chunk) => {
                if out.len() + chunk.len() > max_bytes {
                    return Err(format!("Response too large (max {} bytes)", max_bytes));
                }
                out.extend_from_slice(&chunk);
            }
            None => break,
        }
    }
    Ok(out)
}

/// Full summary or HTML content (before truncation) for image extraction.
fn raw_snippet_source(entry: &feed_rs::model::Entry) -> Option<String> {
    entry
        .summary
        .as_ref()
        .map(|t| t.content.clone())
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            entry
                .content
                .as_ref()
                .and_then(|c| c.body.clone())
                .filter(|s| !s.trim().is_empty())
        })
}

/// Summary / description / content body for timeline previews (bounded length).
fn pick_snippet(entry: &feed_rs::model::Entry) -> Option<String> {
    let raw = raw_snippet_source(entry)?;
    Some(truncate_snippet(raw, 1400))
}

fn truncate_snippet(s: String, max_chars: usize) -> String {
    let count = s.chars().count();
    if count <= max_chars {
        return s;
    }
    s.chars().take(max_chars).collect::<String>() + "…"
}

fn is_probably_image_url(url: &str) -> bool {
    let base = url.split('?').next().unwrap_or(url).to_lowercase();
    base.ends_with(".jpg")
        || base.ends_with(".jpeg")
        || base.ends_with(".png")
        || base.ends_with(".webp")
        || base.ends_with(".gif")
        || base.ends_with(".avif")
}

fn resolve_with_base(href: &str, base: Option<&str>) -> String {
    let t = href.trim();
    if t.is_empty() || t.starts_with("data:") {
        return t.to_string();
    }
    if t.starts_with("http://") || t.starts_with("https://") {
        return t.to_string();
    }
    if let Some(b) = base {
        if let Ok(bu) = Url::parse(b) {
            if let Ok(joined) = bu.join(t) {
                return joined.to_string();
            }
        }
    }
    t.to_string()
}

/// Pull `value` from `name="value"` / `name='value'` inside one tag fragment (case-insensitive name).
fn html_attr_value<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let needle = format!("{name}=");
    let lower = tag.to_ascii_lowercase();
    let needle_lower = needle.to_ascii_lowercase();
    let mut search_from = 0usize;
    while let Some(idx) = lower[search_from..].find(&needle_lower) {
        let start = search_from + idx + needle.len();
        let rest = tag.get(start..)?;
        let rest_trim = rest.trim_start();
        let q = rest_trim.chars().next()?;
        if q != '"' && q != '\'' {
            search_from = start + 1;
            continue;
        }
        let end = rest_trim[1..].find(q)?;
        return Some(rest_trim[1..1 + end].trim());
    }
    None
}

/// First useful image URL from HTML description / content:encoded (full string, not truncated).
fn first_img_from_html(html: &str, base: Option<&str>) -> Option<String> {
    static IMG_TAG: OnceLock<Regex> = OnceLock::new();
    let re = IMG_TAG.get_or_init(|| Regex::new(r"(?i)<img\b[^>]*>").unwrap());
    for m in re.find_iter(html) {
        let tag = m.as_str();
        let data_src = html_attr_value(tag, "data-src")
            .or_else(|| html_attr_value(tag, "data-lazy-src"))
            .or_else(|| html_attr_value(tag, "data-original"))
            .or_else(|| html_attr_value(tag, "data-lazy-original"));
        if let Some(ds) = data_src {
            let ds = ds.trim();
            if ds.starts_with("http://") || ds.starts_with("https://") {
                return Some(resolve_with_base(ds, base));
            }
        }
        if let Some(src) = html_attr_value(tag, "src") {
            let src = src.trim();
            if !src.is_empty() && !src.starts_with("data:") {
                let resolved = resolve_with_base(src, base);
                if resolved.starts_with("http://") || resolved.starts_with("https://") {
                    return Some(resolved);
                }
            }
        }
        if let Some(ss) = html_attr_value(tag, "srcset") {
            let first = ss.split(',').next()?.trim().split_whitespace().next()?;
            if !first.is_empty() && !first.starts_with("data:") {
                let resolved = resolve_with_base(first, base);
                if resolved.starts_with("http://") || resolved.starts_with("https://") {
                    return Some(resolved);
                }
            }
        }
    }
    None
}

fn pick_image_url(entry: &model::Entry, article_link: &str) -> Option<String> {
    let base = entry
        .base
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .or(Some(article_link).filter(|s| !s.trim().is_empty()));

    for m in &entry.media {
        for th in &m.thumbnails {
            let u = th.image.uri.trim();
            if !u.is_empty() {
                return Some(resolve_with_base(u, base));
            }
        }
        for mc in &m.content {
            if let Some(ref u) = mc.url {
                let s = u.as_str().trim();
                if s.is_empty() {
                    continue;
                }
                let mime_img = mc
                    .content_type
                    .as_ref()
                    .map(|t| t.as_str().starts_with("image/"))
                    .unwrap_or(false);
                if mime_img || is_probably_image_url(s) {
                    return Some(resolve_with_base(s, base));
                }
            }
        }
    }

    for link in &entry.links {
        let href = link.href.trim();
        if href.is_empty() {
            continue;
        }
        let rel = link.rel.as_deref().unwrap_or("");
        let mt = link.media_type.as_deref().unwrap_or("");
        let enc = rel.eq_ignore_ascii_case("enclosure");
        if mt.starts_with("image/") || (enc && is_probably_image_url(href)) {
            return Some(resolve_with_base(href, base));
        }
    }

    if let Some(c) = &entry.content {
        if let Some(ref link) = c.src {
            let url = link.href.as_str();
            let mime = c.content_type.as_str();
            if mime.starts_with("image/") || is_probably_image_url(url) {
                return Some(resolve_with_base(url.trim(), base));
            }
        }
    }

    None
}

/// Try summary, then full content body — many feeds put images only in `content:encoded`.
fn image_from_entry_html(entry: &model::Entry, article_link: &str) -> Option<String> {
    let base = entry
        .base
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .or(Some(article_link).filter(|s| !s.trim().is_empty()));
    if let Some(s) = entry
        .summary
        .as_ref()
        .map(|t| t.content.as_str())
        .filter(|s| !s.trim().is_empty())
    {
        if let Some(u) = first_img_from_html(s, base) {
            return Some(u);
        }
    }
    if let Some(b) = entry
        .content
        .as_ref()
        .and_then(|c| c.body.as_deref())
        .filter(|s| !s.trim().is_empty())
    {
        if let Some(u) = first_img_from_html(b, base) {
            return Some(u);
        }
    }
    None
}

fn pick_link(links: &[feed_rs::model::Link]) -> String {
    links
        .iter()
        .find(|l| l.rel.as_deref() == Some("alternate"))
        .or_else(|| links.iter().find(|l| l.rel.is_none()))
        .or_else(|| links.first())
        .map(|l| l.href.clone())
        .unwrap_or_default()
}

fn parse_feed_bytes(bytes: &[u8]) -> Result<Vec<FeedItemDto>, String> {
    let feed = parser::parse(bytes).map_err(|e| format!("Feed parse: {e}"))?;

    let items: Vec<FeedItemDto> = feed
        .entries
        .into_iter()
        .take(40)
        .map(|entry| {
            let link = pick_link(&entry.links);
            let snippet = pick_snippet(&entry);
            let image_url = pick_image_url(&entry, link.as_str())
                .or_else(|| image_from_entry_html(&entry, link.as_str()));
            let published = entry
                .published
                .or(entry.updated)
                .map(|d| d.to_rfc3339());
            let title = entry
                .title
                .map(|t| t.content)
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "(No title)".to_string());
            FeedItemDto {
                title,
                link,
                published,
                snippet,
                image_url,
            }
        })
        .collect();

    Ok(items)
}

/// Fetch and parse RSS or Atom from `url` (server-side; avoids browser CORS).
///
/// Uses `If-None-Match` / `If-Modified-Since` when we have a prior response. On
/// `304 Not Modified`, returns the last parsed items from an in-memory cache
/// (no full download or parse).
#[tauri::command]
pub async fn fetch_feed(url: String) -> Result<Vec<FeedItemDto>, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty feed URL".into());
    }
    let parsed = parse_allowed_http_url(trimmed)?;
    validate_url_resolved_ips(&parsed).await?;
    let url_key = trimmed.to_string();

    let client = feed_client()?;

    let (cached_etag, cached_last_mod) = {
        let mut guard = feed_cache().lock();
        guard
            .get(&url_key)
            .map(|e| (e.etag.clone(), e.last_modified.clone()))
            .unwrap_or((None, None))
    };

    let mut req = client.get(parsed);
    if let Some(ref e) = cached_etag {
        req = req.header("If-None-Match", e);
    }
    if let Some(ref lm) = cached_last_mod {
        req = req.header("If-Modified-Since", lm);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();

    if status.as_u16() == 304 {
        let mut guard = feed_cache().lock();
        return guard
            .get(&url_key)
            .map(|e| e.items.clone())
            .ok_or_else(|| "304 Not Modified but no cached feed".to_string());
    }

    if !status.is_success() {
        return Err(format!("HTTP {}", status));
    }

    let etag_new = resp
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let last_modified_new = resp
        .headers()
        .get("last-modified")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let bytes = read_body_capped(resp, MAX_FEED_BYTES).await?;
    let items = parse_feed_bytes(&bytes)?;

    {
        let mut guard = feed_cache().lock();
        guard.put(
            url_key,
            FeedCacheEntry {
                etag: etag_new,
                last_modified: last_modified_new,
                items: items.clone(),
            },
        );
    }

    Ok(items)
}

/// Fetch raw HTML from an article URL (server-side; avoids browser CORS).
#[tauri::command]
pub async fn fetch_article_html(url: String) -> Result<String, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty URL".into());
    }
    let parsed = parse_allowed_http_url(trimmed)?;
    validate_url_resolved_ips(&parsed).await?;

    let client = article_client()?;
    let resp = client.get(parsed).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let bytes = read_body_capped(resp, MAX_ARTICLE_HTML_BYTES).await?;
    String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {e}"))
}

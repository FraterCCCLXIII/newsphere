use feed_rs::parser;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedItemDto {
    pub title: String,
    pub link: String,
    pub published: Option<String>,
    /// Short excerpt from summary or full content (HTML allowed; client strips for display).
    pub snippet: Option<String>,
}

/// Summary / description / content body for timeline previews (bounded length).
fn pick_snippet(entry: &feed_rs::model::Entry) -> Option<String> {
    let raw = entry
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
        })?;
    Some(truncate_snippet(raw, 1400))
}

fn truncate_snippet(s: String, max_chars: usize) -> String {
    let count = s.chars().count();
    if count <= max_chars {
        return s;
    }
    s.chars().take(max_chars).collect::<String>() + "…"
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

/// Fetch and parse RSS or Atom from `url` (server-side; avoids browser CORS).
#[tauri::command]
pub async fn fetch_feed(url: String) -> Result<Vec<FeedItemDto>, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("Empty feed URL".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("Newsphere/0.1 (+https://github.com/tauri-apps/tauri)")
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let feed = parser::parse(&bytes[..]).map_err(|e| format!("Feed parse: {e}"))?;

    let items: Vec<FeedItemDto> = feed
        .entries
        .into_iter()
        .take(40)
        .map(|entry| {
            let snippet = pick_snippet(&entry);
            let title = entry
                .title
                .map(|t| t.content)
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "(No title)".to_string());
            let link = pick_link(&entry.links);
            let published = entry
                .published
                .or(entry.updated)
                .map(|d| d.to_rfc3339());
            FeedItemDto {
                title,
                link,
                published,
                snippet,
            }
        })
        .collect();

    Ok(items)
}

/// Fetch raw HTML from an article URL (server-side; avoids browser CORS).
#[tauri::command]
pub async fn fetch_article_html(url: String) -> Result<String, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("Empty URL".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Newsphere/0.1")
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    resp.text().await.map_err(|e| e.to_string())
}

//! HTTP(S) URL validation and SSRF mitigation for outbound fetches.

use std::net::{IpAddr, ToSocketAddrs};
use url::Url;

/// Max feed response size (bytes).
pub const MAX_FEED_BYTES: usize = 5 * 1024 * 1024;
/// Max article HTML response size (bytes).
pub const MAX_ARTICLE_HTML_BYTES: usize = 10 * 1024 * 1024;

/// Parse `raw` as an absolute http(s) URL and enforce host rules (no resolution yet).
pub fn parse_allowed_http_url(raw: &str) -> Result<Url, String> {
    let u = Url::parse(raw.trim()).map_err(|e| format!("Invalid URL: {e}"))?;
    validate_url_scheme_and_host_str(&u)?;
    Ok(u)
}

fn validate_url_scheme_and_host_str(url: &Url) -> Result<(), String> {
    match url.scheme() {
        "http" | "https" => {}
        _ => return Err("Only http and https URLs are allowed".into()),
    }
    let host = url.host_str().ok_or("Missing host")?;
    block_dangerous_hostnames(host)
}

fn block_dangerous_hostnames(host: &str) -> Result<(), String> {
    let h = host.to_lowercase();
    if h == "localhost" || h.ends_with(".localhost") {
        return Err("Blocked host".into());
    }
    if h.ends_with(".local") || h == ".local" {
        return Err("Blocked host".into());
    }
    if h == "metadata.google.internal" || h == "169.254.169.254" {
        return Err("Blocked host".into());
    }
    Ok(())
}

/// True if this IP must not be reached (loopback, private, link-local, CGNAT, metadata).
pub fn is_ip_blocked(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let o = v4.octets();
            if o == [169, 254, 169, 254] {
                return true;
            }
            if o[0] == 127 || o[0] == 0 {
                return true;
            }
            if o[0] == 10 {
                return true;
            }
            if o[0] == 172 && (16..=31).contains(&o[1]) {
                return true;
            }
            if o[0] == 192 && o[1] == 168 {
                return true;
            }
            if o[0] == 169 && o[1] == 254 {
                return true;
            }
            // CGNAT range 100.64.0.0/10
            if o[0] == 100 && o[1] >= 64 && o[1] <= 127 {
                return true;
            }
            // Multicast / reserved
            if o[0] >= 224 {
                return true;
            }
            false
        }
        IpAddr::V6(v6) => {
            v6.is_loopback() || v6.is_unicast_link_local() || v6.is_unique_local()
        }
    }
}

/// Resolve hostname asynchronously; reject if any A/AAAA maps to a blocked IP.
pub async fn validate_url_resolved_ips(url: &Url) -> Result<(), String> {
    validate_url_scheme_and_host_str(url)?;
    let host = url.host_str().ok_or("Missing host")?;
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_ip_blocked(ip) {
            return Err("Blocked IP address".into());
        }
        return Ok(());
    }

    let port = url.port_or_known_default().unwrap_or(443);
    let mut found = false;
    for sa in tokio::net::lookup_host((host, port))
        .await
        .map_err(|e| format!("DNS error: {e}"))?
    {
        found = true;
        if is_ip_blocked(sa.ip()) {
            return Err(format!("Blocked resolved address: {}", sa.ip()));
        }
    }

    if !found {
        return Err("Could not resolve host".into());
    }
    Ok(())
}

/// Blocking DNS resolution for redirect policy (sync); use only from reqwest redirect callback.
pub fn validate_url_resolved_ips_sync(url: &Url) -> Result<(), String> {
    validate_url_scheme_and_host_str(url)?;
    let host = url.host_str().ok_or("Missing host")?;
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_ip_blocked(ip) {
            return Err("Blocked IP address".into());
        }
        return Ok(());
    }

    let port = url.port_or_known_default().unwrap_or(443);
    let addr_str = format!("{host}:{port}");
    let addrs: Vec<_> = addr_str
        .to_socket_addrs()
        .map_err(|e| format!("DNS error: {e}"))?
        .collect();
    if addrs.is_empty() {
        return Err("Could not resolve host".into());
    }
    for sa in addrs {
        if is_ip_blocked(sa.ip()) {
            return Err(format!("Blocked resolved address: {}", sa.ip()));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_loopback_v4() {
        assert!(is_ip_blocked("127.0.0.1".parse().unwrap()));
        assert!(is_ip_blocked("127.43.21.9".parse().unwrap()));
    }

    #[test]
    fn blocks_private_v4() {
        assert!(is_ip_blocked("10.0.0.1".parse().unwrap()));
        assert!(is_ip_blocked("172.16.0.1".parse().unwrap()));
        assert!(is_ip_blocked("192.168.1.1".parse().unwrap()));
        assert!(is_ip_blocked("169.254.0.1".parse().unwrap()));
        assert!(is_ip_blocked("100.64.0.1".parse().unwrap()));
    }

    #[test]
    fn allows_public_v4() {
        assert!(!is_ip_blocked("8.8.8.8".parse().unwrap()));
    }

    #[test]
    fn rejects_localhost_url() {
        assert!(parse_allowed_http_url("http://localhost/feed").is_err());
        assert!(parse_allowed_http_url("https://evil.local/").is_err());
    }

    #[test]
    fn accepts_https_example() {
        assert!(parse_allowed_http_url("https://example.com/path?x=1").is_ok());
    }

    #[test]
    fn rejects_non_http_scheme() {
        assert!(parse_allowed_http_url("javascript:alert(1)").is_err());
        assert!(parse_allowed_http_url("ftp://files.example.com/").is_err());
    }
}

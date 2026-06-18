use crate::models::AbilityReport;
use serde_json::{json, Value};
use std::io::{ErrorKind, Read, Write};
use std::net::TcpStream;
use std::time::Duration;

pub fn summarize_report(
    host: &str,
    model: &str,
    timeout_sec: u64,
    report: &AbilityReport,
) -> Result<String, String> {
    let prompt = build_prompt(report)?;
    let payload = json!({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "stream": false,
        "think": false,
        "options": {
            "temperature": 0.2,
            "num_predict": 2048
        }
    });
    let response = post_json(host, "/api/chat", &payload.to_string(), timeout_sec)?;
    let value: Value = serde_json::from_str(&response)
        .map_err(|error| format!("failed to parse Ollama response: {error}; body={response}"))?;

    value
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or_else(|| format!("Ollama response did not include text: {response}"))
}

fn build_prompt(report: &AbilityReport) -> Result<String, String> {
    let players = report
        .players
        .iter()
        .map(|player| {
            format!(
                "{}: clips={}, overall={}, shooting={}, playmaking={}, defense={}, reliability={}, review_ratio={:.2}, actions={:?}",
                player.player_id,
                player.clip_count,
                player.scores.overall,
                player.scores.shooting,
                player.scores.playmaking,
                player.scores.defense,
                player.scores.reliability,
                player.needs_review_ratio,
                player.action_counts
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    Ok(format!(
        "/no_think\n你是篮球训练分析助手。请不要输出思考过程。请基于下面的 AGU 球员能力摘要，用中文输出简洁教练摘要。\
         要求：1) 只基于数据，不编造真实技术统计；2) 点出最强球员、主要能力、需要复核的问题；\
         3) 最多 5 条短句；4) 总字数不超过 120 字。\n\n\
         总览: players={}, clips={}, needs_review={}\n球员:\n{players}",
        report.totals.player_count, report.totals.clip_count, report.totals.needs_review_count
    ))
}

fn post_json(host: &str, path: &str, body: &str, timeout_sec: u64) -> Result<String, String> {
    let (address, host_header) = parse_http_host(host)?;
    let mut stream = TcpStream::connect(&address)
        .map_err(|error| format!("failed to connect to Ollama at {address}: {error}"))?;
    let timeout = Some(Duration::from_secs(timeout_sec));
    stream.set_read_timeout(timeout).ok();
    stream.set_write_timeout(timeout).ok();

    let request = format!(
        "POST {path} HTTP/1.1\r\nHost: {host_header}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.as_bytes().len()
    );
    stream
        .write_all(request.as_bytes())
        .map_err(|error| format!("failed to write Ollama request: {error}"))?;

    let response = read_http_response(&mut stream)?;
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| format!("invalid HTTP response from Ollama: {response}"))?;

    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err(format!(
            "Ollama returned non-200 response: {headers}; body={body}"
        ));
    }

    if headers
        .to_ascii_lowercase()
        .contains("transfer-encoding: chunked")
    {
        decode_chunked_body(body)
    } else {
        Ok(body.to_string())
    }
}

fn read_http_response(stream: &mut TcpStream) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let mut header_end = None;

    loop {
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(read) => {
                buffer.extend_from_slice(&chunk[..read]);
                if header_end.is_none() {
                    header_end = find_header_end(&buffer);
                }
                if let Some(end) = header_end {
                    let headers = String::from_utf8_lossy(&buffer[..end]).to_ascii_lowercase();
                    if let Some(content_length) = parse_content_length(&headers) {
                        if buffer.len() >= end + 4 + content_length {
                            buffer.truncate(end + 4 + content_length);
                            break;
                        }
                    } else if headers.contains("transfer-encoding: chunked")
                        && buffer[end + 4..]
                            .windows(5)
                            .any(|window| window == b"0\r\n\r\n")
                    {
                        break;
                    }
                }
            }
            Err(error)
                if error.kind() == ErrorKind::WouldBlock || error.kind() == ErrorKind::TimedOut =>
            {
                if !buffer.is_empty() {
                    break;
                }
                return Err(format!("timed out reading Ollama response: {error}"));
            }
            Err(error) => return Err(format!("failed to read Ollama response: {error}")),
        }
    }

    String::from_utf8(buffer).map_err(|error| format!("Ollama response was not UTF-8: {error}"))
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn parse_content_length(headers: &str) -> Option<usize> {
    headers.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.eq_ignore_ascii_case("content-length") {
            value.trim().parse().ok()
        } else {
            None
        }
    })
}

fn decode_chunked_body(body: &str) -> Result<String, String> {
    let mut rest = body;
    let mut decoded = String::new();

    loop {
        let (size_hex, after_size) = rest
            .split_once("\r\n")
            .ok_or_else(|| "invalid chunked response: missing chunk size".to_string())?;
        let size_text = size_hex.split(';').next().unwrap_or(size_hex).trim();
        let size = usize::from_str_radix(size_text, 16)
            .map_err(|error| format!("invalid chunk size '{size_text}': {error}"))?;
        if size == 0 {
            break;
        }
        if after_size.len() < size + 2 {
            return Err("invalid chunked response: chunk body is incomplete".to_string());
        }
        decoded.push_str(&after_size[..size]);
        rest = &after_size[size + 2..];
    }

    Ok(decoded)
}

fn parse_http_host(url: &str) -> Result<(String, String), String> {
    let trimmed = url.trim_end_matches('/');
    let without_scheme = trimmed
        .strip_prefix("http://")
        .ok_or_else(|| "only http:// Ollama hosts are supported for the local agent".to_string())?;
    let host_port = without_scheme
        .split('/')
        .next()
        .ok_or_else(|| format!("invalid Ollama host: {url}"))?;
    if host_port.is_empty() {
        return Err(format!("invalid Ollama host: {url}"));
    }

    let address = if host_port.contains(':') {
        host_port.to_string()
    } else {
        format!("{host_port}:80")
    };
    Ok((address, host_port.to_string()))
}

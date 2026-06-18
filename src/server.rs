use crate::ability;
use crate::agu_cli;
use crate::config::{AnalyzeConfig, ServeConfig};
use crate::models::{AbilityReport, AguTaskStatus};
use crate::ollama;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

#[derive(Debug, Deserialize)]
struct AnalyzeRequest {
    video: String,
    #[serde(default)]
    vlm_mode: Option<String>,
    #[serde(default)]
    max_frames: Option<u32>,
    #[serde(default)]
    generate_video: Option<bool>,
}

pub fn serve(config: ServeConfig) -> Result<(), String> {
    let address = format!("{}:{}", config.host, config.port);
    let listener = TcpListener::bind(&address)
        .map_err(|error| format!("failed to bind {address}: {error}"))?;
    println!("agu-agent listening on http://{address}");

    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => {
                if let Err(error) = handle_connection(stream, &config) {
                    eprintln!("{error}");
                }
            }
            Err(error) => eprintln!("failed to accept connection: {error}"),
        }
    }

    Ok(())
}

fn handle_connection(mut stream: TcpStream, config: &ServeConfig) -> Result<(), String> {
    let request = read_http_request(&mut stream)?;
    let (head, body) = request.split_once("\r\n\r\n").unwrap_or((&request, ""));
    let request_line = head.lines().next().unwrap_or_default();
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let path = parts.next().unwrap_or_default();

    let response = match (method, path) {
        ("GET", "/health") => ok_json(json!({"status": "ok"})),
        ("POST", "/summarize") => summarize_body(body, config),
        ("POST", "/analyze") => analyze_body(body, config),
        _ => error_json(404, "not found"),
    };

    stream
        .write_all(response.as_bytes())
        .map_err(|error| format!("failed to write HTTP response: {error}"))?;
    Ok(())
}

fn read_http_request(stream: &mut TcpStream) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 1024];
    let mut header_end = None;

    loop {
        let read = stream
            .read(&mut chunk)
            .map_err(|error| format!("failed to read HTTP request: {error}"))?;
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..read]);
        if header_end.is_none() {
            header_end = find_header_end(&buffer);
        }
        if let Some(end) = header_end {
            let headers = String::from_utf8_lossy(&buffer[..end]);
            let content_length = parse_content_length(&headers).unwrap_or(0);
            let expected = end + 4 + content_length;
            if buffer.len() >= expected {
                buffer.truncate(expected);
                break;
            }
        }
    }

    String::from_utf8(buffer).map_err(|error| format!("HTTP request was not UTF-8: {error}"))
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

fn summarize_body(body: &str, config: &ServeConfig) -> String {
    let status: AguTaskStatus = match serde_json::from_str(body) {
        Ok(status) => status,
        Err(error) => return error_json(400, &format!("invalid AGU status JSON: {error}")),
    };

    match build_report_with_llm(status, config) {
        Ok(report) => ok_report(report),
        Err(error) => error_json(500, &error),
    }
}

fn analyze_body(body: &str, config: &ServeConfig) -> String {
    let request: AnalyzeRequest = match serde_json::from_str(body) {
        Ok(request) => request,
        Err(error) => return error_json(400, &format!("invalid analyze JSON: {error}")),
    };

    let analyze_config = AnalyzeConfig {
        video: request.video,
        agu_root: config.agu_root.clone(),
        python_bin: config.python_bin.clone(),
        api_url: config.api_url.clone(),
        vlm_mode: request.vlm_mode.unwrap_or_else(|| "off".to_string()),
        max_frames: request.max_frames,
        generate_video: request.generate_video.unwrap_or(false),
        poll_interval_sec: config.poll_interval_sec,
        timeout_sec: config.timeout_sec,
        output: None,
        llm: config.llm.clone(),
    };

    match agu_cli::run_analysis(&analyze_config)
        .and_then(|status| build_report_with_llm(status, config))
    {
        Ok(report) => ok_report(report),
        Err(error) => error_json(500, &error),
    }
}

pub fn build_report_with_llm(
    status: AguTaskStatus,
    config: &ServeConfig,
) -> Result<AbilityReport, String> {
    let mut report = ability::build_report(status)?;
    enrich_report_with_llm(&mut report, &config.llm);
    Ok(report)
}

pub fn enrich_report_with_llm(report: &mut AbilityReport, llm: &crate::config::LlmConfig) {
    if !llm.enabled {
        return;
    }

    match ollama::summarize_report(&llm.ollama_host, &llm.ollama_model, llm.timeout_sec, report) {
        Ok(text) => ability::attach_coaching_summary(report, llm.ollama_model.clone(), text),
        Err(error) => report.warnings.push(format!(
            "local Ollama coaching summary unavailable: {error}"
        )),
    }
}

pub fn read_status_file(path: &std::path::Path) -> Result<AguTaskStatus, String> {
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", path.display()))
}

fn ok_report(report: AbilityReport) -> String {
    match serde_json::to_value(report) {
        Ok(value) => ok_json(value),
        Err(error) => error_json(500, &format!("failed to encode report: {error}")),
    }
}

fn ok_json(value: Value) -> String {
    response(200, &value.to_string())
}

fn error_json(status: u16, message: &str) -> String {
    response(status, &json!({"error": message}).to_string())
}

fn response(status: u16, body: &str) -> String {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "Internal Server Error",
    };
    format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.as_bytes().len()
    )
}

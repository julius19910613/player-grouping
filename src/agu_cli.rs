use crate::config::AnalyzeConfig;
use crate::models::{AguSubmitResponse, AguTaskStatus};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

pub fn run_analysis(config: &AnalyzeConfig) -> Result<AguTaskStatus, String> {
    let submit = submit_analysis(config)?;
    poll_status(config, &submit.task_id)
}

fn submit_analysis(config: &AnalyzeConfig) -> Result<AguSubmitResponse, String> {
    let mut args = vec![
        "-m".to_string(),
        "app.cli".to_string(),
        "--api-url".to_string(),
        config.api_url.clone(),
        "analyze".to_string(),
        "--video".to_string(),
        config.video.clone(),
        "--vlm-mode".to_string(),
        config.vlm_mode.clone(),
    ];

    if let Some(max_frames) = config.max_frames {
        args.push("--max-frames".to_string());
        args.push(max_frames.to_string());
    }

    if config.generate_video {
        args.push("--generate-video".to_string());
    } else {
        args.push("--no-generate-video".to_string());
    }

    let stdout = run_agu_command(config, &args)?;
    serde_json::from_str(&stdout)
        .map_err(|error| format!("failed to parse AGU submit response: {error}\n{stdout}"))
}

fn poll_status(config: &AnalyzeConfig, task_id: &str) -> Result<AguTaskStatus, String> {
    let started = Instant::now();

    loop {
        if started.elapsed() > Duration::from_secs(config.timeout_sec) {
            return Err(format!("timed out waiting for AGU task {task_id}"));
        }

        thread::sleep(Duration::from_secs(config.poll_interval_sec));

        let args = vec![
            "-m".to_string(),
            "app.cli".to_string(),
            "--api-url".to_string(),
            config.api_url.clone(),
            "status".to_string(),
            task_id.to_string(),
        ];
        let stdout = run_agu_command(config, &args)?;
        let status: AguTaskStatus = serde_json::from_str(&stdout)
            .map_err(|error| format!("failed to parse AGU status response: {error}\n{stdout}"))?;

        match status.status.as_str() {
            "completed" => return Ok(status),
            "failed" => {
                return Err(format!(
                    "AGU task {task_id} failed: {}",
                    status.error.as_deref().unwrap_or("unknown error")
                ))
            }
            _ => {}
        }
    }
}

fn run_agu_command(config: &AnalyzeConfig, args: &[String]) -> Result<String, String> {
    let output = Command::new(&config.python_bin)
        .current_dir(&config.agu_root)
        .args(args)
        .output()
        .map_err(|error| format!("failed to execute AGU CLI: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "AGU CLI exited with {}: {stderr}{stdout}",
            output.status
        ));
    }

    String::from_utf8(output.stdout)
        .map_err(|error| format!("AGU CLI returned non-UTF8 output: {error}"))
}

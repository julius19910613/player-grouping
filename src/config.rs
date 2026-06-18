use std::env;
use std::path::PathBuf;

#[derive(Debug)]
pub enum Command {
    Analyze(AnalyzeConfig),
    Summarize(SummarizeConfig),
    Serve(ServeConfig),
}

#[derive(Debug)]
pub struct AnalyzeConfig {
    pub video: String,
    pub agu_root: PathBuf,
    pub python_bin: String,
    pub api_url: String,
    pub vlm_mode: String,
    pub max_frames: Option<u32>,
    pub generate_video: bool,
    pub poll_interval_sec: u64,
    pub timeout_sec: u64,
    pub output: Option<PathBuf>,
    pub llm: LlmConfig,
}

#[derive(Debug)]
pub struct SummarizeConfig {
    pub status_json: PathBuf,
    pub output: Option<PathBuf>,
    pub llm: LlmConfig,
}

#[derive(Debug, Clone)]
pub struct ServeConfig {
    pub host: String,
    pub port: u16,
    pub agu_root: PathBuf,
    pub python_bin: String,
    pub api_url: String,
    pub poll_interval_sec: u64,
    pub timeout_sec: u64,
    pub llm: LlmConfig,
}

#[derive(Debug, Clone)]
pub struct LlmConfig {
    pub enabled: bool,
    pub ollama_host: String,
    pub ollama_model: String,
    pub timeout_sec: u64,
}

pub fn parse_args() -> Result<Command, String> {
    let mut args = env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        return Err(help());
    }

    let command = args.remove(0);
    match command.as_str() {
        "analyze" => parse_analyze(args).map(Command::Analyze),
        "summarize" => parse_summarize(args).map(Command::Summarize),
        "serve" => parse_serve(args).map(Command::Serve),
        "-h" | "--help" | "help" => Err(help()),
        other => Err(format!("unknown command: {other}\n\n{}", help())),
    }
}

fn parse_analyze(args: Vec<String>) -> Result<AnalyzeConfig, String> {
    let mut video = None;
    let mut agu_root = env::var("AGU_AGENT_AGU_ROOT").ok().map(PathBuf::from);
    let mut python_bin = env::var("AGU_AGENT_PYTHON_BIN").unwrap_or_else(|_| "python".to_string());
    let mut api_url =
        env::var("AGU_AGENT_AGU_API_URL").unwrap_or_else(|_| "http://127.0.0.1:8765".to_string());
    let mut vlm_mode = "off".to_string();
    let mut max_frames = None;
    let mut generate_video = false;
    let mut poll_interval_sec = env::var("AGU_AGENT_POLL_INTERVAL_SEC")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(2);
    let mut timeout_sec = env::var("AGU_AGENT_TIMEOUT_SEC")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(1800);
    let mut output = None;
    let mut llm = default_llm_config();

    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--video" => video = Some(take_value(&args, &mut index, "--video")?),
            "--agu-root" => {
                agu_root = Some(PathBuf::from(take_value(&args, &mut index, "--agu-root")?))
            }
            "--python-bin" => python_bin = take_value(&args, &mut index, "--python-bin")?,
            "--api-url" => api_url = take_value(&args, &mut index, "--api-url")?,
            "--vlm-mode" => vlm_mode = take_value(&args, &mut index, "--vlm-mode")?,
            "--max-frames" => {
                max_frames = Some(parse_u32(
                    &take_value(&args, &mut index, "--max-frames")?,
                    "--max-frames",
                )?)
            }
            "--generate-video" => generate_video = true,
            "--poll-interval-sec" => {
                poll_interval_sec = parse_u64(
                    &take_value(&args, &mut index, "--poll-interval-sec")?,
                    "--poll-interval-sec",
                )?
            }
            "--timeout-sec" => {
                timeout_sec = parse_u64(
                    &take_value(&args, &mut index, "--timeout-sec")?,
                    "--timeout-sec",
                )?
            }
            "--output" => output = Some(PathBuf::from(take_value(&args, &mut index, "--output")?)),
            "--no-llm" => llm.enabled = false,
            "--ollama-host" => llm.ollama_host = take_value(&args, &mut index, "--ollama-host")?,
            "--ollama-model" => llm.ollama_model = take_value(&args, &mut index, "--ollama-model")?,
            "--ollama-timeout-sec" => {
                llm.timeout_sec = parse_u64(
                    &take_value(&args, &mut index, "--ollama-timeout-sec")?,
                    "--ollama-timeout-sec",
                )?
            }
            "-h" | "--help" => return Err(help()),
            other => return Err(format!("unknown analyze flag: {other}")),
        }
        index += 1;
    }

    Ok(AnalyzeConfig {
        video: video.ok_or_else(|| "--video is required".to_string())?,
        agu_root: agu_root.unwrap_or_else(|| PathBuf::from("/Users/ppt/projects/agu")),
        python_bin,
        api_url,
        vlm_mode,
        max_frames,
        generate_video,
        poll_interval_sec,
        timeout_sec,
        output,
        llm,
    })
}

fn parse_summarize(args: Vec<String>) -> Result<SummarizeConfig, String> {
    let mut status_json = None;
    let mut output = None;
    let mut llm = default_llm_config();

    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--status-json" => {
                status_json = Some(PathBuf::from(take_value(
                    &args,
                    &mut index,
                    "--status-json",
                )?))
            }
            "--output" => output = Some(PathBuf::from(take_value(&args, &mut index, "--output")?)),
            "--no-llm" => llm.enabled = false,
            "--ollama-host" => llm.ollama_host = take_value(&args, &mut index, "--ollama-host")?,
            "--ollama-model" => llm.ollama_model = take_value(&args, &mut index, "--ollama-model")?,
            "--ollama-timeout-sec" => {
                llm.timeout_sec = parse_u64(
                    &take_value(&args, &mut index, "--ollama-timeout-sec")?,
                    "--ollama-timeout-sec",
                )?
            }
            "-h" | "--help" => return Err(help()),
            other => return Err(format!("unknown summarize flag: {other}")),
        }
        index += 1;
    }

    Ok(SummarizeConfig {
        status_json: status_json.ok_or_else(|| "--status-json is required".to_string())?,
        output,
        llm,
    })
}

fn parse_serve(args: Vec<String>) -> Result<ServeConfig, String> {
    let mut host = env::var("AGU_AGENT_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let mut port = env::var("AGU_AGENT_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(8787);
    let mut agu_root = env::var("AGU_AGENT_AGU_ROOT")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/Users/ppt/projects/agu"));
    let mut python_bin = env::var("AGU_AGENT_PYTHON_BIN").unwrap_or_else(|_| "python".to_string());
    let mut api_url =
        env::var("AGU_AGENT_AGU_API_URL").unwrap_or_else(|_| "http://127.0.0.1:8765".to_string());
    let mut poll_interval_sec = env::var("AGU_AGENT_POLL_INTERVAL_SEC")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(2);
    let mut timeout_sec = env::var("AGU_AGENT_TIMEOUT_SEC")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(1800);
    let mut llm = default_llm_config();

    let mut index = 0;
    while index < args.len() {
        match args[index].as_str() {
            "--host" => host = take_value(&args, &mut index, "--host")?,
            "--port" => port = parse_u16(&take_value(&args, &mut index, "--port")?, "--port")?,
            "--agu-root" => agu_root = PathBuf::from(take_value(&args, &mut index, "--agu-root")?),
            "--python-bin" => python_bin = take_value(&args, &mut index, "--python-bin")?,
            "--api-url" => api_url = take_value(&args, &mut index, "--api-url")?,
            "--poll-interval-sec" => {
                poll_interval_sec = parse_u64(
                    &take_value(&args, &mut index, "--poll-interval-sec")?,
                    "--poll-interval-sec",
                )?
            }
            "--timeout-sec" => {
                timeout_sec = parse_u64(
                    &take_value(&args, &mut index, "--timeout-sec")?,
                    "--timeout-sec",
                )?
            }
            "--no-llm" => llm.enabled = false,
            "--ollama-host" => llm.ollama_host = take_value(&args, &mut index, "--ollama-host")?,
            "--ollama-model" => llm.ollama_model = take_value(&args, &mut index, "--ollama-model")?,
            "--ollama-timeout-sec" => {
                llm.timeout_sec = parse_u64(
                    &take_value(&args, &mut index, "--ollama-timeout-sec")?,
                    "--ollama-timeout-sec",
                )?
            }
            "-h" | "--help" => return Err(help()),
            other => return Err(format!("unknown serve flag: {other}")),
        }
        index += 1;
    }

    Ok(ServeConfig {
        host,
        port,
        agu_root,
        python_bin,
        api_url,
        poll_interval_sec,
        timeout_sec,
        llm,
    })
}

fn take_value(args: &[String], index: &mut usize, flag: &str) -> Result<String, String> {
    *index += 1;
    args.get(*index)
        .cloned()
        .ok_or_else(|| format!("{flag} requires a value"))
}

fn parse_u32(value: &str, flag: &str) -> Result<u32, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} must be an unsigned integer"))
}

fn parse_u64(value: &str, flag: &str) -> Result<u64, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} must be an unsigned integer"))
}

fn parse_u16(value: &str, flag: &str) -> Result<u16, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} must be a valid port"))
}

fn default_llm_config() -> LlmConfig {
    LlmConfig {
        enabled: env::var("AGU_AGENT_LLM_ENABLED")
            .map(|value| value != "0" && value.to_lowercase() != "false")
            .unwrap_or(true),
        ollama_host: env::var("AGU_AGENT_OLLAMA_HOST")
            .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string()),
        ollama_model: env::var("AGU_AGENT_OLLAMA_MODEL")
            .unwrap_or_else(|_| "qwen3-vl:4b".to_string()),
        timeout_sec: env::var("AGU_AGENT_OLLAMA_TIMEOUT_SEC")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(180),
    }
}

fn help() -> String {
    r#"agu-agent

Usage:
  agu-agent analyze --video <path> [--agu-root <path>] [--api-url <url>] [--max-frames <n>] [--output <file>]
  agu-agent summarize --status-json <file> [--output <file>]
  agu-agent serve [--host 127.0.0.1] [--port 8787]

Analyze flags:
  --video <path>              Video path visible to AGU.
  --agu-root <path>           AGU repository root. Defaults to AGU_AGENT_AGU_ROOT or /Users/ppt/projects/agu.
  --python-bin <bin>          Python executable. Defaults to AGU_AGENT_PYTHON_BIN or python.
  --api-url <url>             AGU API URL passed to AGU CLI.
  --vlm-mode <mode>           off | low-confidence | always. Defaults to off.
  --max-frames <n>            Optional AGU max frame cap.
  --generate-video            Ask AGU to generate annotated video.
  --poll-interval-sec <n>     Poll interval. Defaults to 2.
  --timeout-sec <n>           Poll timeout. Defaults to 1800.
  --output <file>             Write report JSON to a file.
  --no-llm                    Disable local Ollama coaching summary.
  --ollama-host <url>         Local Ollama host. Defaults to http://127.0.0.1:11434.
  --ollama-model <name>       Local Ollama model. Defaults to qwen3-vl:4b.
"#
    .to_string()
}

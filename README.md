# AGU Agent

`agu-agent` has been reset to a minimal Rust agent. It no longer contains the old React app, chatbot, Supabase integration, SQL agent, or grouping UI.

The new responsibility is narrow:

```text
video path -> AGU CLI task -> AGU status JSON -> player ability report
```

## Requirements

- Rust toolchain with `cargo`
- AGU checked out locally
- Ollama running locally with `qwen3-vl:4b`
- AGU service running before `analyze`

Install Rust on macOS:

```bash
brew install rust
cargo --version
rustc --version
```

There is no Python virtual environment for this Rust agent. AGU remains a Python service, so use AGU's own virtual environment when starting AGU.

Check the local model service:

```bash
ollama list
curl -sS http://127.0.0.1:11434/api/tags
```

Start AGU separately:

```bash
cd /Users/ppt/projects/agu
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Analyze Video

```bash
cargo run -- analyze \
  --video examples/lebron_shoots.mp4 \
  --agu-root /Users/ppt/projects/agu \
  --api-url http://127.0.0.1:8765 \
  --vlm-mode off \
  --max-frames 120
```

The command prints an ability report JSON to stdout. Use `--output <file>` to write the report to disk.

## Summarize Existing AGU Status

```bash
cargo run -- summarize --status-json examples/agu-status-completed.json
```

This mode is useful for local rule development because it does not call AGU.

By default, `summarize` and `analyze` ask local Ollama to add a short Chinese coaching summary to the deterministic ability report. Disable it with `--no-llm`.

## Local Service

Start the Rust agent service:

```bash
cargo run -- serve --host 127.0.0.1 --port 8787
```

Health check:

```bash
curl -sS http://127.0.0.1:8787/health
```

E2E summarize smoke using the sample AGU status:

```bash
curl -sS -X POST http://127.0.0.1:8787/summarize \
  -H "Content-Type: application/json" \
  --data-binary @examples/agu-status-completed.json
```

Analyze through the service when AGU is already running:

```bash
curl -sS -X POST http://127.0.0.1:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"video":"examples/lebron_shoots.mp4","vlm_mode":"off","max_frames":120}'
```

## Configuration

Environment variables:

```text
AGU_AGENT_AGU_ROOT=/Users/ppt/projects/agu
AGU_AGENT_PYTHON_BIN=python
AGU_AGENT_AGU_API_URL=http://127.0.0.1:8765
AGU_AGENT_HOST=127.0.0.1
AGU_AGENT_PORT=8787
AGU_AGENT_LLM_ENABLED=true
AGU_AGENT_OLLAMA_HOST=http://127.0.0.1:11434
AGU_AGENT_OLLAMA_MODEL=qwen3-vl:4b
AGU_AGENT_OLLAMA_TIMEOUT_SEC=180
```

## Output

The report includes:

- AGU `task_id`
- total players and clips
- per-player action counts
- proxy statistics from AGU when available
- shooting, playmaking, defense, ball handling, activity, reliability, and overall scores
- optional local Ollama coaching summary
- explainable reasons and warnings

Scores are deterministic action proxies. They are useful for ranking and coaching review, but they are not official box-score truth.

## Project Shape

```text
src/
  ability.rs   ability scoring and report generation
  agu_cli.rs   AGU CLI process adapter
  config.rs    argument parsing and defaults
  ollama.rs    local Ollama HTTP client
  server.rs    minimal local HTTP service
  main.rs      command entrypoint
  models.rs    AGU and report data structures
docs/
  minimum-rust-agent-plan.md
```

# Repository Guidelines

## Project Scope

`agu-agent` is now a minimal Rust agent for deriving basketball player ability summaries from AGU analysis results.

The repository does not own basketball video inference, player tracking, model training, front-end UI, Supabase/Vercel APIs, chatbot behavior, or team grouping algorithms. Those legacy responsibilities were removed from the active code path.

## Runtime Boundary

- AGU remains the video analysis engine.
- This agent invokes the AGU CLI (`python -m app.cli`) and polls the AGU task status.
- This agent transforms AGU records and long-video player summaries into ability scores and an explainable JSON report.
- Local LLM summaries use Ollama on `http://127.0.0.1:11434` by default.
- Persistent product APIs, auth, dashboards, and BFF routing belong outside this repository.

## Build and Test

```bash
cargo build
cargo test
```

Run an analysis with a local AGU service already running:

```bash
cargo run -- analyze --video /path/to/video.mp4 --agu-root /Users/ppt/projects/agu
```

Summarize a saved AGU status JSON without calling AGU:

```bash
cargo run -- summarize --status-json examples/agu-status-completed.json
```

Start the local HTTP service:

```bash
cargo run -- serve --host 127.0.0.1 --port 8787
```

## Configuration

Configuration is passed through CLI flags and may be mirrored by environment variables:

- `AGU_AGENT_AGU_ROOT`
- `AGU_AGENT_PYTHON_BIN`
- `AGU_AGENT_AGU_API_URL`
- `AGU_AGENT_POLL_INTERVAL_SEC`
- `AGU_AGENT_TIMEOUT_SEC`
- `AGU_AGENT_OLLAMA_HOST`
- `AGU_AGENT_OLLAMA_MODEL`
- `AGU_AGENT_OLLAMA_TIMEOUT_SEC`

Do not hardcode production URLs, secrets, tokens, tenant identifiers, database strings, model names, ports, service hosts, or environment-specific paths in source code.

Configuration values must be read from the matching environment layer:

- Local development: `.env` or shell environment.
- Documented defaults and onboarding: `.env.example`.
- CI/staging/production: platform environment variables.

When adding or renaming a configuration variable, update `.env.example` in the same change. Code may provide safe local fallbacks only for developer convenience, but those fallbacks must not represent production infrastructure or private environment assumptions.

## Coding Style

Use stable Rust, small modules, explicit data models, and deterministic scoring. Keep AGU schema handling tolerant of missing fields so this agent can consume partial smoke outputs during development.

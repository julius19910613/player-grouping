# Minimum Rust Agent Plan

## Goal

Turn `agu-agent` into a Rust agent that derives player ability summaries from AGU outputs.

## In Scope

- Invoke AGU through `python -m app.cli`.
- Submit one video analysis task.
- Poll until AGU returns `completed` or `failed`.
- Convert AGU `result.long_video.players` or `result.records` into deterministic player ability scores.
- Emit a JSON report that can be consumed by later BFF or database workers.

## Out of Scope

- Front-end UI.
- Team grouping algorithms.
- Chatbot and SQL agent behavior.
- Supabase/Vercel serverless APIs.
- Video inference, model training, tracker ownership, or AGU schema changes.
- Production auth, rate limits, tenant routing, and dashboards.

## Minimal Architecture

```text
main.rs
  parses command
  calls agu_cli or summarize mode
  prints/writes report

agu_cli.rs
  shells out to AGU CLI
  submits analysis
  polls task status
  returns typed AGU status

models.rs
  tolerant serde models for AGU status/result JSON
  report structs

ability.rs
  groups records when long_video player summary is absent
  computes action proxy scores
  attaches reasons and warnings
```

## Acceptance

- `cargo run -- summarize --status-json <file>` produces a player ability report from a saved AGU status JSON.
- `cargo run -- analyze --video <file> --agu-root <agu>` submits and polls AGU when the AGU service is already running.
- Missing or failed AGU result returns a clear error.
- The active repository no longer contains legacy React, Vercel, Supabase, chatbot, SQL agent, or grouping UI code.


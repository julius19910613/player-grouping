mod ability;
mod agu_cli;
mod config;
mod models;
mod ollama;
mod server;

use crate::config::Command;
use std::fs;
use std::path::Path;

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    match config::parse_args()? {
        Command::Analyze(config) => {
            let status = agu_cli::run_analysis(&config)?;
            let mut report = ability::build_report(status)?;
            server::enrich_report_with_llm(&mut report, &config.llm);
            write_report(&report, config.output.as_deref())
        }
        Command::Summarize(config) => {
            let status = server::read_status_file(&config.status_json)?;
            let mut report = ability::build_report(status)?;
            server::enrich_report_with_llm(&mut report, &config.llm);
            write_report(&report, config.output.as_deref())
        }
        Command::Serve(config) => server::serve(config),
    }
}

fn write_report(report: &models::AbilityReport, output: Option<&Path>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(report)
        .map_err(|error| format!("failed to encode report: {error}"))?;

    if let Some(path) = output {
        fs::write(path, json)
            .map_err(|error| format!("failed to write {}: {error}", path.display()))?;
    } else {
        println!("{json}");
    }

    Ok(())
}

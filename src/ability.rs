use crate::models::{
    AbilityReport, AbilityScores, AbilityTotals, AguLongVideoPlayer, AguPlayerStatistics,
    AguRecord, AguResult, AguTaskStatus, CoachingSummary, PlayerAbility,
};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn build_report(status: AguTaskStatus) -> Result<AbilityReport, String> {
    if status.status != "completed" {
        return Err(format!("AGU task is not completed: {}", status.status));
    }

    let result = status
        .result
        .ok_or_else(|| "AGU status is completed but result is missing".to_string())?;
    let players = players_from_result(&result);
    let warnings = warnings_for_result(&result, &players);

    Ok(AbilityReport {
        source: "agu_cli".to_string(),
        task_id: status.task_id,
        status: status.status,
        generated_at_unix: now_unix(),
        totals: AbilityTotals {
            player_count: players.len(),
            clip_count: result.summary.clip_count,
            needs_review_count: result.summary.needs_review_count,
            action_counts: result.summary.action_counts,
        },
        players,
        coaching_summary: None,
        warnings,
    })
}

pub fn attach_coaching_summary(report: &mut AbilityReport, model: String, text: String) {
    report.coaching_summary = Some(CoachingSummary {
        provider: "ollama".to_string(),
        model,
        language: "zh-CN".to_string(),
        text,
    });
}

fn players_from_result(result: &AguResult) -> Vec<PlayerAbility> {
    if let Some(long_video) = &result.long_video {
        if !long_video.players.is_empty() {
            let mut players = long_video
                .players
                .iter()
                .map(player_from_long_video)
                .collect::<Vec<_>>();
            players.sort_by(|a, b| b.scores.overall.cmp(&a.scores.overall));
            return players;
        }
    }

    let mut grouped: BTreeMap<String, Vec<&AguRecord>> = BTreeMap::new();
    for record in &result.records {
        grouped
            .entry(format!("player_{}", record.player))
            .or_default()
            .push(record);
    }

    let mut players = grouped
        .into_iter()
        .map(|(player_id, records)| player_from_records(player_id, records))
        .collect::<Vec<_>>();
    players.sort_by(|a, b| b.scores.overall.cmp(&a.scores.overall));
    players
}

fn player_from_long_video(player: &AguLongVideoPlayer) -> PlayerAbility {
    let clip_count = player.clip_count;
    let needs_review_ratio = ratio(player.needs_review_count, clip_count);
    let confidence = player.average_confidence;
    let scores = score_player(
        &player.action_counts,
        clip_count,
        needs_review_ratio,
        confidence,
        &player.statistics,
    );

    PlayerAbility {
        player_id: player.player_id.clone(),
        clip_count,
        segments_seen: player.segments_seen,
        action_counts: player.action_counts.clone(),
        statistics: player.statistics.clone(),
        scores,
        confidence,
        needs_review_ratio,
        reasons: reasons(
            &player.action_counts,
            &player.statistics,
            needs_review_ratio,
        ),
    }
}

fn player_from_records(player_id: String, records: Vec<&AguRecord>) -> PlayerAbility {
    let mut action_counts = BTreeMap::new();
    let mut confidence_sum = 0.0;
    let mut needs_review_count = 0;

    for record in &records {
        let action = if record.final_decision.action.is_empty() {
            "unknown"
        } else {
            record.final_decision.action.as_str()
        };
        *action_counts.entry(action.to_string()).or_insert(0) += 1;
        confidence_sum += record.final_decision.confidence;
        needs_review_count += u32::from(record.final_decision.needs_review);
    }

    let clip_count = records.len() as u32;
    let confidence = if clip_count == 0 {
        0.0
    } else {
        confidence_sum / clip_count as f64
    };
    let needs_review_ratio = ratio(needs_review_count, clip_count);
    let statistics = proxy_statistics(&action_counts);
    let scores = score_player(
        &action_counts,
        clip_count,
        needs_review_ratio,
        confidence,
        &statistics,
    );

    PlayerAbility {
        player_id,
        clip_count,
        segments_seen: 1,
        action_counts: action_counts.clone(),
        statistics,
        scores,
        confidence,
        needs_review_ratio,
        reasons: reasons(
            &action_counts,
            &proxy_statistics(&action_counts),
            needs_review_ratio,
        ),
    }
}

fn score_player(
    actions: &BTreeMap<String, u32>,
    clip_count: u32,
    needs_review_ratio: f64,
    confidence: f64,
    statistics: &AguPlayerStatistics,
) -> AbilityScores {
    let shooting = action_score(actions, clip_count, &["shoot"], 1.2)
        .saturating_add((statistics.points.min(30) as f64 * 1.5) as u8)
        .min(100);
    let playmaking = action_score(actions, clip_count, &["pass"], 1.4)
        .saturating_add((statistics.assists.min(20) as f64 * 2.0) as u8)
        .min(100);
    let defense = action_score(actions, clip_count, &["defense", "block"], 1.3)
        .saturating_add((statistics.blocks.min(20) as f64 * 2.0) as u8)
        .min(100);
    let ball_handling = action_score(actions, clip_count, &["dribble", "ball in hand"], 1.3);
    let activity = action_score(actions, clip_count, &["run", "walk", "pick"], 1.1);
    let reliability = clamp_score((confidence * 100.0) - (needs_review_ratio * 35.0));
    let overall = clamp_score(
        shooting as f64 * 0.22
            + playmaking as f64 * 0.18
            + defense as f64 * 0.18
            + ball_handling as f64 * 0.14
            + activity as f64 * 0.10
            + reliability as f64 * 0.18,
    );

    AbilityScores {
        shooting,
        playmaking,
        defense,
        ball_handling,
        activity,
        reliability,
        overall,
    }
}

fn action_score(
    actions: &BTreeMap<String, u32>,
    clip_count: u32,
    keys: &[&str],
    weight: f64,
) -> u8 {
    if clip_count == 0 {
        return 0;
    }

    let count = keys
        .iter()
        .map(|key| actions.get(*key).copied().unwrap_or_default())
        .sum::<u32>();
    clamp_score((count as f64 / clip_count as f64) * 100.0 * weight)
}

fn proxy_statistics(actions: &BTreeMap<String, u32>) -> AguPlayerStatistics {
    AguPlayerStatistics {
        points: actions.get("shoot").copied().unwrap_or_default() * 2,
        assists: actions.get("pass").copied().unwrap_or_default(),
        rebounds: 0,
        blocks: actions.get("block").copied().unwrap_or_default(),
        steals: 0,
        confidence: 0.45,
        method: "agent_action_proxy_v1".to_string(),
        notes: vec![
            "Derived from AGU clip-level action counts; not official box-score truth.".to_string(),
        ],
    }
}

fn reasons(
    actions: &BTreeMap<String, u32>,
    statistics: &AguPlayerStatistics,
    needs_review_ratio: f64,
) -> Vec<String> {
    let mut reasons = Vec::new();

    if let Some((action, count)) = actions.iter().max_by_key(|(_, count)| *count) {
        reasons.push(format!(
            "Most frequent AGU action is '{action}' across {count} clips."
        ));
    }
    if statistics.points > 0 {
        reasons.push(format!(
            "Shooting proxy estimated {} points.",
            statistics.points
        ));
    }
    if statistics.assists > 0 {
        reasons.push(format!(
            "Playmaking proxy estimated {} assists.",
            statistics.assists
        ));
    }
    if statistics.blocks > 0 {
        reasons.push(format!(
            "Defense proxy estimated {} blocks.",
            statistics.blocks
        ));
    }
    if needs_review_ratio > 0.25 {
        reasons.push(format!(
            "{:.0}% of clips need review, so reliability is discounted.",
            needs_review_ratio * 100.0
        ));
    }

    if reasons.is_empty() {
        reasons.push("No strong action signal was available from AGU.".to_string());
    }

    reasons
}

fn warnings_for_result(result: &AguResult, players: &[PlayerAbility]) -> Vec<String> {
    let mut warnings = Vec::new();

    if result.long_video.is_none() {
        warnings.push(
            "AGU long_video summary is missing; grouped clip records by local player id."
                .to_string(),
        );
    }
    if players.is_empty() {
        warnings.push("No players were found in AGU output.".to_string());
    }
    if result.summary.needs_review_count > 0 {
        warnings.push(format!(
            "{} clips need review according to AGU.",
            result.summary.needs_review_count
        ));
    }

    warnings
}

fn ratio(numerator: u32, denominator: u32) -> f64 {
    if denominator == 0 {
        0.0
    } else {
        numerator as f64 / denominator as f64
    }
}

fn clamp_score(value: f64) -> u8 {
    value.round().clamp(0.0, 100.0) as u8
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AguFinalDecision, AguRecord, AguResult, AguSummary, AguTaskStatus};

    #[test]
    fn builds_report_from_records_when_long_video_is_absent() {
        let status = AguTaskStatus {
            task_id: "task".to_string(),
            status: "completed".to_string(),
            progress: 100,
            error: None,
            result: Some(AguResult {
                records: vec![
                    record(0, "shoot", 0.8, false),
                    record(0, "pass", 0.7, false),
                    record(1, "defense", 0.5, true),
                ],
                summary: AguSummary {
                    clip_count: 3,
                    action_counts: BTreeMap::new(),
                    needs_review_count: 1,
                    source_counts: BTreeMap::new(),
                },
                long_video: None,
            }),
        };

        let report = build_report(status).expect("report");

        assert_eq!(report.players.len(), 2);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.contains("long_video")));
        assert_eq!(report.totals.clip_count, 3);
    }

    fn record(player: i32, action: &str, confidence: f64, needs_review: bool) -> AguRecord {
        AguRecord {
            player,
            final_decision: AguFinalDecision {
                action: action.to_string(),
                confidence,
                needs_review,
            },
        }
    }
}

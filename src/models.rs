use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Deserialize)]
pub struct AguSubmitResponse {
    pub task_id: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct AguTaskStatus {
    pub task_id: String,
    pub status: String,
    #[serde(default)]
    pub progress: u8,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub result: Option<AguResult>,
}

#[derive(Debug, Deserialize)]
pub struct AguResult {
    #[serde(default)]
    pub records: Vec<AguRecord>,
    #[serde(default)]
    pub summary: AguSummary,
    #[serde(default)]
    pub long_video: Option<AguLongVideo>,
}

#[derive(Debug, Default, Deserialize)]
pub struct AguSummary {
    #[serde(default)]
    pub clip_count: u32,
    #[serde(default)]
    pub action_counts: BTreeMap<String, u32>,
    #[serde(default)]
    pub needs_review_count: u32,
    #[serde(default)]
    pub source_counts: BTreeMap<String, u32>,
}

#[derive(Debug, Deserialize)]
pub struct AguRecord {
    pub player: i32,
    #[serde(rename = "final")]
    pub final_decision: AguFinalDecision,
}

#[derive(Debug, Deserialize)]
pub struct AguFinalDecision {
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub confidence: f64,
    #[serde(default)]
    pub needs_review: bool,
}

#[derive(Debug, Deserialize)]
pub struct AguLongVideo {
    #[serde(default)]
    pub players: Vec<AguLongVideoPlayer>,
}

#[derive(Debug, Deserialize)]
pub struct AguLongVideoPlayer {
    pub player_id: String,
    #[serde(default)]
    pub segments_seen: u32,
    #[serde(default)]
    pub clip_count: u32,
    #[serde(default)]
    pub action_counts: BTreeMap<String, u32>,
    #[serde(default)]
    pub needs_review_count: u32,
    #[serde(default)]
    pub average_confidence: f64,
    #[serde(default)]
    pub statistics: AguPlayerStatistics,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct AguPlayerStatistics {
    #[serde(default)]
    pub points: u32,
    #[serde(default)]
    pub assists: u32,
    #[serde(default)]
    pub rebounds: u32,
    #[serde(default)]
    pub blocks: u32,
    #[serde(default)]
    pub steals: u32,
    #[serde(default)]
    pub confidence: f64,
    #[serde(default)]
    pub method: String,
    #[serde(default)]
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct AbilityReport {
    pub source: String,
    pub task_id: String,
    pub status: String,
    pub generated_at_unix: u64,
    pub totals: AbilityTotals,
    pub players: Vec<PlayerAbility>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coaching_summary: Option<CoachingSummary>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CoachingSummary {
    pub provider: String,
    pub model: String,
    pub language: String,
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct AbilityTotals {
    pub player_count: usize,
    pub clip_count: u32,
    pub needs_review_count: u32,
    pub action_counts: BTreeMap<String, u32>,
}

#[derive(Debug, Serialize)]
pub struct PlayerAbility {
    pub player_id: String,
    pub clip_count: u32,
    pub segments_seen: u32,
    pub action_counts: BTreeMap<String, u32>,
    pub statistics: AguPlayerStatistics,
    pub scores: AbilityScores,
    pub confidence: f64,
    pub needs_review_ratio: f64,
    pub reasons: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct AbilityScores {
    pub shooting: u8,
    pub playmaking: u8,
    pub defense: u8,
    pub ball_handling: u8,
    pub activity: u8,
    pub reliability: u8,
    pub overall: u8,
}

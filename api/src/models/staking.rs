#![allow(non_snake_case)]
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidatorStatus {
    pub activeEra: u64,
    pub currentEra: u64,
    pub activeValidatorCount: u32,
    pub waitingValidatorCount: u32,
    pub nominatorCount: u32,
    pub minimumStake: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValaidatorFeature {
    pub stashAddress: String,
    pub name: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Validator {
    pub blockHeight: u64,
    pub activeEras: u32,
    pub rank: u16,
    pub active: bool,
    pub stashAddress: String,
    pub controllerAddress: String,
    pub name: String,
    pub totalStake: f32,
    pub otherStake: f32,
    pub stakeHistory: String,
    pub nominators: u8,
    pub nominatorsRating: u8,
    pub nominations: Vec<Nomination>,
    pub clusterName: String,
    pub clusterMembers: u8,
    pub partOfCluster: bool,
    pub show_clusterMember: bool,
    pub identity: String,
    pub hasSubIdentity: bool,
    pub verifiedIdentity: bool,
    pub identityRating: u8,
    pub addressCreationCating: u8,
    pub activeInGovernance: bool,
    pub councilBacking: bool,
    pub governanceRating: u8,
    pub dominated: bool,
    pub commission: f32,
    pub commissionRating: u8,
    pub commissionHistory: String,
    pub activeRating: u8,
    pub eraPointsPercent: f32,
    pub eraPointsRating: u8,
    pub eraPointsHistory: String,
    pub payoutRating: u8,
    pub payoutHistory: String,
    pub performance: f32, // performance from each era
    pub performanceHistory: String,
    pub relativePerformance: f32,
    pub relativePerformanceHistory: f32,
    pub slash_rating: u8,
    pub slashed: bool,
    pub slashes: String,
    pub totalRating: u8,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Nomination {
    pub staking: String,
    #[serde(deserialize_with = "parse_amount")]
    pub amount: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidatorPage {
    pub total_valalidaors: u64,
    pub validators: Vec<Validator>,
}

fn parse_amount<'de, D>(d: D) -> Result<f32, D::Error>
where
    D: Deserializer<'de>,
{
    Deserialize::deserialize(d).map(|x: Option<_>| x.unwrap_or(0 as f32))
}

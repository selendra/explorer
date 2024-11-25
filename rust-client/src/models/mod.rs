pub mod account;
pub mod block;
pub mod contract;
pub mod event;
pub mod extrinsic;
pub mod gas;
pub mod identity;
pub mod staking;

use sp_core::ConstU32;
use substrate_api_client::ac_primitives::{Config, DefaultRuntimeConfig};

pub type Balance = <DefaultRuntimeConfig as Config>::Balance;
pub type MaxJudgements = ConstU32<20>;
pub type MaxAdditionalFields = ConstU32<100>;

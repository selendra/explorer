use substrate_api_client::ac_primitives::{Config, DefaultRuntimeConfig};

pub mod block;
pub mod event;
pub mod extrinsic;

pub type Balance = <DefaultRuntimeConfig as Config>::Balance;

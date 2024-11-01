use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

use substrate_api_client::{
	ac_primitives::DefaultRuntimeConfig, rpc::JsonrpseeClient, Api, GetChainInfo,
};
#[derive(Debug, Serialize, Deserialize)]
pub struct BlockDetail {
	block_number: u128,
	block_hash: String,
	parent_hash: String,
	extrinsics_root: String,
	state_root: String,
}

pub struct SubstrateClient {
	ws_url: String,
	api: Option<Api<DefaultRuntimeConfig, JsonrpseeClient>>,
}

impl SubstrateClient {
	pub fn new(ws_url: &str) -> Self {
		Self { ws_url: ws_url.to_string(), api: None }
	}

	pub async fn connect(&mut self) -> Result<()> {
		let client = JsonrpseeClient::new(&self.ws_url)
			.map_err(|e| anyhow!("Failed to connect to WebSocket: {:?}", e))?;

		self.api = Some(
			Api::<DefaultRuntimeConfig, _>::new(client)
				.await
				.map_err(|e| anyhow!("Failed to create API: {:?}", e))?,
		);

		Ok(())
	}

	pub async fn get_block(&self) -> Result<()> {
		let api = self.api.as_ref().context("API client not initialized")?;

		let block_hash = api
			.get_block_hash(Some(1))
			.await
			.map_err(|e| anyhow!("Fetching blockHash Error{:?}", e))?;

		let block = api
			.get_block(block_hash)
			.await
			.map_err(|e| anyhow!("Fetching Block Error{:?}", e))?;

		if let Some(block) = block {
			let block_data = BlockDetail {
				block_number: block.header.number as u128,
				block_hash: block.header.hash().to_string(),
				parent_hash: block.header.parent_hash.to_string(),
				extrinsics_root: block.header.extrinsics_root.to_string(),
				state_root: block.header.state_root.to_string()
			};

			println!("{:?}", block_data);
		} else {
			println!("None");
		}
		Ok(())
	}
}

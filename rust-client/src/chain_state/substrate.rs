use anyhow::{Context, Result};

use substrate_api_client::{
	ac_primitives::DefaultRuntimeConfig, rpc::JsonrpseeClient, Api, GetChainInfo,
};

// struct BlockDetail {
//     block_number: u128,
//     block_hash: String,
// }

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
			.map_err(|e| anyhow::anyhow!("Failed to connect to WebSocket: {:?}", e))?;

		self.api = Some(
			Api::<DefaultRuntimeConfig, _>::new(client)
				.await
				.map_err(|e| anyhow::anyhow!("Failed to create API: {:?}", e))?,
		);

		Ok(())
	}

	pub async fn get_block(&self) -> Result<()> {
		let api = self.api.as_ref().context("API client not initialized")?;

		let block_hash = api.get_block_hash(Some(1)).await.unwrap();

		let block = api.get_block(block_hash).await.unwrap();

		println!("{:?}", block);
		Ok(())
	}
}

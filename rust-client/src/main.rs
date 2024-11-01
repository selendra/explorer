pub mod chain_state;

use chain_state::substrate::SubstrateClient;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
	let mut substrate_client = SubstrateClient::new("wss://rpc.selendra.org:443");

	substrate_client.connect().await?;

	substrate_client.get_block().await?;

	Ok(())
}

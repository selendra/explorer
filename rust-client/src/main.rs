pub mod chain_state;

use chain_state::substrate::SubstrateClient;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
	let mut substrate_client = SubstrateClient::new("wss://rpc.selendra.org:443");

	substrate_client.connect().await?;

	let block = substrate_client.get_block(7687398).await?.unwrap();
	// let extrinsic = block.extrinsics.extrinsic;
	// let _result = substrate_client.process_extrinsic(extrinsic.byte).await?;

	println!("{:?}", block);

	Ok(())
}

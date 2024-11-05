pub mod chain_state;
pub mod models;

use chain_state::substrate::SubstrateClient;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
	let mut substrate_client = SubstrateClient::new("wss://rpc.selendra.org:443");

	substrate_client.connect().await?;
	// substrate_client.get_event(8018912).await.unwrap();

	// let block = substrate_client.get_block(8018912).await?.unwrap();
	// let extrinsics = block.extrinsics.extrinsic;
	// for extrinsic in extrinsics {
	// 	substrate_client.process_extrinsic(extrinsic.byte).unwrap();
	// }
	Ok(())
}

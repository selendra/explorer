use anyhow::Result;
use selendra_rust_client::SubstrateClient;

#[tokio::main]
async fn main() -> Result<()> {
	let mut substrate_client = SubstrateClient::new("wss://rpc.selendra.org:443");

	substrate_client.connect().await?;
	// let block = substrate_client.get_all_accounts().await.unwrap();

	// let block = substrate_client
	// 	.get_account_identity("5DM7PJEFPbcYViEzFXu5GjF96JgoSJ3rb6jfXLsmXqrPVG2o")
	// 	.await
	// 	.unwrap();

	let block = substrate_client.get_block(8018912).await?.unwrap();
	// let extrinsics = block.extrinsics.extrinsic;
	// for extrinsic in extrinsics {
	// 	substrate_client.process_extrinsic(extrinsic.byte).unwrap();
	// }
	println!("{:?}", block);
	Ok(())
}

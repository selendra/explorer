use anyhow::Result;
use ethers::types::transaction;
// use selendra_rust_client::SubstrateClient;
use selendra_rust_client::{EvmClient, SubstrateClient};

#[tokio::main]
async fn main() -> Result<()> {
	// let substrate_client = SubstrateClient::new("wss://rpc.selendra.org:443").await.unwrap();

	// substrate_client.connect().await?;
	// let block = substrate_client.get_all_accounts().await.unwrap();

	// let block = substrate_client
	// 	.get_account_identity("5DM7PJEFPbcYViEzFXu5GjF96JgoSJ3rb6jfXLsmXqrPVG2o")
	// 	.await
	// 	.unwrap();

	// let block = substrate_client.get_block(8018912).await?.unwrap();
	// let extrinsics = block.extrinsics.extrinsic;
	// for extrinsic in extrinsics {
	// 	substrate_client.process_extrinsic(extrinsic.byte).unwrap();
	// }
	// println!("{:?}", block);

	let evm_client = EvmClient::new("https://rpc.selendra.org").unwrap();

	let block = evm_client.get_block(8_255_966).await.unwrap();

	let transactions = block.clone().unwrap().transactions;

	for transaction in transactions {
		let address = transaction.to;
		let contract_type = evm_client.get_contract_types(&address).await;

		println!("{:#?}", block);
		println!("{:#?}", contract_type);
	}

	// let contract_type= evm_client.get_contract_types()
	// 8_255_966  //8_192_172

	Ok(())
}

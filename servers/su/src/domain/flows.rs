use std::env;
use std::sync::Arc;

use dotenv::dotenv;
use std::time::{SystemTime, UNIX_EPOCH, SystemTimeError};
use serde_json::json;
use arweave_rs::network::NetworkInfoClient;
use reqwest::{Url};

use crate::domain::clients::uploader::UploaderClient;
use crate::domain::clients::store::StoreClient;
use crate::domain::clients::gateway::ArweaveGateway;
use crate::domain::clients::wallet::FileWallet;
use crate::domain::clients::signer::ArweaveSigner;
use crate::domain::core::json::{Message, Process, SortedMessages};
use crate::domain::core::builder::{Builder, BuildResult};
use crate::domain::core::dal::{Gateway, Wallet, Signer, Log};

pub struct Deps {
    pub data_store: Arc<StoreClient>,
    pub logger: Arc<dyn Log>
}

/*
flows.rs ties together core modules and client 
modules to produce the desired end result
*/

async fn build(deps: &Arc<Deps>, input: Vec<u8>) -> Result<BuildResult, String> {
    dotenv().ok();
    let gateway: Arc<dyn Gateway> = Arc::new(ArweaveGateway);
    let wallet: Arc<dyn Wallet> = Arc::new(FileWallet);
    let wallet_path = env::var("SU_WALLET_PATH").expect("SU_WALLET_PATH must be set");
    let arweave_signer = ArweaveSigner::new(&wallet_path)?;
    let signer: Arc<dyn Signer> = Arc::new(arweave_signer);
    let builder = Builder::new(gateway, wallet, signer, &deps.logger)?;
    let build_result = builder.build(input).await?;
    Ok(build_result)
}

async fn upload(deps: &Arc<Deps>, build_result: Vec<u8>) -> Result<String, String> {
    let uploader = UploaderClient::new("https://node2.irys.xyz", &deps.logger)?;
    let uploaded_tx = uploader.upload(build_result).await?;
    let result = match serde_json::to_string(&uploaded_tx) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}

pub async fn write_message(deps: Arc<Deps>, input: Vec<u8>,) -> Result<String, String> {
    let build_result = build(&deps, input).await?;
    let r = upload(&deps, build_result.binary.to_vec()).await?;
    let message = Message::from_bundle(&build_result.bundle)?;
    deps.data_store.save_message(&message)?;
    deps.logger.log(format!("saved message - {:?}", &message));
    Ok(r)
}

pub async fn write_process(deps: Arc<Deps>, input: Vec<u8>) -> Result<String, String> {
    let build_result = build(&deps, input).await?;
    let r = upload(&deps, build_result.binary.to_vec()).await?;
    let process = Process::from_bundle(&build_result.bundle)?;
    deps.data_store.save_process(&process)?;
    deps.logger.log(format!("saved process - {:?}", &process));
    Ok(r)
}

pub async fn read_messages(
    deps: Arc<Deps>,
    process_id: String, 
    from: Option<String>, 
    to: Option<String>
) -> Result<String, String> {
    let messages = deps.data_store.get_messages(&process_id)?;
    let sorted_messages = SortedMessages::from_messages(messages, from, to)?;
    let result = match serde_json::to_string(&sorted_messages) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}

pub async fn read_message(
    deps: Arc<Deps>,
    message_id: String
) -> Result<String, String> {
    let message = deps.data_store.get_message(&message_id)?;
    let result = match serde_json::to_string(&message) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}

pub async fn read_process(
    deps: Arc<Deps>,
    process_id: String
) -> Result<String, String> {
    let process = deps.data_store.get_process(&process_id)?;
    let result = match serde_json::to_string(&process) {
        Ok(r) => r,
        Err(e) => return Err(format!("{:?}", e))
    };
    Ok(result)
}


fn system_time() -> Result<String, SystemTimeError> {
    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();
    Ok(millis_string)
}

pub async fn timestamp() -> Result<String, String>{
    match system_time() {
        Ok(timestamp) => {
            let gateway_url = "https://arweave.net".to_string();
            let url = match Url::parse(&gateway_url) {
                Ok(u) => u,
                Err(e) => return Err(format!("url error {:?}", e))
            };

            let network_client = NetworkInfoClient::new(url);
            let network_info = network_client.network_info().await;
            match network_info {
                Ok(info) => {
                    let height = info.height.clone();
                    let height_string = format!("{:0>12}", height);
                    let response_json = json!({ "timestamp": timestamp, "block_height": height_string });
                    Ok(response_json.to_string())
                },
                Err(e) => {
                    Err(format!("{:?}", e))
                }
            }
            
        }
        Err(e) => Err(format!("{:?}", e))
    }
}
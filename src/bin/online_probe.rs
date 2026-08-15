use hbb_common::{protobuf::Message as _, rendezvous_proto::*, tcp::FramedStream, tokio};
use std::time::Duration;

const HOST: &str = "47.114.75.115";

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let ids: Vec<String> = if args.is_empty() {
        vec!["423156".to_owned(), "980966".to_owned(), "423727".to_owned()]
    } else {
        args
    };
    let mut s = FramedStream::new(format!("{}:21115", HOST), None, 5000).await.unwrap();
    let mut msg = RendezvousMessage::new();
    msg.set_online_request(OnlineRequest {
        id: "probe".to_owned(),
        peers: ids.clone(),
        ..Default::default()
    });
    s.send(&msg).await.unwrap();
    if let Ok(Some(Ok(bytes))) = tokio::time::timeout(Duration::from_secs(5), s.next()).await {
        if let Ok(m) = RendezvousMessage::parse_from_bytes(&bytes) {
            if let Some(rendezvous_message::Union::OnlineResponse(or)) = m.union {
                for (i, id) in ids.iter().enumerate() {
                    let bit = 0x01 << (7 - i % 8);
                    let on = (or.states[i / 8] & bit) == bit;
                    println!("{} -> {}", id, if on { "ONLINE" } else { "OFFLINE" });
                }
            }
        }
    }
}

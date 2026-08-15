use hbb_common::{
    bytes::Bytes,
    config,
    protobuf::Message as _,
    rendezvous_proto::*,
    sodiumoxide::crypto::{box_, secretbox, sign},
    tcp::FramedStream,
    tokio, AddrMangle,
};
use std::time::Duration;

const HOST: &str = "47.114.75.115";
const A_ID: &str = "423156";
const PROBE_ID: &str = "probe_flow01";
// A's sign public key from server DB (hex)
const A_SIGN_PK_HEX: &str = "3b0368edd049f058133e3d22faa66546bb90095160766951139874ca94895127";

fn hex2bytes(s: &str) -> Vec<u8> {
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap()).collect()
}

fn get_pk_from(bytes: &[u8]) -> Option<[u8; 32]> {
    if bytes.len() == sign::PUBLICKEYBYTES {
        let mut k = [0u8; 32];
        k.copy_from_slice(bytes);
        Some(k)
    } else {
        None
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let a_sign_pk = sign::PublicKey(get_pk_from(&hex2bytes(A_SIGN_PK_HEX)).unwrap());

    // 1) Punch via TCP to hbbs
    let mut rz = match FramedStream::new(format!("{}:21116", HOST), None, 5000).await {
        Ok(s) => s,
        Err(e) => { println!("HBBS connect failed: {}", e); return; }
    };
    let mut msg = RendezvousMessage::new();
    msg.set_punch_hole_request(PunchHoleRequest {
        id: A_ID.to_owned(),
        nat_type: rendezvous_proto::NatType::SYMMETRIC.into(),
        conn_type: rendezvous_proto::ConnType::CHAT.into(),
        version: "3.1.1".to_owned(),
        force_relay: true,
        ..Default::default()
    });
    println!("SEND PunchHoleRequest for {}", A_ID);
    if let Err(e) = rz.send(&msg).await { println!("punch send failed: {}", e); return; }

    // 2) Read until RelayResponse
    let mut uuid = String::new();
    let mut relay_server = String::new();
    let mut got = false;
    for _ in 0..8 {
        match tokio::time::timeout(Duration::from_secs(5), rz.next()).await {
            Ok(Some(Ok(bytes))) => {
                if let Ok(m) = RendezvousMessage::parse_from_bytes(&bytes) {
                    match m.union {
                        Some(rendezvous_message::Union::RelayResponse(rr)) => {
                            uuid = rr.uuid.clone();
                            relay_server = rr.relay_server.clone();
                            println!("GOT RelayResponse: uuid={} relay_server={} refuse={} socket_addr_hex={}", rr.uuid, rr.relay_server, rr.refuse_reason, hex(&rr.socket_addr));
                            got = true;
                            break;
                        }
                        Some(rendezvous_message::Union::PunchHoleResponse(ph)) => {
                            println!("GOT PunchHoleResponse: failure={:?} socket_addr={}", ph.failure, if ph.socket_addr.is_empty() { "EMPTY".into() } else { format!("{:?}", AddrMangle::decode(&ph.socket_addr)) });
                        }
                        other => println!("GOT union: {:?}", other.as_ref().map(|_| "some")),
                    }
                } else { println!("non-protobuf frame"); }
            }
            Ok(Some(Err(e))) => { println!("read err: {}", e); break; }
            _ => { println!("timeout/no data"); break; }
        }
    }
    if !got || uuid.is_empty() || relay_server.is_empty() {
        println!("FAIL: no relay response (uuid='{}' relay='{}')", uuid, relay_server);
        return;
    }

    // 3) Connect to hbbr and RequestRelay
    let relay_addr = hbb_common::check_port(&relay_server, hbb_common::config::RELAY_PORT);
    println!("connect relay {} (uuid {})", relay_addr, uuid);
    let mut conn = match FramedStream::new(&relay_addr, None, 5000).await {
        Ok(s) => s,
        Err(e) => { println!("hbbr connect failed: {}", e); return; }
    };
    let mut req = RendezvousMessage::new();
    req.set_request_relay(RequestRelay {
        id: PROBE_ID.to_owned(),
        uuid: uuid.clone(),
        conn_type: rendezvous_proto::ConnType::CHAT.into(),
        ..Default::default()
    });
    if let Err(e) = conn.send(&req).await { println!("hbbr RequestRelay send failed: {}", e); return; }
    println!("SENT RequestRelay to hbbr");

    // 4) Secure handshake: read A's SignedId
    let mut their_box_pk = None;
    for _ in 0..8 {
        match tokio::time::timeout(Duration::from_secs(8), conn.next()).await {
            Ok(Some(Ok(bytes))) => {
                if let Ok(m) = hbb_common::protobuf::Message::parse_from_bytes::<Message>(&bytes) {
                    match m.union {
                        Some(message::Union::SignedId(si)) => {
                            println!("GOT SignedId, verifying with A sign pk");
                            match hbb_common::decode_id_pk(&si.id, &a_sign_pk) {
                                Ok((id, pk_b)) => {
                                    println!("A identity verified: id={} box_pk={}", id, hex(&pk_b.to_vec()));
                                    their_box_pk = Some(pk_b);
                                }
                                Err(e) => println!("A identity verify failed: {}", e),
                            }
                        }
                        other => println!("GOT handshake msg: {:?}", other.as_ref().map(|_| "some")),
                    }
                }
            }
            Ok(Some(Err(e))) => { println!("handshake read err: {}", e); }
            _ => { println!("handshake timeout"); }
        }
        if their_box_pk.is_some() { break; }
    }
    let their_box_pk = match their_box_pk {
        Some(v) => v,
        None => { println!("FAIL: never got A's SignedId"); return; }
    };

    // 5) Build and send PublicKey (probe = B side)
    let (asym, sym, key) = hbb_common::create_symmetric_key_msg(their_box_pk);
    let (sign_sk_raw, sign_pk_raw) = sign::gen_keypair();
    let id_pk = hbb_common::protobuf::Message::write_to_bytes(&IdPk {
        id: PROBE_ID.to_owned(),
        pk: Bytes::from(asym.to_vec()),
        ..Default::default()
    }).unwrap();
    let signed_id = sign::sign(&id_pk, &sign_sk_raw);
    let mut pubkey = PublicKey {
        asymmetric_value: asym,
        symmetric_value: sym,
        signed_id: signed_id.into(),
        identity_public_key: Vec::from(sign_pk_raw.0).into(),
        ..Default::default()
    };
    let mut out = Message::new();
    out.set_public_key(pubkey);
    println!("SEND PublicKey (box_pk={})", hex(&Vec::from(their_box_pk)));
    if let Err(e) = conn.send(&out).await { println!("PublicKey send failed: {}", e); return; }
    conn.set_key(key);
    println!("ENCRYPTION SET");

    // 6) Send a chat message
    let mut misc = Misc::new();
    misc.set_chat_message(ChatMessage { text: "PROBE_HELLO_FROM_SIMULATED_B".to_owned(), ..Default::default() });
    let mut m = Message::new();
    m.set_misc(misc);
    match conn.send(&m).await {
        Ok(()) => println!("SENT chat message"),
        Err(e) => println!("chat send failed: {}", e),
    }

    // 7) Read a few responses
    for _ in 0..6 {
        match tokio::time::timeout(Duration::from_secs(5), conn.next()).await {
            Ok(Some(Ok(bytes))) => {
                if let Ok(m) = hbb_common::protobuf::Message::parse_from_bytes::<Message>(&bytes) {
                    println!("RESP: {:?}", m.union.as_ref().map(|u| {
                        use hbb_common::protobuf::Enum;
                        format!("{:?}", u.enum_value_or_default())
                    }));
                } else { println!("RESP: non-protobuf"); }
            }
            _ => break,
        }
    }
    println!("PROBE DONE");
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect()
}

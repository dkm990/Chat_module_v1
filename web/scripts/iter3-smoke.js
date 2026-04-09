import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const [roomId, tokenSender, tokenReceiver, imageStorageKey, imagePublicUrl, imageMime, imageSize, videoStorageKey, videoPublicUrl, videoMime, videoSize, baseUrlArg] =
  process.argv.slice(2);
const baseUrl = baseUrlArg || "http://localhost:8092";

const received = [];
const receiver = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
  connectHeaders: { Authorization: `Bearer ${tokenReceiver}` },
});

receiver.onConnect = () => {
  receiver.subscribe(`/topic/rooms.${roomId}.messages.created`, (frame) => {
    received.push(JSON.parse(frame.body));
  });
};
receiver.activate();

const post = (body) =>
  fetch(`${baseUrl}/api/chat/v1/rooms/${roomId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenSender}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

setTimeout(async () => {
  await post({ type: "TEXT", text: "iter3 text" });
  await post({
    type: "IMAGE",
    attachments: [{ kind: "IMAGE", storageKey: imageStorageKey, publicUrl: imagePublicUrl, mimeType: imageMime, sizeBytes: Number(imageSize), width: 1, height: 1 }],
  });
  await post({
    type: "VIDEO",
    attachments: [{ kind: "VIDEO", storageKey: videoStorageKey, publicUrl: videoPublicUrl, mimeType: videoMime, sizeBytes: Number(videoSize), durationSec: null }],
  });
  await post({ type: "LOCATION", location: { lat: 55.751, lng: 37.618, label: "Moscow center" } });
}, 1000);

setTimeout(async () => {
  const hRes = await fetch(`${baseUrl}/api/chat/v1/rooms/${roomId}/messages?limit=10`, {
    headers: { Authorization: `Bearer ${tokenSender}` },
  });
  const history = await hRes.json();
  const types = (history.items || []).map((m) => m.type);
  const ok =
    received.length >= 4 &&
    ["TEXT", "IMAGE", "VIDEO", "LOCATION"].every((t) => types.includes(t));
  console.log(JSON.stringify({ realtimeReceived: received.length, historyTypes: types }));
  receiver.deactivate();
  process.exit(ok ? 0 : 1);
}, 5500);

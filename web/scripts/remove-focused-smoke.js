import crypto from "node:crypto";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const baseUrl = process.argv[2] || "http://localhost:8092";
const secret = "local-dev-secret-local-dev-secret-local-dev";

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";
const U3 = "33333333-3333-3333-3333-333333333333";

const mk = (sub) => {
  const h = (b) => Buffer.from(JSON.stringify(b)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: "festrest-backend", sub, iat: now, exp: now + 3600, displayName: "dev" };
  const data = `${h({ alg: "HS256", typ: "JWT" })}.${h(payload)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
};

const t1 = mk(U1);
const t2 = mk(U2);
const t3 = mk(U3);

const json = (r) => r.json();
const req = (token, path, method = "GET", body) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

const room = await req(t1, "/api/chat/v1/rooms", "POST", {
  type: "GROUP",
  title: "Remove Focused Room",
  participantIds: [U1, U2],
}).then(json);

await req(t1, `/api/chat/v1/rooms/${room.id}/participants`, "POST", { userIds: [U3] });
const participantsBefore = await req(t1, `/api/chat/v1/rooms/${room.id}/participants`).then(json);
const histBefore = await req(t1, `/api/chat/v1/rooms/${room.id}/messages?limit=20`).then(json);
const hasAddedSystem = (histBefore.items || []).some(
  (m) => m.type === "SYSTEM" && m.bodyJson.includes("MEMBER_ADDED") && m.senderId === null
);

let removedSystemRealtime = false;
let roomsUpdatedU1 = false;
let roomsUpdatedU3 = false;

const c2 = new Client({ webSocketFactory: () => new SockJS(`${baseUrl}/ws`), connectHeaders: { Authorization: `Bearer ${t2}` } });
const c1 = new Client({ webSocketFactory: () => new SockJS(`${baseUrl}/ws`), connectHeaders: { Authorization: `Bearer ${t1}` } });
const c3 = new Client({ webSocketFactory: () => new SockJS(`${baseUrl}/ws`), connectHeaders: { Authorization: `Bearer ${t3}` } });

c2.onConnect = () => {
  c2.subscribe(`/topic/rooms.${room.id}.messages.created`, (f) => {
    const m = JSON.parse(f.body);
    if (m.type === "SYSTEM" && String(m.bodyJson).includes("MEMBER_REMOVED") && m.senderId === null) {
      removedSystemRealtime = true;
    }
  });
};
c1.onConnect = () => {
  c1.subscribe(`/topic/user.${U1}.rooms.updated`, (f) => {
    if (String(f.body).includes(room.id)) roomsUpdatedU1 = true;
  });
};
c3.onConnect = () => {
  c3.subscribe(`/topic/user.${U3}.rooms.updated`, (f) => {
    if (String(f.body).includes(room.id)) roomsUpdatedU3 = true;
  });
};
c1.activate();
c2.activate();
c3.activate();

await new Promise((r) => setTimeout(r, 1200));
await req(t1, `/api/chat/v1/rooms/${room.id}/participants/${U3}`, "DELETE");
await new Promise((r) => setTimeout(r, 1200));

const participantsAfter = await req(t1, `/api/chat/v1/rooms/${room.id}/participants`).then(json);
const histAfter = await req(t1, `/api/chat/v1/rooms/${room.id}/messages?limit=20`).then(json);
const hasRemovedSystem = (histAfter.items || []).some(
  (m) => m.type === "SYSTEM" && m.bodyJson.includes("MEMBER_REMOVED") && m.senderId === null
);

const sendAfterRemove = await req(t3, `/api/chat/v1/rooms/${room.id}/messages`, "POST", { type: "TEXT", text: "should fail" });
const readAfterRemove = await req(t3, `/api/chat/v1/rooms/${room.id}/read`, "POST", {
  lastReadMessageId: histAfter.items?.[0]?.id ?? null,
});
const roomsU3 = await req(t3, "/api/chat/v1/rooms").then(json);
const roomVisibleForU3 = (roomsU3 || []).some((r) => r.id === room.id);

c1.deactivate();
c2.deactivate();
c3.deactivate();

const result = {
  participantsBeforeCount: participantsBefore.length,
  participantsAfterCount: participantsAfter.length,
  hasAddedSystem,
  hasRemovedSystem,
  removedSystemRealtime,
  roomsUpdatedU1,
  roomsUpdatedU3,
  sendAfterRemoveStatus: sendAfterRemove.status,
  readAfterRemoveStatus: readAfterRemove.status,
  roomVisibleForU3,
};
console.log(JSON.stringify(result));
const ok =
  participantsBefore.some((p) => p.userId === U3) &&
  !participantsAfter.some((p) => p.userId === U3) &&
  hasAddedSystem &&
  hasRemovedSystem &&
  removedSystemRealtime &&
  roomsUpdatedU1 &&
  roomsUpdatedU3 &&
  sendAfterRemove.status >= 400 &&
  readAfterRemove.status >= 400 &&
  roomVisibleForU3 === false;
process.exit(ok ? 0 : 1);

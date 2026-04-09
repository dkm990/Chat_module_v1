import crypto from "node:crypto";

const baseUrl = process.argv[2] || "http://localhost:8092";
const secret = "local-dev-secret-local-dev-secret-local-dev";

const U1 = "11111111-1111-1111-1111-111111111111";
const U3 = "33333333-3333-3333-3333-333333333333";

const mk = (sub) => {
  const h = (b) => Buffer.from(JSON.stringify(b)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const p = { iss: "festrest-backend", sub, iat: now, exp: now + 3600, displayName: "dev" };
  const data = `${h({ alg: "HS256", typ: "JWT" })}.${h(p)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
};

const t1 = mk(U1);
const t3 = mk(U3);

const req = (token, path, method = "GET", body) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

const room = await req(t1, "/api/chat/v1/rooms", "POST", {
  type: "GROUP",
  title: "Removed Access Room",
  participantIds: [U1, U3],
}).then((r) => r.json());

await req(t1, `/api/chat/v1/rooms/${room.id}/participants/${U3}`, "DELETE");

const roomRes = await req(t3, `/api/chat/v1/rooms/${room.id}`);
const historyRes = await req(t3, `/api/chat/v1/rooms/${room.id}/messages?limit=5`);

console.log(JSON.stringify({ roomStatus: roomRes.status, historyStatus: historyRes.status }));
process.exit(roomRes.status === 403 && historyRes.status === 403 ? 0 : 1);

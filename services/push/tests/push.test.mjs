import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  isAuthorized,
  isExpiredSubscriptionStatus,
  parseMessage,
  parseSubscription,
  subscriptionKey
} from "../lib/push.mjs";
import { handleSubscriptions } from "../functions/push-subscriptions.mjs";
import { broadcast, handleNotifications } from "../functions/notifications.mjs";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" }
};

const memoryStore = (entries = {}) => {
  const data = new Map(Object.entries(entries));
  return {
    data,
    setJSON: async (key, value) => data.set(key, value),
    get: async (key) => data.get(key) ?? null,
    delete: async (key) => data.delete(key),
    list: async () => ({ blobs: [...data.keys()].map((key) => ({ key })) })
  };
};

const jsonRequest = (method, body, headers = {}) =>
  new Request("https://example.test/api", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });

test("parseSubscription accepts a browser PushSubscription shape", () => {
  assert.deepEqual(parseSubscription({ ...validSubscription, expirationTime: null }), validSubscription);
});

test("parseSubscription rejects non-https endpoints and bad keys", () => {
  assert.throws(
    () => parseSubscription({ endpoint: "http://evil.test/x", keys: { p256dh: "a b", auth: "" } }),
    (err) => err instanceof ValidationError && Boolean(err.fields.endpoint && err.fields["keys.p256dh"] && err.fields["keys.auth"])
  );
  assert.throws(() => parseSubscription(null), ValidationError);
  assert.throws(() => parseSubscription({ ...validSubscription, endpoint: `https://x.test/${"a".repeat(2050)}` }), ValidationError);
});

test("parseMessage trims, defaults url and blocks off-site redirects", () => {
  assert.deepEqual(parseMessage({ title: " Service at 9 ", body: " See you " }), { title: "Service at 9", body: "See you", url: "/index.html" });
  for (const url of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", 42]) {
    assert.throws(() => parseMessage({ title: "Hi", url }), (err) => err instanceof ValidationError && Boolean(err.fields.url));
  }
  assert.throws(() => parseMessage({ title: "" }), (err) => Boolean(err.fields.title));
  assert.throws(() => parseMessage({ title: "x".repeat(81) }), (err) => Boolean(err.fields.title));
  assert.throws(() => parseMessage({ title: "ok", body: "x".repeat(241) }), (err) => Boolean(err.fields.body));
});

test("isAuthorized requires an exact bearer token and a configured token", () => {
  assert.equal(isAuthorized("Bearer secret", "secret"), true);
  assert.equal(isAuthorized("Bearer wrong!", "secret"), false);
  assert.equal(isAuthorized("secret", "secret"), false);
  assert.equal(isAuthorized(null, "secret"), false);
  assert.equal(isAuthorized("Bearer ", ""), false);
  assert.equal(isAuthorized("Bearer undefined", undefined), false);
});

test("subscriptionKey is a stable sha256 hex digest", () => {
  assert.equal(subscriptionKey("a"), subscriptionKey("a"));
  assert.match(subscriptionKey("a"), /^[0-9a-f]{64}$/);
  assert.notEqual(subscriptionKey("a"), subscriptionKey("b"));
});

test("isExpiredSubscriptionStatus is true only for 404 and 410", () => {
  assert.deepEqual([404, 410, 400, 429, 500, undefined].map(isExpiredSubscriptionStatus), [true, true, false, false, false, false]);
});

test("POST /push-subscriptions stores the subscription and returns 201", async () => {
  const store = memoryStore();
  const response = await handleSubscriptions(jsonRequest("POST", validSubscription), store);
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.id, subscriptionKey(validSubscription.endpoint));
  assert.equal(store.data.get(data.id).endpoint, validSubscription.endpoint);
});

test("POST /push-subscriptions returns 422 with field errors for bad input", async () => {
  const response = await handleSubscriptions(jsonRequest("POST", "{not json"), memoryStore());
  assert.equal(response.status, 422);
  const { error } = await response.json();
  assert.equal(error.code, "VALIDATION_FAILED");
  assert.ok(error.fields.body);
});

test("DELETE /push-subscriptions removes the subscription and returns 204", async () => {
  const id = subscriptionKey(validSubscription.endpoint);
  const store = memoryStore({ [id]: validSubscription });
  const response = await handleSubscriptions(jsonRequest("DELETE", { endpoint: validSubscription.endpoint }), store);
  assert.equal(response.status, 204);
  assert.equal(store.data.has(id), false);
});

test("other methods on /push-subscriptions return 405", async () => {
  const response = await handleSubscriptions(new Request("https://example.test/api"), memoryStore());
  assert.equal(response.status, 405);
});

test("broadcast counts sent, prunes expired and counts other failures", async () => {
  const store = memoryStore({
    ok: { endpoint: "https://push.test/ok" },
    gone: { endpoint: "https://push.test/gone" },
    down: { endpoint: "https://push.test/down" }
  });
  const sendNotification = async (subscription) => {
    if (subscription.endpoint.endsWith("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    if (subscription.endpoint.endsWith("down")) throw Object.assign(new Error("down"), { statusCode: 503 });
  };
  const originalError = console.error;
  console.error = () => {};
  const result = await broadcast({ title: "Hi", body: "", url: "/" }, store, sendNotification);
  console.error = originalError;
  assert.deepEqual(result, { sent: 1, removed: 1, failed: 1 });
  assert.deepEqual([...store.data.keys()].sort(), ["down", "ok"]);
});

test("POST /notifications rejects a missing or wrong admin token with 401", async () => {
  const deps = { store: memoryStore(), sendNotification: async () => {}, adminToken: "secret" };
  assert.equal((await handleNotifications(jsonRequest("POST", { title: "Hi" }), deps)).status, 401);
  assert.equal((await handleNotifications(jsonRequest("POST", { title: "Hi" }, { Authorization: "Bearer nope" }), deps)).status, 401);
});

test("POST /notifications sends the validated payload to every subscriber", async () => {
  const sent = [];
  const deps = {
    store: memoryStore({ a: { endpoint: "https://push.test/a" }, b: { endpoint: "https://push.test/b" } }),
    sendNotification: async (subscription, payload) => sent.push([subscription.endpoint, JSON.parse(payload)]),
    adminToken: "secret"
  };
  const originalInfo = console.info;
  console.info = () => {};
  const response = await handleNotifications(
    jsonRequest("POST", { title: "Sunday 9 AM", body: "Join us live", url: "/sermons.html" }, { Authorization: "Bearer secret" }),
    deps
  );
  console.info = originalInfo;
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { sent: 2, removed: 0, failed: 0 });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0][1], { title: "Sunday 9 AM", body: "Join us live", url: "/sermons.html" });
});

test("POST /notifications returns 422 for an off-site url", async () => {
  const deps = { store: memoryStore(), sendNotification: async () => {}, adminToken: "secret" };
  const response = await handleNotifications(
    jsonRequest("POST", { title: "Hi", url: "https://evil.test" }, { Authorization: "Bearer secret" }),
    deps
  );
  assert.equal(response.status, 422);
});

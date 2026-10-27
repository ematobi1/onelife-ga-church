import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import {
  ValidationError,
  errorResponse,
  isAuthorized,
  isExpiredSubscriptionStatus,
  jsonResponse,
  parseMessage,
  readJson
} from "../lib/push.mjs";

const SEND_TIMEOUT_MS = 10000;

export const broadcast = async (message, store, sendNotification) => {
  const { blobs } = await store.list();
  const payload = JSON.stringify(message);
  const result = { sent: 0, removed: 0, failed: 0 };

  await Promise.all(
    blobs.map(async ({ key }) => {
      const subscription = await store.get(key, { type: "json" });
      if (!subscription) return;
      try {
        await sendNotification(subscription, payload, { TTL: 86400, timeout: SEND_TIMEOUT_MS });
        result.sent += 1;
      } catch (err) {
        if (isExpiredSubscriptionStatus(err.statusCode)) {
          await store.delete(key);
          result.removed += 1;
        } else {
          result.failed += 1;
          console.error(JSON.stringify({ event: "push_send_failed", id: key, statusCode: err.statusCode }));
        }
      }
    })
  );

  return result;
};

export const handleNotifications = async (request, { store, sendNotification, adminToken }) => {
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST");
  if (!isAuthorized(request.headers.get("authorization"), adminToken)) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid admin token");
  }

  try {
    const message = parseMessage(await readJson(request));
    const result = await broadcast(message, store, sendNotification);
    console.info(JSON.stringify({ event: "push_broadcast", title: message.title, ...result }));
    return jsonResponse(200, { data: result });
  } catch (err) {
    if (err instanceof ValidationError) return errorResponse(422, "VALIDATION_FAILED", "Invalid notification", err.fields);
    console.error(JSON.stringify({ event: "push_broadcast_error", message: err.message }));
    return errorResponse(500, "INTERNAL_ERROR", "Something went wrong");
  }
};

export default async (request) => {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return handleNotifications(request, {
    store: getStore("push-subscriptions"),
    sendNotification: webpush.sendNotification,
    adminToken: process.env.PUSH_ADMIN_TOKEN
  });
};

export const config = { path: "/api/v1/notifications" };

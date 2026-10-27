import { getStore } from "@netlify/blobs";
import {
  ValidationError,
  errorResponse,
  jsonResponse,
  parseEndpoint,
  parseSubscription,
  readJson,
  subscriptionKey
} from "../lib/push.mjs";

export const handleSubscriptions = async (request, store) => {
  try {
    if (request.method === "POST") {
      const subscription = parseSubscription(await readJson(request));
      const id = subscriptionKey(subscription.endpoint);
      await store.setJSON(id, { ...subscription, createdAt: new Date().toISOString() });
      console.info(JSON.stringify({ event: "push_subscribed", id }));
      return jsonResponse(201, { data: { id } });
    }

    if (request.method === "DELETE") {
      const id = subscriptionKey(parseEndpoint(await readJson(request)));
      await store.delete(id);
      console.info(JSON.stringify({ event: "push_unsubscribed", id }));
      return jsonResponse(204);
    }

    return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST or DELETE");
  } catch (err) {
    if (err instanceof ValidationError) return errorResponse(422, "VALIDATION_FAILED", "Invalid subscription", err.fields);
    console.error(JSON.stringify({ event: "push_subscription_error", message: err.message }));
    return errorResponse(500, "INTERNAL_ERROR", "Something went wrong");
  }
};

export default async (request) => handleSubscriptions(request, getStore("push-subscriptions"));

export const config = { path: "/api/v1/push-subscriptions" };

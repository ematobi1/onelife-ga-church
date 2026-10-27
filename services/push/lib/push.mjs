import { createHash, timingSafeEqual } from "node:crypto";

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 240;
const DEFAULT_URL = "/index.html";

export class ValidationError extends Error {
  constructor(fields) {
    super("Validation failed");
    this.fields = fields;
  }
}

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

export const parseSubscription = (body) => {
  const fields = {};
  const endpoint = body?.endpoint;
  const keys = body?.keys;

  if (!isNonEmptyString(endpoint) || endpoint.length > MAX_ENDPOINT_LENGTH) {
    fields.endpoint = "Required, at most 2048 characters";
  } else {
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:") fields.endpoint = "Must be an https URL";
  }

  if (!isNonEmptyString(keys?.p256dh) || !BASE64URL.test(keys.p256dh)) fields["keys.p256dh"] = "Required base64url string";
  if (!isNonEmptyString(keys?.auth) || !BASE64URL.test(keys.auth)) fields["keys.auth"] = "Required base64url string";

  if (Object.keys(fields).length) throw new ValidationError(fields);
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
};

export const parseEndpoint = (body) => {
  const endpoint = body?.endpoint;
  if (!isNonEmptyString(endpoint) || endpoint.length > MAX_ENDPOINT_LENGTH) {
    throw new ValidationError({ endpoint: "Required, at most 2048 characters" });
  }
  return endpoint;
};

export const parseMessage = (body) => {
  const fields = {};
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const url = body?.url === undefined ? DEFAULT_URL : body.url;

  if (!title || title.length > MAX_TITLE_LENGTH) fields.title = `Required, at most ${MAX_TITLE_LENGTH} characters`;
  if (text.length > MAX_BODY_LENGTH) fields.body = `At most ${MAX_BODY_LENGTH} characters`;
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || url.includes("\\")) {
    fields.url = "Must be a site-relative path starting with /";
  }

  if (Object.keys(fields).length) throw new ValidationError(fields);
  return { title, body: text, url };
};

export const subscriptionKey = (endpoint) => createHash("sha256").update(endpoint).digest("hex");

export const isAuthorized = (authorizationHeader, adminToken) => {
  if (!isNonEmptyString(adminToken) || !isNonEmptyString(authorizationHeader)) return false;
  const expected = Buffer.from(`Bearer ${adminToken}`);
  const received = Buffer.from(authorizationHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const isExpiredSubscriptionStatus = (statusCode) => statusCode === 404 || statusCode === 410;

export const jsonResponse = (status, payload) =>
  new Response(status === 204 ? null : JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });

export const errorResponse = (status, code, message, fields) =>
  jsonResponse(status, { error: fields ? { code, message, fields } : { code, message } });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    throw new ValidationError({ body: "Must be valid JSON" });
  }
};

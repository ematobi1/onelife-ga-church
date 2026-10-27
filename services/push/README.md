# Push service

Self-hosted web push for the One Life Church PWA. Runs as two Netlify Functions,
stores subscriptions in Netlify Blobs (`push-subscriptions` store), and signs
messages with VAPID keys. No third-party push account.

## Contract (`/api/v1`)

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/api/v1/push-subscriptions` | none | browser `PushSubscription` JSON | `201 { data: { id } }` |
| DELETE | `/api/v1/push-subscriptions` | none | `{ endpoint }` | `204` |
| POST | `/api/v1/notifications` | `Authorization: Bearer $PUSH_ADMIN_TOKEN` | `{ title (≤80), body (≤240), url ("/path") }` | `200 { data: { sent, removed, failed } }` |

Errors use `{ error: { code, message, fields? } }`: `422 VALIDATION_FAILED`,
`401 UNAUTHORIZED`, `405 METHOD_NOT_ALLOWED`, `500 INTERNAL_ERROR`.
`url` must be a site-relative path so a notification can never send someone off-site.
Subscriptions that the push service reports as gone (404/410) are deleted during a send.

## Environment variables (Netlify site settings)

| Name | Purpose |
|------|---------|
| `VAPID_PUBLIC_KEY` | Must match the key in `js/pwa.js` |
| `VAPID_PRIVATE_KEY` | Signs pushes. Secret. |
| `VAPID_SUBJECT` | `mailto:` contact for push services |
| `PUSH_ADMIN_TOKEN` | Bearer token for sending. Secret. |

## Sending a notification

```sh
npm run push:send -- "Sunday Service" "We go live at 9:00 AM" "/sermons.html"
```

Reads `SITE_URL` and `PUSH_ADMIN_TOKEN` from `.env`.

## Logs

Each call writes one JSON log line (`push_subscribed`, `push_unsubscribed`,
`push_broadcast` with sent/removed/failed counts, `push_send_failed`). View them in
Netlify → Logs → Functions.

## Tests

`npm test` (gate, under 1s). Handlers take the store and sender as arguments, so tests run against an in-memory store.

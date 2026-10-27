const [title, body = "", url = "/index.html"] = process.argv.slice(2);

if (!title) {
  console.error('Usage: npm run push:send -- "Title" "Body text" "/page.html"');
  process.exit(1);
}

const { SITE_URL, PUSH_ADMIN_TOKEN } = process.env;
if (!SITE_URL || !PUSH_ADMIN_TOKEN) {
  console.error("SITE_URL and PUSH_ADMIN_TOKEN must be set in .env");
  process.exit(1);
}

const response = await fetch(`${SITE_URL}/api/v1/notifications`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${PUSH_ADMIN_TOKEN}` },
  body: JSON.stringify({ title, body, url }),
  signal: AbortSignal.timeout(30000)
});

const result = await response.json();
if (!response.ok) {
  console.error(`Failed (${response.status}):`, JSON.stringify(result.error));
  process.exit(1);
}

const { sent, removed, failed } = result.data;
console.info(`Sent to ${sent} device(s). Removed ${removed} expired. ${failed} failed.`);

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const pages = readdirSync(".").filter((file) => file.endsWith(".html"));
const read = (file) => readFileSync(file, "utf8");
const localPath = (href) => href.replace(/^\//, "").split(/[?#]/)[0] || "index.html";

test("every page links the manifest, theme color, iOS icon and pwa.js", () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/, `${page} is missing the manifest link`);
    assert.match(html, /<meta name="theme-color"/, `${page} is missing theme-color`);
    assert.match(html, /<link rel="apple-touch-icon"/, `${page} is missing apple-touch-icon`);
    assert.match(html, /<script src="js\/pwa.js" defer><\/script>/, `${page} is missing pwa.js`);
  }
});

test("manifest is valid JSON and every icon and shortcut target exists", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  for (const icon of manifest.icons) assert.ok(existsSync(localPath(icon.src)), `missing ${icon.src}`);
  for (const shortcut of manifest.shortcuts) assert.ok(existsSync(localPath(shortcut.url)), `missing ${shortcut.url}`);
  assert.ok(existsSync(localPath(manifest.start_url)));
});

test("every file the service worker precaches exists", () => {
  const sw = read("sw.js");
  const list = sw.match(/PRECACHE_URLS = \[([\s\S]*?)\];/)[1];
  const urls = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(urls.includes("/offline.html"));
  for (const url of urls) assert.ok(existsSync(localPath(url)), `sw.js precaches missing file ${url}`);
});

test("tab bar and More screen only link to pages that exist", () => {
  const pwa = read("js/pwa.js");
  const tabTargets = [...pwa.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(tabTargets.length, 5);
  const moreTargets = [...read("more.html").matchAll(/class="more-list__link" href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(moreTargets.length >= 17);
  for (const href of [...tabTargets, ...moreTargets]) assert.ok(existsSync(localPath(href)), `broken link ${href}`);
});

test("More screen covers every page the request listed", () => {
  const more = read("more.html");
  const required = [
    "about.html", "core-values.html", "plan-a-visit.html", "contact.html", "life-groups.html", "classes.html",
    "discipleship.html", "leadership-training.html", "get-involved.html", "connect.html", "testimonies.html",
    "prayer-wall.html", "care.html", "kids-checkin.html", "member-portal.html"
  ];
  for (const page of required) assert.ok(more.includes(`href="${page}"`), `More screen is missing ${page}`);
});

test("the VAPID public key in pwa.js matches .env when present", () => {
  if (!existsSync(".env")) return;
  const envKey = read(".env").match(/^VAPID_PUBLIC_KEY=(.+)$/m)?.[1]?.trim();
  assert.ok(read("js/pwa.js").includes(`"${envKey}"`), "pwa.js VAPID key does not match .env");
});

test("no double-encoded UTF-8 in source files", () => {
  const files = [...pages, "js/main.js", "js/pwa.js", "css/main.css", "sw.js"];
  for (const file of files) assert.doesNotMatch(read(file), /â€|Ã©/, `${file} contains mojibake`);
});

test("netlify.toml blocks non-site files from being served", () => {
  const toml = read("netlify.toml");
  for (const path of ["/services/*", "/scripts/*", "/tests/*", "/package.json", "/package-lock.json", "/netlify.toml", "/README.md"]) {
    assert.ok(toml.includes(`from = "${path}"\nto = "/404"\nstatus = 404\nforce = true`), `${path} is not blocked`);
  }
});

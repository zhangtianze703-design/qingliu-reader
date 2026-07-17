import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { closeSitesBrowser, sitesBrowserFetch } from "./sites-browser-fetch.mjs";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers = [], ...records] = rows;
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

export function readMarkdownDocument(markdown) {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const metadata = {};
  if (frontmatter) {
    for (const line of frontmatter[1].split("\n")) {
      const match = line.match(/^([a-z_]+):\s*["']?([\s\S]*?)["']?\s*$/i);
      if (match) metadata[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
  const contentMarkdown = markdown
    .slice(frontmatter?.[0].length || 0)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { metadata, contentMarkdown };
}

export function localImageReferences(markdown) {
  return [...markdown.matchAll(/!\[([^\]]*)\]\(\.\.\/images\/([^)]+)\)/g)].map((match) => ({ full: match[0], alt: match[1], relativePath: match[2] }));
}

function keychain(service) {
  return execFileSync("security", ["find-generic-password", "-a", "rss-ai-sync", "-s", service, "-w"], { encoding: "utf8" }).trim();
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({ ".avif": "image/avif", ".gif": "image/gif", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" })[extension] || "application/octet-stream";
}

async function mapLimit(values, limit, task) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }));
  return results;
}

async function run() {
  const inputFlag = process.argv.indexOf("--input");
  const endpointFlag = process.argv.indexOf("--endpoint");
  const accountKeyFlag = process.argv.indexOf("--account-key");
  const accountNameFlag = process.argv.indexOf("--account-name");
  const requestIdFlag = process.argv.indexOf("--request-id");
  const input = inputFlag >= 0 ? process.argv[inputFlag + 1] : "";
  const endpoint = endpointFlag >= 0 ? process.argv[endpointFlag + 1] : "http://localhost:3001";
  let accountKey = accountKeyFlag >= 0 ? process.argv[accountKeyFlag + 1] : "";
  const requestId = requestIdFlag >= 0 ? Number(process.argv[requestIdFlag + 1]) || undefined : undefined;
  if (!input) throw new Error("用法：node scripts/backfill-wechat-markdown.mjs --input <公众号下载目录> [--endpoint http://localhost:3001]");

  const accountName = (accountNameFlag >= 0 ? process.argv[accountNameFlag + 1] : "")?.trim() || path.basename(path.resolve(input));
  const remote = !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i.test(endpoint);
  const authHeaders = remote ? {
    "OAI-Sites-Authorization": `Bearer ${keychain("rss-ai-sites-bypass")}`,
    "x-import-token": keychain("rss-ai-import-token"),
  } : {};
  const request = (url, options = {}) => remote
    ? sitesBrowserFetch(url, options)
    : fetch(url, options);
  if (!accountKey) {
    const dashboardResponse = await request(`${endpoint}/api/dashboard`, { headers: authHeaders });
    if (!dashboardResponse.ok) throw new Error(`读取情报台失败：${dashboardResponse.status}`);
    const dashboard = await dashboardResponse.json();
    const source = dashboard.sources.find((candidate) => candidate.kind === "wechat" && candidate.name === accountName);
    if (!source?.url?.startsWith("wechat://")) throw new Error(`情报台里找不到公众号“${accountName}”`);
    accountKey = source.url.slice("wechat://".length);
  }
  const accountHash = createHash("sha256").update(accountKey).digest("hex").slice(0, 16);

  const records = parseCsv(await readFile(path.join(input, "index.csv"), "utf8")).filter((record) => record.status === "success" && record.markdown_path);
  const articles = [];
  let uploaded = 0;
  for (const record of records) {
    const markdown = await readFile(path.join(input, record.markdown_path), "utf8");
    const parsed = readMarkdownDocument(markdown);
    const references = localImageReferences(parsed.contentMarkdown);
    const articleHash = createHash("sha256").update(record.source_url).digest("hex").slice(0, 16);
    const replacements = await mapLimit(references, 6, async (reference) => {
      const file = path.join(input, "images", reference.relativePath);
      const key = `wechat/${accountHash}/${articleHash}/${path.basename(reference.relativePath)}`;
      const response = await request(`${endpoint}/api/media?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { ...authHeaders, "content-type": contentType(file) },
        body: await readFile(file),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `图片上传失败：${response.status}`);
      if (result.stored) uploaded += 1;
      return { ...reference, web: `![${reference.alt}](/api/media?key=${encodeURIComponent(key)})` };
    });
    let contentMarkdown = parsed.contentMarkdown;
    for (const replacement of replacements) contentMarkdown = contentMarkdown.replaceAll(replacement.full, replacement.web);
    if (contentMarkdown.length < 160) continue;
    articles.push({
      title: record.title,
      url: record.source_url,
      contentMarkdown,
      author: parsed.metadata.author || parsed.metadata.account || accountName,
      publishedAt: parsed.metadata.publish_time || undefined,
    });
  }

  let changed = 0;
  for (let index = 0; index < articles.length; index += 10) {
    const response = await request(`${endpoint}/api/items`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "import-wechat", accountKey, accountName, requestId, articles: articles.slice(index, index + 10) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `回填失败：${response.status}`);
    changed += Number(result.added || 0);
  }
  console.log(JSON.stringify({ account: accountName, articles: articles.length, images: uploaded, changed }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(closeSitesBrowser);
}

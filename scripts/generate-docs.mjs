import { readdir, readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runGraphQLMarkdown } from "@graphql-markdown/cli";

const customMDX = pathToFileURL(
  resolve("./scripts/custom-pelican-mdx.mjs"),
).href;

const PAGES_DIR = resolve("./content/pages");
const GRAPHQL_DIR = resolve(PAGES_DIR, "graphql");

const titleFromName = (name) =>
  name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const walk = async (dir) => {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
};

const slugOf = (file) =>
  relative(PAGES_DIR, file).replace(/\\/g, "/").replace(/(\/index)?\.md$/, "");

// Pelican reads `Key: value` metadata at the top of the file, not YAML.
const addMetadata = async (file) => {
  const raw = await readFile(file, "utf8");
  const match = /^\s*#\s+(.+?)\s*\r?\n/.exec(raw);
  const title = match ? match[1] : titleFromName(slugOf(file).split("/").pop());
  const body = match ? raw.slice(match[0].length) : raw;
  const meta = `Title: ${title}\nSlug: ${slugOf(file)}\nStatus: hidden\n\n`;
  await writeFile(file, meta + body.replace(/^\s+/, ""));
};

const esc = (t) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const singular = (w) =>
  w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.replace(/s$/, "");

// First sentence of the first prose paragraph, stripped of markdown/HTML.
const summarize = (raw) => {
  const body = raw
    .replace(/^Title: .*\nSlug: .*\nStatus: .*\n/, "")
    .replace(/```[\s\S]*?```/g, "\n\n");
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|<|\||-|\*|>)/.test(p));
  if (!para) return "";
  // Strip tags until none remain (a single pass can leave fragments such as
  // "<script" from nested input). The result is still escaped with esc() on output.
  let stripped = para.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  let previous;
  do {
    previous = stripped;
    stripped = stripped.replace(/<[^>]*>/g, "");
  } while (stripped !== previous);
  const text = stripped
    .replace(/[<>]/g, "")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const first = text.split(/(?<=[.!?])\s/)[0];
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}...` : first;
};

const countPages = async (dir) => {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countPages(join(dir, e.name));
    else if (e.name.endsWith(".md") && e.name !== "index.md") n += 1;
  }
  return n;
};

const card = (href, name, desc, { badge, meta } = {}) =>
  `<a class="gq-card" href="${href}">` +
  `<span class="gq-card-head"><code class="gq-card-name">${esc(name)}</code>` +
  (badge ? `<span class="gq-card-badge">deprecated</span>` : "") +
  `</span>` +
  (desc ? `<span class="gq-card-desc">${esc(desc)}</span>` : "") +
  (meta ? `<span class="gq-card-meta">${esc(meta)}</span>` : "") +
  `</a>`;

const grid = (cards) =>
  `<div class="gq-cards">\n${cards.join("\n")}\n</div>\n`;

// One index page per directory, listing its pages and sub-directories.
const writeIndexes = async (dir, isRoot = false) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const cards = [];
  let subdirs = 0;
  for (const e of entries.sort((x, y) => x.name.localeCompare(y.name))) {
    if (e.isDirectory()) {
      await writeIndexes(join(dir, e.name));
      subdirs += 1;
      const n = await countPages(join(dir, e.name));
      cards.push(
        card(
          `{filename}/pages/${slugOf(join(dir, e.name, "index.md"))}/index.md`,
          titleFromName(e.name),
          "",
          { meta: `${n} ${n === 1 ? "item" : "items"}` },
        ),
      );
    } else if (e.name.endsWith(".md") && e.name !== "index.md") {
      const raw = await readFile(join(dir, e.name), "utf8");
      const title = /^Title: (.+)$/m.exec(raw)?.[1] ?? e.name;
      cards.push(
        card(
          `{filename}/pages/${slugOf(join(dir, e.name))}.md`,
          title,
          summarize(raw),
          { badge: raw.includes("DEPRECATED") },
        ),
      );
    }
  }
  if (isRoot) return; // api.md owns the `graphql` slug.
  const slug = slugOf(join(dir, "index.md"));
  const name = dir.split("/").pop();
  const title = titleFromName(name);
  const parent = titleFromName(dir.split("/").slice(-2, -1)[0]);
  const n = cards.length;
  const noun = subdirs ? "category" : singular(title.toLowerCase());
  const nouns = subdirs ? "categories" : title.toLowerCase();
  const intro = `${n} ${n === 1 ? noun : nouns} in ${parent}.`;
  await writeFile(
    join(dir, "index.md"),
    `Title: ${title}\nSlug: ${slug}\nStatus: hidden\n\n<p class="gq-intro">${intro}</p>\n\n${grid(cards)}`,
  );
};

rmSync(GRAPHQL_DIR, { force: true, recursive: true });

await runGraphQLMarkdown(
  {
    // Shared schema documented by every GraphQL-Markdown demo.
    schema:
      "https://raw.githubusercontent.com/graphql-markdown/graphql-markdown/main/tests/e2e/__data__/demo_schema.graphql",
    rootPath: "./content/pages",
    baseURL: "graphql",
    formatter: customMDX,
    loaders: {
      UrlLoader: "@graphql-tools/url-loader",
    },
    pretty: true,
    force: true,
    telemetry: false,
    homepage: false,
    docOptions: {
      sectionHeaderId: false,
    },
  },
  {},
);

for (const file of await walk(GRAPHQL_DIR)) {
  await addMetadata(file);
}
await writeIndexes(GRAPHQL_DIR, true);

// api.md lists the top-level categories.
const top = [];
for (const e of (await readdir(GRAPHQL_DIR, { withFileTypes: true })).filter(
  (e) => e.isDirectory(),
)) {
  const n = await countPages(join(GRAPHQL_DIR, e.name));
  top.push(
    card(
      `{filename}/pages/graphql/${e.name}/index.md`,
      titleFromName(e.name),
      "",
      { meta: `${n} ${n === 1 ? "item" : "items"}` },
    ),
  );
}
await writeFile(
  join(PAGES_DIR, "api.md"),
  `Title: API Reference\nSlug: graphql\n\n<p class="gq-intro">Browse the generated GraphQL schema documentation. ${top.length} categories.</p>\n\n${grid(top)}`,
);

console.log("GraphQL docs generated in content/pages/graphql");

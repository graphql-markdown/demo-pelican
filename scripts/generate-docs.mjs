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

// One index page per directory, listing its pages and sub-directories.
const writeIndexes = async (dir, isRoot = false) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const links = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      await writeIndexes(join(dir, e.name));
      links.push(
        `- [${titleFromName(e.name)}]({filename}/pages/${slugOf(join(dir, e.name, "index.md"))}/index.md)`,
      );
    } else if (e.name.endsWith(".md") && e.name !== "index.md") {
      const raw = await readFile(join(dir, e.name), "utf8");
      const title = /^Title: (.+)$/m.exec(raw)?.[1] ?? e.name;
      links.push(
        `- [${title}]({filename}/pages/${slugOf(join(dir, e.name))}.md)`,
      );
    }
  }
  if (isRoot) return; // api.md owns the `graphql` slug.
  const slug = slugOf(join(dir, "index.md"));
  const title = titleFromName(dir.split("/").pop());
  await writeFile(
    join(dir, "index.md"),
    `Title: ${title}\nSlug: ${slug}\nStatus: hidden\n\n${links.sort().join("\n")}\n`,
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
    docOptions: {
      sectionHeaderId: false,
    },
  },
  {},
);

// The CLI drops a root-level generated.md homepage stub; Pelican has its own home.
rmSync(join(GRAPHQL_DIR, "generated.md"), { force: true });

for (const file of await walk(GRAPHQL_DIR)) {
  await addMetadata(file);
}
await writeIndexes(GRAPHQL_DIR, true);

// api.md lists the top-level categories.
const top = (await readdir(GRAPHQL_DIR, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map(
    (e) =>
      `- [${titleFromName(e.name)}]({filename}/pages/graphql/${e.name}/index.md)`,
  );
await writeFile(
  join(PAGES_DIR, "api.md"),
  `Title: API Reference\nSlug: graphql\n\nBrowse the generated GraphQL schema documentation.\n\n${top.join("\n")}\n`,
);

console.log("GraphQL docs generated in content/pages/graphql");

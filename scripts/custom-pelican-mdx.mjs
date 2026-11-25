import { relative, sep } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import MkDocsFormatter from "@graphql-markdown/formatters/mkdocs";
import { toLink } from "@graphql-markdown/printer-legacy";

const mkdocsFormatFunctions =
  typeof MkDocsFormatter.createMDXFormatter === "function"
    ? MkDocsFormatter.createMDXFormatter()
    : MkDocsFormatter;

export const mdxExtension = ".md";

// Pages render concurrently, so this may hold another page's options: only read
// settings shared by every page (schema, basePath, hierarchy, groups, deprecated, formatMDXLink).
let printOptions;

/**
 * Hook that captures the resolved print options before each page is printed.
 */
const beforePrintTypeHook = (event) => {
  printOptions = event.data.options;
};

/**
 * Internal links become Pelican intrasite links (`{filename}/pages/...md`,
 * relative to PATH). External links are returned unchanged.
 */
export const formatMDXLink = ({ text, url }) => {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\{)/i.test(url)) {
    return { text, url };
  }
  const [pathPart, ...anchor] = url.split("#");
  const path = pathPart
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/|\.\/)+/, "")
    .replace(/^\/+/, "")
    .replace(/\.md$/, "");
  const hash = anchor.length > 0 ? `#${anchor.join("#")}` : "";
  return { text, url: `{filename}/pages/${path}.md${hash}` };
};

/**
 * Replaces inline code names matching a schema type with a link to its page.
 */
const linkEntities = (text) => {
  const schema = printOptions?.schema;
  const rootTypes = [
    schema?.getQueryType(),
    schema?.getMutationType(),
    schema?.getSubscriptionType(),
  ];

  return text.replaceAll(/`([_A-Za-z][_0-9A-Za-z]*)`/g, (match, name) => {
    const type = schema?.getType(name);
    if (!type || name.startsWith("__") || rootTypes.includes(type)) {
      return match;
    }
    const { url } = toLink(type, name, undefined, printOptions);
    if (url === "#") {
      return match;
    }
    const { url: href } = formatMDXLink({ text: name, url });
    return `[\`${name}\`](${href})`;
  });
};

/**
 * Formatter override that links entities in deprecation admonitions, whatever
 * the title case, so the `@deprecatedType` notices (titled "Deprecated") are
 * linked too.
 */
const formatMDXAdmonition = (admonition, meta) => {
  const text =
    admonition.title?.toLowerCase() === "deprecated" && admonition.text
      ? linkEntities(admonition.text)
      : admonition.text;
  return mkdocsFormatFunctions.formatMDXAdmonition(
    { ...admonition, text },
    meta,
  );
};

// Public URL of the generated pages' folder: SITEURL in publishconf.py + "graphql"
const COPIES_URL = "https://graphql-markdown.dev/demo-pelican/graphql";

/**
 * Appends a "View as Markdown" link to the page, pointing to its copy.
 * The page's slug is its path under `graphql/`, so the copy has the same path.
 */
const afterRenderTypeEntitiesHook = async (event) => {
  const { filePath, outputDir, outputAdapter } = event.data;
  const path = relative(outputDir, filePath)
    .split(sep)
    .join("/")
    .replace(/\.mdx?$/, "");
  const link = `\n\n[View as Markdown](${COPIES_URL}/${path}.md)\n`;

  const page = outputAdapter?.readFile
    ? await outputAdapter.readFile(filePath)
    : await readFile(filePath, "utf8");
  const content = `${page.trimEnd()}${link}`;
  await (outputAdapter?.writeFile
    ? outputAdapter.writeFile(filePath, content)
    : writeFile(filePath, content));
};

// The mkdocs relative-link rewrite hook is dropped: formatMDXLink handles links.
const {
  afterRenderTypeEntitiesHook: _dropped,
  formatMDXAdmonition: _droppedAdmonition,
  ...rest
} = mkdocsFormatFunctions;

export default {
  ...rest,
  formatMDXLink,
  formatMDXAdmonition,
  mdxExtension,
  beforePrintTypeHook,
  afterRenderTypeEntitiesHook,
};

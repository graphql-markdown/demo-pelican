import MkDocsFormatter from "@graphql-markdown/formatters/mkdocs";

const mkdocsFormatFunctions =
  typeof MkDocsFormatter.createMDXFormatter === "function"
    ? MkDocsFormatter.createMDXFormatter()
    : MkDocsFormatter;

export const mdxExtension = ".md";

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

// The mkdocs relative-link rewrite hook is dropped: formatMDXLink handles links.
const { afterRenderTypeEntitiesHook: _dropped, ...rest } =
  mkdocsFormatFunctions;

export default {
  ...rest,
  formatMDXLink,
  mdxExtension,
};

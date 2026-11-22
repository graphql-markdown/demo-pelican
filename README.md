# GraphQL-Markdown + Pelican demo

This project demonstrates how to generate GraphQL documentation with GraphQL-Markdown for a [Pelican](https://getpelican.com/) site using the notmyidea theme.

**Live demo:** [graphql-markdown.dev/demo-pelican](https://graphql-markdown.dev/demo-pelican/)

## Quick start

```bash
npm install
pip install -r requirements.txt
npm run dev
```

Open `http://127.0.0.1:8000/` and use the API Reference entry in the menu.

## Scripts

| Script             | What it does                                                                        |
| ------------------ | ----------------------------------------------------------------------------------- |
| `npm run generate` | Generates the GraphQL pages into `content/pages/graphql` (fetches the schema).       |
| `npm run dev`      | Generates, then runs `pelican --listen --autoreload` with `pelicanconf.py`.          |
| `npm run build`    | Generates, then builds the production site into `output/` with `publishconf.py`.     |
| `npm run build:local` | Generates, then builds `output/` with `pelicanconf.py` (relative URLs for localhost). |
| `npm run clean`    | Removes the generated GraphQL pages and `output/`.                                  |
| `npm run test:visual` | Runs the Playwright screenshot tests against `output/` (Argos upload in CI).     |

## Project structure

```text
.
├── content/
│   ├── extra/
│   │   └── gqlmd.css           # Copied to output/static/ and loaded by theme-overrides/base.html
│   └── pages/
│       ├── api.md              # API Reference landing page (generated)
│       ├── home.md             # Site home page
│       └── graphql/            # Generated GraphQL documentation (git-ignored)
├── scripts/
│   ├── custom-pelican-mdx.mjs  # Formatter: extends the MkDocs preset with Pelican links
│   └── generate-docs.mjs       # GraphQL-Markdown runner and metadata post-processing
├── theme-overrides/
│   └── base.html               # Extends the theme head to load gqlmd.css
├── tests/visual/
│   └── site.spec.ts            # Playwright + Argos screenshots
├── playwright.config.ts        # Visual test configuration (serves output/)
├── pelicanconf.py              # Development settings (relative URLs)
├── publishconf.py              # Production settings (GitHub Pages URL)
└── package.json
```

## Visual tests

```bash
npm run build:local
npx playwright install chromium
npm run test:visual
```

Screenshots are uploaded to Argos only in CI when `ARGOS_TOKEN` is set. Set `VISUAL_PORT` to serve `output/` on another port than 4173.

## Deployment

The `Deploy to GitHub Pages` workflow runs `npm run build` on every push to `main` and publishes `output/` to the `gh-pages` branch with `pipx run ghp-import -n -p -f output`.

## Using GraphQL-Markdown with Pelican

There is no GraphQL-Markdown preset for Pelican. Pelican is blog-first, and its link and metadata syntax is Pelican-specific, so this demo's custom formatter is the reference recipe. See [issue #3652](https://github.com/graphql-markdown/graphql-markdown/issues/3652) for the discussion.

### GraphQL-Markdown options

`scripts/generate-docs.mjs` runs GraphQL-Markdown with these options:

```js
await runGraphQLMarkdown({
  schema: "https://raw.githubusercontent.com/graphql-markdown/graphql-markdown/main/tests/e2e/__data__/demo_schema.graphql",
  rootPath: "./content/pages",
  baseURL: "graphql",
  homepage: false,
  formatter: "./scripts/custom-pelican-mdx.mjs",
}, {});
```

`homepage: false` skips the CLI's built-in `generated.md` homepage, since Pelican has its own home page.

### Custom formatter

`scripts/custom-pelican-mdx.mjs` extends `@graphql-markdown/formatters/mkdocs` with these changes:

| Area       | Change                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Links      | Internal links become `{filename}/pages/...md`, Pelican intrasite links, instead of page-relative `.md` links.         |
| Metadata   | `generate-docs.mjs` prepends `Title:`, `Slug:` (path-based, to avoid title-slug collisions) and `Status: hidden` in place of YAML front matter. Hidden pages are built at their URL but kept off page lists. |
| Navigation | Each directory gets a generated `index.md` listing its pages and sub-directories. `api.md` links the top-level categories. |

Python-Markdown admonitions, `<details>` blocks and 4-space indentation carry over unchanged from the mkdocs preset.

### pelicanconf.py settings

| Setting                    | Value                                   | Purpose                                              |
| -------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `PAGE_PATHS`               | `["pages"]`                             | Reads the generated pages.                           |
| `ARTICLE_PATHS`            | `[]`                                    | No blog articles.                                    |
| `PAGE_URL`                 | `"{slug}/"`                             | Pages are served at their slug path.                 |
| `PAGE_SAVE_AS`             | `"{slug}/index.html"`                   | Each page is written to its own index.html.          |
| `MARKDOWN`                 | admonition, md_in_html, toc, extra, codehilite | Extensions required by the formatter output.  |
| Blog outputs               | `ARCHIVES_SAVE_AS`, `TAGS_SAVE_AS`, `CATEGORIES_SAVE_AS`, `AUTHORS_SAVE_AS` and related `*_SAVE_AS` set to `""` | Disables the unused blog pages. |

### Theme

`theme/` is an example docs theme. Its `nav_tree` Jinja filter (registered in `JINJA_FILTERS`) nests pages by slug path for the sidebar.

# GraphQL-Markdown + Pelican demo

This project demonstrates how to generate GraphQL documentation with GraphQL-Markdown for a Pelican site using the notmyidea theme.

**Live demo:** [graphql-markdown.github.io/demo-pelican](https://graphql-markdown.github.io/demo-pelican/)

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

## Notes

- The documented schema is the [shared GraphQL-Markdown demo schema](https://github.com/graphql-markdown/graphql-markdown/blob/main/tests/e2e/__data__/demo_schema.graphql) used by all GraphQL-Markdown demos, loaded from its raw URL at generation time.
- The custom formatter (`scripts/custom-pelican-mdx.mjs`) is built on the `@graphql-markdown/formatters/mkdocs` preset, with these Pelican-specific differences:
  - Internal links are Pelican intrasite links, `{filename}/pages/...md`, instead of page-relative `.md` links.
  - `generate-docs.mjs` prepends a `Title:` / `Slug:` / `Status: hidden` metadata block to each generated page, because Pelican reads `Key: value` metadata rather than YAML front matter. Hidden pages are built at their URL but kept off the theme's page lists.
  - Each directory gets a generated `index.md` that lists its pages and sub-directories. The top-level categories are linked from the API Reference page (`api.md`), which is rewritten on every run.
  - The CLI writes a root-level `generated.md` homepage stub; the generator deletes it because Pelican has its own home page.
- `pelicanconf.py` uses a relative menu link (`graphql/`) and `publishconf.py` uses the full `SITEURL` link, because the notmyidea theme prints `MENUITEMS` URLs verbatim.
- The theme does not load `CUSTOM_CSS`, so `theme-overrides/base.html` adds the `static/gqlmd.css` stylesheet to the head.

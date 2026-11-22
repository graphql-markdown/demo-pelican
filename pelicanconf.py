AUTHOR = "GraphQL-Markdown"
SITENAME = "GraphQL-Markdown Pelican Demo"
SITEURL = ""

PATH = "content"
PAGE_PATHS = ["pages"]
ARTICLE_PATHS = []
TIMEZONE = "UTC"
DEFAULT_LANG = "en"

PAGE_URL = "{slug}/"
PAGE_SAVE_AS = "{slug}/index.html"
DISPLAY_PAGES_ON_MENU = False

STATIC_PATHS = ["extra"]
EXTRA_PATH_METADATA = {"extra/gqlmd.css": {"path": "static/gqlmd.css"}}
THEME = "theme"
DIRECT_TEMPLATES = []
ARCHIVES_SAVE_AS = ""
TAGS_SAVE_AS = ""
CATEGORIES_SAVE_AS = ""
AUTHORS_SAVE_AS = ""
AUTHOR_SAVE_AS = ""
CATEGORY_SAVE_AS = ""
TAG_SAVE_AS = ""
YEAR_ARCHIVE_SAVE_AS = ""
MONTH_ARCHIVE_SAVE_AS = ""
DAY_ARCHIVE_SAVE_AS = ""


def nav_tree(pages):
    """Nest pages by their slug path; sorted by title."""
    root = {"children": {}}
    for page in pages:
        node = root
        parts = page.slug.split("/")
        for i, part in enumerate(parts):
            node = node["children"].setdefault(
                part, {"children": {}, "slug": "/".join(parts[: i + 1]), "page": None}
            )
        node["page"] = page

    def build(node):
        out = []
        for child in node["children"].values():
            page = child["page"]
            out.append(
                {
                    "title": page.title if page else child["slug"].split("/")[-1],
                    "slug": child["slug"],
                    "url": page.url if page else None,
                    "children": build(child),
                }
            )
        return sorted(out, key=lambda n: n["title"].lower())

    tree = build(root)
    # Home first, the rest sorted by title.
    return sorted(tree, key=lambda n: (n["slug"] != "home", n["title"].lower()))


JINJA_FILTERS = {"nav_tree": nav_tree}

MARKDOWN = {
    "extension_configs": {
        "markdown.extensions.admonition": {},
        "markdown.extensions.md_in_html": {},
        "markdown.extensions.toc": {},
        "markdown.extensions.extra": {},
        "markdown.extensions.codehilite": {"css_class": "highlight"},
    },
    "output_format": "html5",
}

FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None
RELATIVE_URLS = True

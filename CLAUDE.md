# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal portfolio site for Shivank (IB student in Singapore, aiming for medicine). It is the **exported static output of an Astro build** — plain `.html` at the root plus hashed CSS/JS in `assets/`. The Astro source (`.astro` files, `package.json`, `src/`) is **not** in this repo. There is no build step, no package manager, no tests, no lint config.

**You edit the compiled output directly, in place.** The hashes in filenames (e.g. `BaseLayout.B3tS9Wpl.css`) and the `data-astro-cid-*` attributes on elements are frozen build artifacts — nothing regenerates them. Treat the hash as just part of the filename; don't try to "rebuild."

## Running / previewing

No tooling. Open a page directly (`open index.html`) or serve the folder statically:

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

The nav and active-page logic key off the URL's filename (see `nav.js`), and both `file://` and a static server work.

## Architecture

### Pages
Ten top-level pages, each a standalone full HTML document: `index.html`, `projects.html`, `timeline.html`, `skills.html`, `awards.html`, `certifications.html`, `photography.html`, `books.html`, `interests.html`, `blog.html`. Content is **hardcoded in each page's markup** — there is no CMS or data file. Adding a book/photo/award = drop an image in the matching top-level folder (`books/`, `photography/`, `awards/`, `certifications/`, `projects/`) and add the markup by hand.

`blog/` is the one folder holding **pages** rather than images — one full HTML document per entry. It is the only place on the site where a page does not live at the root; see the note on `nav.js` below for what that costs.

### The navbar is the one shared, hand-maintained component: `assets/nav.js`
Unlike every other asset, `nav.js` is **not hashed** — it is authored by hand. Every page injects it with `<script src="assets/nav.js"></script>` at the point the nav should appear; the script writes its own markup via `insertAdjacentHTML`. To add, rename, or reorder a page in the nav, edit **`NAV_ORDER`** and **`NAV_HTML`** inside `nav.js` — every page picks it up automatically. `NAV_ORDER` must stay in sync with the actual `.html` filenames. The desktop "dial" capsule position and the active-link highlight are computed at load time from the current page's filename.

Two things to keep in step when adding a nav entry:
- The first-load icon cascade in `BaseLayout.*.css` has one `:nth-child(N)` `animation-delay` per item (`.09s` apart). Add one for the new item or it appears without animating.
- The capsule's glass backing layer is a childless sibling, so it can't size itself — `CAPSULE_HEIGHT` in `nav.js` derives its inline height from `NAV_ORDER.length`. Don't put a literal px value back.

**Pages outside the root** (only `blog/` today) must write their `<script src="../assets/nav.js">` relative to themselves. `nav.js` reads that `../` prefix back off its own `src` into `BASE` and prepends it to every link it emits, so one nav file serves both depths. `navFileFromPath()` maps anything under `blog/` onto `blog.html`, which is what keeps the Blog icon highlighted while reading a post.

### CSS
- `assets/BaseLayout.B3tS9Wpl.css` is the **global** stylesheet loaded on every page. It defines the design tokens in `:root` (see below), plus nav, footer, and scroll-fade styles.
- Other `assets/*.css` are **per-page** and hashed (e.g. `projects.CxYbYLL6.css`, `index.B-V-lkgg.css`). A page only loads the ones its `<head>` links. Some pages inline their scoped CSS in a `<head>` `<style>` block instead of linking a file — same thing, just small enough that Astro inlined it.
- `assets/blog.css` is the exception: unhashed and **hand-authored**, like `nav.js`. It's shared by `blog.html` and every post under `blog/`, and its selectors carry no `data-astro-cid-*` because nothing scoped them.
- Styles are scoped to elements via matching `data-astro-cid-*` attributes (an Astro build artifact). If you add markup that needs existing scoped styles, copy the relevant `data-astro-cid-*` attribute from a sibling element — without it, scoped rules won't apply.

### Design tokens (defined in `:root`, `BaseLayout.*.css`)
Prefer these over hardcoded values:
- Colors: `--bg` / `--bg-subtle` / `--bg-hover` (warm cream), `--fg` / `--fg-muted` / `--fg-subtle`, `--accent-primary` (#6D4AE0 violet), `--accent-secondary` (#D9A521 gold). Featured items use gold, regular items use violet.
- Fonts: `--font-display` (Nunito, headings), `--font-body` (Nunito Sans), `--font-meta` (Inter, small labels/tags/dates). Loaded from Google Fonts in each page's `<head>`.
- Motion: `--ease-out`, `--duration-*`, and the `--reel-*` tokens driving the page-to-page transition. Layout: `--site-max`, `--site-padding`, `--nav-*`.

### Projects data
`index.html` and `projects.html` each embed an inline `projectsData` JS array — the single source of truth for the project cards and the click-to-expand panel. Each entry has `slug`, `name`, `type`, `month`/`year`, `featured`, `mode` (`cinematic`/`calm`), `repo`, `demo`. Notes:
- Tech pills in the expand panel are derived by splitting `type` on `" · "` — don't maintain a separate pill list.
- The homepage's featured cards reference entries by `data-index` into this array; keep those indices consistent if you reorder.
- `repo`/`demo` default to `null`, which renders as a disabled "to add" link placeholder.

### Blog entries
`blog.html` is the index; each entry is a full HTML page in `blog/`, named after its slug. There is no feed file and nothing is generated at request time — **the excerpt on the index is a hand-copied duplicate of the post's own `.post-lede` paragraph**, so if you reword one, reword the other.

To add an entry:
1. Copy an existing page in `blog/` and replace the `<title>`, the `<meta name="description">`, the `<time datetime>`/date text, the `<h1 class="post-page-title">`, and the body paragraphs.
2. Add a matching `<li class="post-row">` at the **top** of the `.post-list` in `blog.html` — the index runs newest-first.
3. Keep every path in a post page prefixed with `../` (stylesheets, `nav.js`, the back link). That prefix is also how `nav.js` learns it's a folder deep — see the navbar section above.

`.stagger-children` on the index only has fade delays for the first five children; a sixth entry onward still fades in, just without its own offset.

### Navigation is full-page loads, not SPA
The comment `<ClientRouter /> intentionally removed` in the page heads is deliberate. The View Transitions CSS and `astro:page-load` / `astro:before-preparation` listeners are baked into the output, but **without the router each navigation is a real full page load**. Each page re-runs its own inline scripts on load; the `astro:page-load` handlers are effectively dormant. Don't rely on client-side routing or persisted state between pages.

## Gotchas

- **`* 2.*` files are junk.** ~38 files/folders carry a `" 2"` suffix (e.g. `projects/globetrek 2.png`, `awards/academics 2/`) — macOS/sync duplication artifacts. They are **not referenced** by any HTML, and some folders have restricted permissions. Ignore them; never edit them thinking they're the live asset. The referenced version is the one without the `" 2"` suffix.
- No `.gitignore`, and no build/deploy tooling (no netlify/vercel) — the repo IS the deployable artifact, served as-is.
- **Pushing to `main` publishes.** GitHub Pages serves this repo at **https://shivankchawla.com** (custom domain via the tracked `CNAME` file). There is no staging step and no PR gate: a push to `main` is a production deploy, and it lands roughly a minute later. Preview locally with the http server above before pushing.

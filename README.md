# Andrew Hess — personal site

Plain HTML, CSS, and vanilla JS. **No build step, no dependencies, no CMS.**
Deploys as-is to Cloudflare Pages, Netlify, GitHub Pages, or any static host.

## Structure

```
_my-site/
├── index.html          Home — bio, focus areas, positioning, featured videos
├── videos.html         Curated, categorized video library
├── work.html           Project highlights
├── contact.html        LinkedIn / YouTube / email
├── robots.txt
├── assets/
│   ├── css/styles.css  All styling + design tokens (dark & light themes)
│   └── js/
│       ├── site.js     Theme toggle, active nav, footer year
│       ├── videos.js   Renders the video library from data/videos.json
│       └── projects.js Renders project highlights from data/projects.json
└── data/
    ├── videos.json     ← edit this to add/reorder/hide videos
    └── projects.json   ← edit this to add/reorder/hide projects
```

## Before going live — update these 3 things

One **placeholder** remains — find-and-replace in `contact.html`:

| Placeholder | Replace with |
|---|---|
| `andrew@example.com` | your real contact email |

LinkedIn (`/in/andrewhess123/`) and YouTube (`@andrewhess123`) are already set.

## Adding a video

Edit `data/videos.json` — no code changes needed.

```json
{
  "title": "Creating Advanced SKILL.md Files",
  "youtubeUrl": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "category": "copilot-studio",
  "description": "One line of framing, in your voice.",
  "featured": true,
  "published": true
}
```

| Field | Purpose |
|---|---|
| `title` | Displayed heading |
| `youtubeUrl` | Full YouTube URL. Supports `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`. Leave `""` to show a "Link coming soon" placeholder card. |
| `category` | Must match a `categories[].id` |
| `description` | One-line framing shown under the title |
| `featured` | `true` pins it into the **Start Here** section (home shows 3, videos page shows 5) |
| `published` | `false` hides it from the site without deleting the entry |

**Ordering** is simply the order of entries in the array, within each category.
**Category order** on the page follows the order of the `categories` array.

To add a new category, append to `categories`:

```json
{ "id": "security", "name": "Security & Governance", "blurb": "Optional one-liner." }
```

## Adding a project

Same idea in `data/projects.json` — `title`, `summary`, `tags[]`, `published`.

## Notes on the video page

Thumbnails are **linked images** (`i.ytimg.com`), not embedded iframes. This keeps
pages fast, avoids loading YouTube's player on every visit, and means no tracking
scripts run until a visitor actually clicks through to YouTube.

## Local preview

The data files are loaded with `fetch()`, which browsers block on `file://`.
Run any static server from the `_my-site` folder:

```powershell
python -m http.server 8080
# then open http://localhost:8080
```

or

```powershell
npx serve .
```

## Deploying

**Cloudflare Pages / Netlify** — connect the repo and set:

- Build command: *(leave empty)*
- Output/publish directory: `_my-site` (or `/` if this folder is the repo root)

No framework preset, no Node version, nothing to install.

## Design

Dark-first with a light theme, toggled in the header and remembered in
`localStorage`; falls back to the OS `prefers-color-scheme` setting. All colors
are CSS custom properties at the top of `styles.css` — change `--accent` to
re-skin the site.

Animation is intentionally limited to short hover transitions. There are no
looping animations, no full-screen blend layers, and no animated filters, so the
page costs effectively nothing to leave open.

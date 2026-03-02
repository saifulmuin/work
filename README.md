# YouTube Gallery (GitHub Pages) — v2

## Landing
- `index.html` (root) = landing page gallery
- baca `data.json`

## Sections (Row by Category)
- setiap section ialah satu row, mengikut `sections[]`
- susunan row = `sections[].order`
- item dipadankan melalui `items[].category`

## Popup
- bila play, popup ada:
  - player
  - description
  - extra links

## Admin URL
- admin page: `/0124528810/` (folder `0124528810/index.html`)
- di admin boleh:
  - tambah/edit/delete sections + susun order (↑ ↓)
  - tambah/edit/delete items
  - export/import `data.json`

## Visit counter
- yang dipaparkan di admin adalah **local-only** (kira dari device/browser anda).
- untuk “real visitor counter” semua orang, perlu analytics (GA/Plausible) atau backend.

## GitHub Pages setting
Settings → Pages:
- Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

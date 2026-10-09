# HS2 Queen’s Park map — Webador caption-linked photographs

This build retains the existing Google Sheet, manual pinpoints, Damage field, address selection and the link to the shared Webador photo album.

## Set up photographs

1. In Webador, caption each image starting with the **exact house number and street**, followed by a description, e.g. `23 Parry Road – Front elevation`.
2. Fill `photo-index.csv` with **Caption** and **Image URL** columns. Each Image URL must be a direct public HTTPS image address (e.g. .jpg/.webp or an image CDN endpoint), **not** the Webador gallery page URL. Use `photo-index-example.csv` only as an illustration: its example.com links are placeholders and will not show real images.
3. Upload `photo-index.csv` together with `index.html`, `app.js`, `styles.css`, `config.js`, and `hs2-route.geojson` to the same GitHub Pages directory.
4. Refresh the map. It loads the index automatically. Select a property to see only matching photos in its popup. Click a thumbnail to open the original image in a new tab.
5. You can test an index first using **Preview a photo index CSV** in the sidebar. This does not publish the index.

**Limitations:** Webador page captions cannot be reliably read cross-origin from a GitHub Pages site. I could not verify Webador's public page HTML in this environment, so this build **does not automatically scrape or synchronise** Webador albums. The CSV index must be updated when photos are added or captions change. The original Webador album link remains available in each popup. Photo caption matching is based on the address prefix and common description terms. Check matches before publishing. The HS2 tunnel route is still provisional; distances are not official.

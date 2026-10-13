# HS2 Map — Queen’s Park and neighbouring London wards

**Project documentation and feature guide**  
**Updated:** 13 October 2026  
**Hosting:** GitHub Pages, with a public-facing embed on the Queen’s Park Trust Webador website.

## 1. Purpose and important limitations

This interactive map presents properties where new cracks and/or subsidence have been reported as potentially associated with HS2 construction, alongside properties recorded without reported damage. It provides geographical context using indicative tunnel alignments, estimated property-to-tunnel distances, electoral ward boundaries and safeguarding overlays.

**The map does not establish that HS2 caused any reported damage.** A property marked as having reported damage is not a verified HS2 damage claim. A property marked “unaffected” means no cracks/damage were reported in the dataset; it does not guarantee that the property has no defects. Tunnel-distance estimates are indicative horizontal measurements, not surveyed building-to-tunnel clearances, and do not determine legal eligibility or compensation.

## 2. Website versions

- **GitHub Pages:** `https://raylancashire.github.io/HS2-map/` — standalone map and maintenance controls.
- **Webador display:** `https://raylancashire.github.io/HS2-map/?display=1` — public presentation mode, suitable for an iframe on Webador.
- **Search engines:** `index.html` contains a `robots` meta instruction requesting `noindex, nofollow` for the GitHub Pages document. This is a request to compliant crawlers, **not** access control, and does not control indexing of the separate Webador page.

GitHub Pages hosts the files; Webador embeds the published site. The map also depends on external services for Google Sheet data, map tiles, geocoding and some geographical boundaries.

## 3. Main map features

### Interactive basemap

- Leaflet map with zoom, Home/recentre and map-layer selection controls.
- OpenStreetMap street mapping and alternative imagery/background layers, subject to third-party availability.
- Clickable property markers and map overlays; selectable layer visibility.

### Property records

- Property list loaded from a configured Google Sheet (`config.js`).
- Search by address, postcode or ID; property status and proximity filters.
- Street-grouped address list and property details on selection.
- Recorded damage descriptions and notes, where supplied.
- Optional property photographs using `photo-index.csv` and links to the Webador photograph album.
- Marker colours show estimated distance bands: **0–15 m**, **15–30 m**, **30–60 m**, **60–100 m**, **100+ m**, and **unknown**.
- Marker borders distinguish records with and without reported damage; marker colour itself is **not** a damage-causation indicator.

### HS2 alignments and safeguarding

- Selectable HS2 tunnel reference routes, including a published 2013 alignment and twin tunnel centreline data.
- Indicative tunnel corridor and optional legacy/unverified route polygon.
- HS2 2019 safeguarding layers: subsurface, surface and safeguarding limits.
- Route source selection influences indicative proximity calculations; these should not be treated as engineering or legal measurements.
- Maintenance tools for route editing and version comparison are included in the repository.

## 4. Electoral ward boundaries

The **Other Ward Boundaries** controls support wards in:

- Westminster
- Brent
- Royal Borough of Kensington and Chelsea (RBKC)
- Hammersmith & Fulham
- Camden

Queen’s Park is the primary ward and uses an official ONS boundary where available, with a local GeoJSON fallback. Other wards can be suggested by geographical intersection with the reference tunnel alignment or proximity of approximately 250 m. **Show all wards** allows access to more distant wards. The suggested list is geographical only; it is not a list of affected wards.

### Ward selection and highlighting

- Add or remove individual ward boundaries; zoom to a ward.
- Hover or focus a ward name to preview its area and label.
- Tap or click a ward name to keep its highlight and map label visible.
- Tap or click further wards to retain multiple highlights; tap a selected ward again to remove its highlight.
- **Clear highlights** removes persistent highlighting without removing the boundary layers.
- Dropdown entries for highlighted wards are marked **“(highlighted)”** rather than relying on font styles that may render inconsistently in Safari/iPadOS.
- Boundary colours distinguish boroughs; labels identify wards on the map.

## 5. Property analysis dashboard

The collapsible **Property proximity & reported damage analysis** section appears below the map and includes:

- Live summary statistics for loaded records.
- Distribution by estimated distance from the selected alignment.
- Reported damage breakdown.
- Street-by-street comparison and drill-down to individual properties.
- CSV export of the analysis.

The dashboard describes the **properties included in the Google Sheet**, not every dwelling on each street or in each ward. Results depend on data quality, geocoding and the selected route source. Street names are retained as entered; possible spelling variants should be reviewed rather than silently merged.

## 6. Important Information notice

A notice above the map explains that the records concern reported new cracks and/or subsidence that **may potentially** be associated with HS2, but do not prove causation. Visitors can select the close (×) control and are asked to confirm that they have read and understood the notice before it closes. The notice reappears on page reload.

This acknowledgement is an interface confirmation, not a legal consent process or proof that a visitor understood the content.

## 7. Maintenance and editing

The standalone GitHub view includes maintenance functionality that is hidden in public Webador presentation mode:

- Manual property pinpoint editor: choose or create a property, correct its position, and enter address/notes/damage information.
- Local browser storage for edited pinpoints, with CSV export for preservation or transfer to the Google Sheet.
- Route and ward editing tools, with supporting route files and saved route versions.
- Published opening preferences in `public-settings.json`, including map centre, zoom, selected route source and default visible layers.

**Important:** Hiding maintenance controls with `?display=1` is presentation behaviour, **not security**. GitHub-hosted static files and public data remain accessible to anyone who knows the URLs. Local pinpoint changes are not automatically published to other visitors.

## 8. Data and files

| File | Role |
|---|---|
| `index.html` | Page structure, notice, map and dashboard containers; public display-mode flag; robots instruction. |
| `styles.css` | Layout, map/sidebar styling, ward highlighting, notice and responsive display. |
| `app.js` | Core map, property loading, layers, ward controls and interactions. |
| `config.js` | Google Sheet configuration, geocoder and photo-album URL. |
| `property-analysis.js` | Statistics, street comparison and analysis export. |
| `ward-editor.js` | Queen’s Park ward-boundary editing. |
| `route-editor.js`, `route-versions.js`, `twin-route-overlay.js` | Route maintenance, saved versions and route overlays. |
| `public-settings.json` | Default published map opening settings. |
| `photo-index.csv` | Photograph caption-to-image-URL mapping. |
| `queens-park-ward.geojson` | Local ward-boundary fallback. |
| `hs2_*.geojson`, `hs2-*.geojson`, `routes.json` | Tunnel, route, safeguarding and supporting geographical data. |

The repository also includes a reference image (`hs2-official-pc-01-004.jpg`). Keep all paths and filenames unchanged unless the code references are updated accordingly.

## 9. Photograph indexing

1. Caption each photograph in Webador starting with the property's exact number and street name.
2. Maintain `photo-index.csv` with **Caption** and **Image URL** columns; use publicly accessible direct HTTPS image URLs.
3. Upload the updated CSV to GitHub alongside the map files.
4. Select a property on the map to view matching photographs, when available.

The map does **not** automatically scrape or synchronise Webador photo albums. Check matches manually when captions or images change.

## 10. Updating and publishing

1. Back up the working repository or create a Git commit before making changes.
2. Replace **only the files changed** by an update, preserving all other files.
3. Commit changes to the branch/folder configured in GitHub Pages settings.
4. Wait for GitHub Pages to deploy, then refresh the standalone map and Webador embed.
5. Check the browser console if map layers or property data fail to load.

### Suggested regression checklist

- [ ] GitHub Pages loads with the Important Information notice.
- [ ] The notice closes only after confirmation and returns on reload.
- [ ] The Webador `?display=1` view works and hides maintenance controls.
- [ ] Google Sheet properties load; search and filters work.
- [ ] Property markers, popups and photographs behave correctly.
- [ ] Tunnel alignment and safeguarding overlays load.
- [ ] Queen’s Park official boundary displays correctly.
- [ ] Ward dropdown lists all five boroughs and allows selecting individual wards.
- [ ] Ward hover preview, persistent multi-selection, dropdown indicators and Clear highlights work.
- [ ] Touch interactions work on iPad/Safari.
- [ ] Property analysis and CSV export work.
- [ ] Published opening preferences are applied correctly.

## 11. Privacy, accuracy and publication

- Do not publish personal contact details, private correspondence or sensitive information in public property records or photograph captions.
- Verify coordinates and photo matches before publication.
- Identify the date and source of any official route or boundary dataset; published boundaries can change.
- Clearly distinguish **reported damage**, **estimated proximity** and **verified causation**.
- `noindex` does not make a site private, and search engines may take time to respect it.

## 12. Known constraints and verification status

This README describes the features present in the **latest supplied project ZIP** (`HS2-map-dropdown-style-fix.zip`) and the intended operation of those controls. JavaScript syntax checks performed during earlier updates are **not** a substitute for live browser testing. In particular, third-party ward-boundary availability, exact alignment intersections, iPad/Safari dropdown presentation and live Webador embedding should be checked after deployment.

---

**Project:** HS2 Map — Queen’s Park and neighbouring London wards  
**Documentation version:** 1.0 — 13 October 2026

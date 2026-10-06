# HS2 Queen's Park Property Map

Interactive Leaflet map showing the HS2 Euston Tunnel through Queen's Park and properties maintained in a Google Spreadsheet.

## Normal workflow

1. Edit the configured Google Sheet.
2. Add/remove/change property rows.
3. Reload the map (or click **Reload Google Sheet**).
4. The latest rows are fetched automatically. No GitHub update is needed for routine property changes.

## Google Sheet

The Sheet ID is stored in `config.js`. If the property list moves to a different spreadsheet, change only `spreadsheetId` (and `sheetGid` if needed).

Expected columns: `id,address,postcode,latitude,longitude,notes`. Address, latitude and longitude are currently required. Common header variants are accepted.

## HS2 route layer

`hs2-route.geojson` contains the Queen's Park reference alignment. It was manually digitised as a map reference from the official HS2 Phase One **Queen's Park and Maida Vale – Safeguarding and Property Schemes Zone Maps**, document PH1-HS2-LP-MAP-000-000184, dated 07/10/2024. It is not survey-grade geometry.

The app creates a 30 m visual screening buffer with Turf.js and calculates approximate point-to-line distance for each property. HS2 states settlement-deed eligibility relates to properties within 30 metres of relevant excavations; properties beyond 30 m remain protected for HS2-caused damage under the Act. Therefore this website must not describe its calculated result as an official eligibility decision.

## Files

- `index.html` – page and controls
- `styles.css` – presentation
- `config.js` – Google Sheet configuration
- `app.js` – Sheet loading, map layers, filtering and distance calculations
- `hs2-route.geojson` – HS2 Queen's Park reference alignment
- `houses-template.csv` – optional local CSV template

## GitHub Pages

Upload all files in this folder to the same directory in the GitHub Pages repository. After that, routine changes to the property list are made in Google Sheets, not GitHub.

# HS2 Queen's Park property map — official PC-01-004 calibration build

This build deliberately removes the earlier hand-drawn tunnel GeoJSON.

## What changed
- Uses the user-supplied official HS2 Property Schemes map PC-01-004 (June 2019) as a semi-transparent Leaflet overlay.
- The source map itself shows **Route in tunnel**, **Limits of Land Subject to Safeguarding Direction**, and **Safeguarded Area: Sub-surface**.
- Google Sheet property loading and address geocoding are retained.
- Property-to-tunnel distances are temporarily disabled so the app does not present another inaccurate hand-built alignment.
- The official overlay can be toggled with the layer checkbox.

## Why this build
The previous route files were reconstructed from screenshots and were repeatedly too far north. This version makes the official HS2 map the visual reference inside the app before a final vector trace is created.

## Google Sheet
Configured in `config.js`. Expected columns: `ID`, `Address`, `Postcode`, `Notes`; latitude/longitude remain optional.

## Source
HS2 Phase One Property Schemes map PC-01-004, document 1LR02-WSP-LP-MAP-C000-100003, June 2019. Scale 1:2,500 at A1 / 1:5,000 at A3.

## Important
The raster overlay is for calibration/reference and is not a substitute for legal advice or survey-grade HS2 data.


## HS2 property Google Sheet
The app is configured to read the first worksheet (gid 0) of spreadsheet `123LEvGRnlSI9qBPPfcd0Yp2dFW7awVb3Cfi1oGuACrU`. Expected columns: `ID`, `Address`, `Postcode`, `Notes`. Latitude/longitude are not required; missing coordinates are geocoded and cached in the browser.


## 2026-10-06 display fix
- Street map is now the default visible map.
- Official HS2 plan overlay is off by default so it cannot cover the base tiles.
- Status filter is forced to All properties at startup, avoiding Safari restoring an old filter.
- Properties remain loaded live from the configured Google Sheet.

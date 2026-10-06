# Corrected Queen’s Park tunnel-route version

This version replaces the earlier approximate railway-corridor alignment. The route is digitised from the black/white dashed Euston Tunnel line on the supplied official HS2 Queen’s Park plan and follows the Kilburn Lane corridor south of Queen’s Park Station. It is a reference trace, not survey-grade geometry.

The Google Sheet remains the live property source: edit the Sheet to add/remove properties without editing GitHub. Address and Postcode are sufficient; Latitude/Longitude remain optional.

---

# HS2 Queen's Park Property Map

Interactive Leaflet map showing the HS2 Euston Tunnel through Queen's Park and properties maintained in a Google Spreadsheet.

## Normal workflow

1. Edit the configured Google Sheet.
2. Add, remove or change an address.
3. Reload the map (or click **Reload Google Sheet**).
4. The latest rows are fetched automatically. No GitHub update is needed for routine property changes.

## Google Sheet columns

Only **Address** is required. **Postcode** is strongly recommended because it makes address matching much more reliable.

Suggested columns:

`id,address,postcode,notes`

`latitude` and `longitude` are optional. If supplied, the map uses them immediately. If they are blank or absent, the map looks up the address and caches the successful result in that browser so it does not repeatedly look up the same address during later visits from that browser.

If an address cannot be found, it is shown under **addresses could not be located**. Correct the address/postcode in Google Sheets and reload the Sheet.

## Google Sheet location

The Sheet ID is stored in `config.js`. If the property list moves to a different spreadsheet, change only `spreadsheetId` (and `sheetGid` if needed).

## Address lookup and usage

The prototype uses the public OpenStreetMap Nominatim geocoder and deliberately processes missing addresses sequentially at no more than one request per second. Results are cached locally. This is suitable for testing/small-scale use, not a large public bulk-geocoding service. For a larger public deployment, use a dedicated geocoding provider or pre-geocode the master list and store coordinates once.

The geocoder URL is isolated in `config.js` so the provider can be changed later without rewriting the map.

## HS2 route layer

`hs2-route.geojson` contains the Queen's Park reference alignment. It was manually digitised as a map reference from the official HS2 Phase One **Queen's Park and Maida Vale – Safeguarding and Property Schemes Zone Maps**, document PH1-HS2-LP-MAP-000-000184, dated 07/10/2024. It is not survey-grade geometry.

The app creates a 30 m visual screening buffer with Turf.js and calculates approximate point-to-line distance for each located property. This website must not describe its calculated result as an official settlement-deed eligibility decision.

## Files

- `index.html` – page and controls
- `styles.css` – presentation
- `config.js` – Google Sheet and geocoder configuration
- `app.js` – Sheet loading, address lookup, map layers, filtering and distance calculations
- `hs2-route.geojson` – HS2 Queen's Park reference alignment
- `houses-template.csv` – optional address-only local CSV template

## GitHub Pages

Upload all files in this folder to the same directory in the GitHub Pages repository. After that, routine changes to the property list are made in Google Sheets, not GitHub.


## Route correction – Queen’s Park railway corridor
The route layer was revised after checking the official HS2 Queen’s Park and Maida Vale Safeguarding and Property Schemes Zone Map (PH1-HS2-LP-MAP-000-000184, 07/10/2024), particularly page 2 of 3 at 1:7,500. The AP04 alignment through Queen’s Park runs diagonally along/beneath the existing railway corridor, through the Queen’s Park station area and towards Kilburn High Road.

`hs2-route.geojson` is a digitised public-reference trace of that published alignment, not engineering survey geometry. Property distances and the 30 m overlay remain screening aids only.


## Queen’s Park tunnel alignment correction (October 2026)
The Queen’s Park trace was revised after comparison with the official HS2 mapping and the Department for Transport’s February 2026 description of the Euston tunnels. The reference centreline now curves north-east beneath Kensal Green Cemetery, converges on the West Coast Main Line corridor and broadly follows that corridor through Queen’s Park toward Kilburn. The map draws two narrow bore lines around this reference centreline. Their displayed separation is cartographic and must not be treated as engineering or survey geometry. Property distances and the 30 m layer are screening aids only.


## Route display refinement (6 October 2026)

The route layer now keeps the digitised AP04 reference alignment visible as a thin red dashed line, matching the visual convention used for checking the route against the Queen's Park reference screenshot/source mapping. The two blue bore lines are deliberately thin and semi-transparent and are indicative only. The 30 m overlay remains a screening aid. No numbered route-reference markers are used.


## Route registration note
The Queen’s Park route layer was revised against HS2's 2024 Queen’s Park and Maida Vale safeguarding/property map (PH1-HS2-LP-MAP-000-000184, page 2 of 3, scale 1:7,500). On that official map the solid blue line is the Phase One (AP04) alignment; the red dash-dot lines are the limits of land subject to safeguarding direction. The GeoJSON is a digitised public-reference trace and must not be treated as survey-grade engineering geometry or as a legal property-eligibility boundary.


## October 2026 route correction
The route layer now represents the **grey dotted bored-tunnel line identified on the user-supplied HS2/OSM map**, not the red dashed overlay and not the existing railway. HS2 mapping conventions were cross-checked against official HS2 material, where bored tunnels are represented with dashed grey/black tunnel symbology depending on the map series. The route remains a screening/reference trace rather than survey or legal geometry.


## 6 October 2026 – straight tunnel trace correction

The tunnel reference geometry was replaced with a grey dotted line following the grey dotted tunnel feature identified in the supplied close-up map. The previous road-following/bent geometry is superseded. Property distances and the 30 m screening buffer are now calculated from this straight reference line. This remains a visual screening trace, not survey-grade or legal HS2 geometry.

## Route correction – two grey dotted tunnel lines
The route layer now contains **two separate grey dotted tunnel traces**. The eastern trace has been positioned so that the second line passes beneath the Kilburn Lane / Salusbury Road (Premier Corner) junction, as shown in the supplied close-up reference. Property distance is calculated to the **nearest** of the two traced tunnel lines. These remain reference/screening traces and are not survey/legal geometry.

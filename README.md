# HS2 Queen's Park Property Map – prototype

Interactive Leaflet prototype for displaying a custom list of Queen's Park properties against a provisional HS2 tunnel alignment.

## Google Sheet property source

The map is configured to load this spreadsheet by default:

`1DwvQihenTk0z14eVZLwVDFgeO40ghdVA3ojwnQL6ZtY`

The spreadsheet location is stored in **config.js**. If the property list moves later, change only `spreadsheetId` (and `sheetGid` if needed).

The worksheet must be publicly readable/published so the GitHub Pages site can retrieve its CSV export without signing in.

### Supported columns

Required at present:
- Address
- Latitude (or Lat)
- Longitude (or Lng/Lon/Long)

Optional:
- ID / Property ID / Ref
- Postcode
- Notes / Comments

Header matching is case-insensitive and accepts spaces, underscores and hyphens.

## Fallbacks

- **Reload Google Sheet** refreshes the live property list.
- **Import CSV instead** loads a local CSV for the current browser session.
- **Use 20 sample properties** restores the illustrative test records.
- If the Google Sheet cannot be loaded, the map automatically shows the 20 samples and reports the error.

## Important

The current HS2 tunnel line and visual 30 m corridor are PROVISIONAL prototype geometry only. They must be replaced with verified official HS2 geometry before the map is used to assess real properties or settlement-deed eligibility.

## Files

- `index.html` – page and controls
- `styles.css` – presentation
- `app.js` – Leaflet, Sheet/CSV loading, filters and distance calculations
- `config.js` – replaceable Google Sheet configuration
- `houses-template.csv` – manual CSV example

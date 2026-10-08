# HS2 Queen’s Park map – source-plan trace calibration

This build removes the previous manually inferred twin-bore dotted lines.

The tunnel layer is now a **single route-in-tunnel trace**, matching the dashed route symbol visible in the supplied Queen’s Park HS2 plan extract. The live Google Sheet property workflow and OpenStreetMap basemap are unchanged.

The tunnel trace remains a reference/screening layer, not a survey or legal boundary. The safeguarded-area layer is separate.


## Property details and photos
Click a property marker to open a popup showing address, postcode, property ID, coordinates, provisional tunnel distance, notes and associated photos. The same information appears in the Selected property sidebar.

The existing Google Sheet works unchanged. To add photos, add an optional `Photos` column to the sheet. Put one or more publicly accessible, direct HTTPS image URLs in each cell, separated with `|` (vertical bar). Links to private Google Drive pages will not display as images; the URL must return an actual image and permit embedding. If none are supplied, the popup says no photographs are linked. No photographs are fabricated or fetched automatically.

The tunnel geometry in `hs2-route.geojson` remains unverified; distances and distance-based marker colours are provisional.

## Combined Webador photo album

Every property popup and Selected property panel now links to the published combined album: https://www.queensparktrust.org/hs2-property-photographs . Change `propertyPhotoAlbumUrl` in `config.js` if the album moves. The link opens the full album, not an address-filtered view. Optional per-property `Photos` image URLs continue to work independently. No edits to the Google Sheet are required for the album link.

# HS2 Queen’s Park — Manual Pinpoint Editor

Upload all files in this folder to the GitHub Pages repository root.

## Add a pinpoint
1. Select **+ New property** or an existing address under **Manual pinpoint editor**.
2. Enter/edit the address and optional postcode/notes.
3. Click **Place pinpoint on map**, then click the correct building on the map.
4. Drag the temporary pin if needed; click **Save pinpoint locally**.
5. Click **Download property pinpoints CSV** to preserve the results.

Manual pinpoints are saved in this browser's localStorage, NOT directly in the Google Sheet. They will not automatically appear for other visitors or on other devices. To publish the coordinates, add the `Latitude` and `Longitude` columns from the exported CSV to your existing Google Sheet (match by ID/address). The map will then use those coordinates directly. You can also use **Import CSV instead** to preview an exported CSV.

Existing Google Sheet ID and Webador photo album link are unchanged. The tunnel alignment, 30 m corridor and distances remain provisional and are not official eligibility boundaries.

**Privacy:** Anyone with access to a published property spreadsheet/map can view the listed property locations. Avoid uploading private information.

## Safari CSV download fix
CSV export now uses a data URL rather than a blob URL, avoiding the observed Safari WebKitBlobResource error. A visible Copy CSV backup is provided below the download button. If Safari opens the CSV as a page, use the Copy CSV backup and save as UTF-8 `.csv`. Existing saved local pinpoints are not cleared by the update when deployed at the same origin.

## Editing an existing street name
Select an existing property or click its **Edit location on map** button. Change the **Address** text and click **Save address / street name**. You do not need to move the pinpoint. The edit persists locally across Google Sheet reloads by matching property ID, and the exported CSV includes the revised street name. To publish it for everyone, also update the master Google Sheet. If the sheet has duplicate IDs, give each property a unique ID.

## Selecting an address
Click an address in the Loaded Addresses list or choose a property in the Pinpoint Editor. The map now moves to the saved coordinates at building-level zoom and opens a popup. Unlocated properties are not assigned invented coordinates.

window.HS2_MAP_CONFIG = {
  // Change only this ID if the property list moves to another Google Spreadsheet.
  spreadsheetId: '123LEvGRnlSI9qBPPfcd0Yp2dFW7awVb3Cfi1oGuACrU',
  // 0 = first worksheet. If you later need another tab, replace with its numeric gid.
  sheetGid: '0',
  useGoogleSheet: true,

  // Address lookup. Kept here so the provider can be changed without editing app.js.
  geocoderUrl: 'https://nominatim.openstreetmap.org/search',
  geocodeDelayMs: 1100,
  propertyPhotoAlbumUrl: 'https://www.queensparktrust.org/hs2-property-photographs'
};

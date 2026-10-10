const map=L.map('map',{zoomControl:true}).setView([51.5340,-0.2050],15);

// OpenStreetMap standard raster tiles. OSMF now specifies this exact host
// (without a/b/c subdomains) and requires normal browser referrer behaviour.
const osmTiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; OpenStreetMap contributors',
  crossOrigin:false,
  referrerPolicy:'strict-origin-when-cross-origin'
}).addTo(map);

let tileErrors=0;
osmTiles.on('tileerror',()=>{
  tileErrors++;
  if(tileErrors===4){
    const el=document.querySelector('#mapNotice');
    if(el){el.hidden=false;el.textContent='The street-map tiles are being blocked by the browser/network. Property markers are still available.';}
  }
});
osmTiles.on('load',()=>{
  const el=document.querySelector('#mapNotice');
  if(el)el.hidden=true;
});

const cfg=window.HS2_MAP_CONFIG||{};
let routeFeature=null, routeLines=[];
let tunnelLayer=L.layerGroup().addTo(map);
let zoneLayer=L.layerGroup();
let corridorLayer=L.layerGroup().addTo(map);
const markerLayer=L.layerGroup().addTo(map);
// ONS December 2024 generalised electoral ward boundary.
const wardBoundaryLayer=L.geoJSON(null,{
  style:{color:'#763aa5',weight:3,opacity:1,fillColor:'#aa82c9',fillOpacity:.05},
  onEachFeature:(feature,layer)=>layer.bindPopup('<strong>Queen’s Park Ward</strong><br>City of Westminster<br>ONS December 2024 electoral ward boundary')
}).addTo(map);
async function loadWardBoundary(){
  const status=document.querySelector('#wardStatus');
  const endpoint='https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Wards_December_2024_Boundaries_UK_BGC/FeatureServer/0/query';
  const params=new URLSearchParams({where:"WD24NM = 'Queen’s Park' OR WD24NM = 'Queen's Park'",outFields:'*',returnGeometry:'true',outSR:'4326',f:'geojson'});
  // Prefer a repository-hosted copy, if provided later, then the official ONS service.
  for(const url of ['queens-park-ward.geojson',endpoint+'?'+params.toString()]){
    try{
      const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      const features=(data.features||[]).filter(f=>{
        const a=f.properties||{};
        const name=String(a.WD24NM||a.WD24NM_EN||a.name||'').toLowerCase().replace(/[’]/g,"'");
        const district=String(a.LAD24NM||a.LAD24NM_EN||a.lad_name||'').toLowerCase();
        return name==="queen's park" && (!district||district.includes('westminster'));
      });
      if(!features.length)throw Error('Queen’s Park, Westminster not found in dataset');
      wardBoundaryLayer.clearLayers();wardBoundaryLayer.addData({type:'FeatureCollection',features});
      status.textContent='ONS December 2024 ward boundary loaded';
      return;
    }catch(err){status.textContent='Ward boundary: '+err.message;}
  }
  status.textContent='Ward boundary unavailable. Check connection or add queens-park-ward.geojson to the repository.';
}
document.querySelector('#showWardBoundary').addEventListener('change',e=>e.target.checked?wardBoundaryLayer.addTo(map):map.removeLayer(wardBoundaryLayer));
document.querySelector('#zoomWard').addEventListener('click',()=>{const b=wardBoundaryLayer.getBounds();if(b.isValid())map.fitBounds(b.pad(.08));});
loadWardBoundary();

let properties=[];
let photoIndex=[];

let placingPin=false, draftPin=null;
const MANUAL_KEY="hs2qp:manual-pinpoints:v1";



function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toXY(lat,lon,refLat){const R=6371000,rad=Math.PI/180;return {x:lon*rad*R*Math.cos(refLat*rad),y:lat*rad*R}}
function pointSegDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;let t=den?((p.x-a.x)*dx+(p.y-a.y)*dy)/den:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))}
function tunnelDistance(lat,lon){if(!routeLines.length)return NaN;const ref=lat,p=toXY(lat,lon,ref);let d=Infinity;routeLines.forEach(line=>{for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1];d=Math.min(d,pointSegDist(p,toXY(a[0],a[1],ref),toXY(b[0],b[1],ref)))}});return d}
function classify(d){return !Number.isFinite(d)?'unknown':d<=15?'d0':d<=30?'d15':d<=60?'d30':d<=100?'d60':'d100'}
// A blank damage field is not evidence that a property is unaffected.
function isUnaffected(p){
 return /^(?:unaffected|non[ -]?affected|no damage(?: recorded)?|no visible damage|none|nil)[.!\s]*$/i.test(String(p.damage||'').trim());
}
function iconFor(p){return L.divIcon({className:'',html:`<span class="house-marker ${p.status}${!String(p.damage||'').trim()||/^(no damage|none|nil|no damage recorded|no visible damage|non-affected|non affected|unaffected)[.!\s]*$/i.test(String(p.damage).trim())?' no-damage':''}" aria-label="${esc(p.address)}"></span>`,iconSize:[12,12],iconAnchor:[6,6]})}
function render(skipList=false){
 markerLayer.clearLayers();const q=document.querySelector('#search').value.toLowerCase().trim(),filter=document.querySelector('#status').value;
 let visible=0;
 properties.forEach(p=>{
  p.distance=isLocalCoordinate(p.latitude,p.longitude)?tunnelDistance(+p.latitude,+p.longitude):NaN;
  p.status=classify(p.distance);
  if(!isLocalCoordinate(p.latitude,p.longitude))return;
  const text=`${p.id} ${p.address} ${p.postcode||''} ${p.damage||''} ${p.notes||''}`.toLowerCase();
  if(q&&!text.includes(q))return;
  if(filter==='unaffected'&&!isUnaffected(p))return;
  if(filter==='very-close'&&!(p.distance<=15))return;
  if(filter==='within-30'&&!(p.distance>15&&p.distance<=30))return;
  if(filter==='outside-30'&&!(p.distance>30))return;
  // If any street disclosure is expanded, display markers only for those streets.
  // With no expanded streets, retain the normal overview of all matching properties.
  const streetKey=addressParts(p.address).street.toLocaleLowerCase('en-GB');
  if(expandedStreets.size&&!expandedStreets.has(streetKey))return;
  visible++;
  const m=L.marker([+p.latitude,+p.longitude],{icon:iconFor(p)}).addTo(markerLayer);
  m.bindTooltip(`${esc(p.address)} — ${Number.isFinite(p.distance)?Math.round(p.distance)+' m (estimated)':'distance unavailable'}`);
  m.on('click',()=>{if(!placingPin)showDetails(p)});
  m.bindPopup(()=>propertyCard(p),{maxWidth:340,minWidth:240});
  m.on('popupopen',e=>{bindEditLocation(e.popup.getElement());bindPhotoButtons(e.popup.getElement());});
 });
 const known=properties.filter(p=>Number.isFinite(p.distance)).length;
 document.querySelector('#summary').innerHTML=`<b>${visible}</b> shown of ${properties.length}<br>Located: ${validProperties().length} · Unresolved: ${properties.length-validProperties().length}<br>Estimated tunnel distances: ${known} · Unavailable: ${properties.length-known}`;
 if(!skipList)renderPropertyList(q,filter);
 refreshPinOptions();
}

function refreshStreetMarkers(){render(true)}

// Remember expanded streets when search/filter updates the address list.
const expandedStreets=new Set();
// Only located addresses belonging to currently expanded streets control the view.
// Closing the last street leaves the existing map view untouched.
function fitExpandedStreetAddresses(){
 const openGroups=[...document.querySelectorAll('#propertyList .street-group[open]')];
 if(!openGroups.length)return;
 const indices=openGroups.flatMap(group=>[...group.querySelectorAll('.property-row[data-i]')].map(b=>Number(b.dataset.i)));
 const points=indices.map(i=>properties[i]).filter(p=>p&&isLocalCoordinate(p.latitude,p.longitude))
   .map(p=>[Number(p.latitude),Number(p.longitude)]);
 if(!points.length)return;
 openingFitActive=false;
 if(openingFitObserver){openingFitObserver.disconnect();openingFitObserver=null;}
 clearTimeout(openingFitTimer);
 map.closePopup();map.stop();map.invalidateSize({pan:false});
 if(points.length===1)map.setView(points[0],17,{animate:true});
 else map.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:17,animate:true});
}

function addressParts(address){
 const value=String(address||'').trim().replace(/\s+/g,' ');
 // Number + optional suffix, then street. Keep non-numbered addresses in a group.
 const match=value.match(/^(\d+)\s*([a-z]?)\s+(.+)$/i);
 if(!match)return {street:value||'Other addresses',number:-1,suffix:'',label:value};
 return {street:match[3].trim(),number:Number(match[1]),suffix:match[2].toLowerCase(),label:value};
}
function renderPropertyList(q='',filter='all'){
 const el=document.querySelector('#propertyList');if(!el)return;
 const rows=properties.filter(p=>{
  const text=`${p.id} ${p.address} ${p.postcode||''} ${p.damage||''} ${p.notes||''}`.toLowerCase();
  return (!q||text.includes(q))&&(filter==='all'||(filter==='unaffected'&&isUnaffected(p))||(filter==='very-close'&&p.distance<=15)||(filter==='within-30'&&p.distance>15&&p.distance<=30)||(filter==='outside-30'&&p.distance>30));
 });
 const groups=new Map();
 rows.forEach(p=>{
  const parts=addressParts(p.address);
  const key=parts.street.toLocaleLowerCase('en-GB');
  if(!groups.has(key))groups.set(key,{street:parts.street,items:[]});
  groups.get(key).items.push({p,parts});
 });
 const ordered=[...groups.entries()].sort((a,b)=>a[1].street.localeCompare(b[1].street,'en-GB',{numeric:true,sensitivity:'base'}));
 el.innerHTML=ordered.map(([key,group])=>{
  group.items.sort((a,b)=>a.parts.number-b.parts.number||a.parts.suffix.localeCompare(b.parts.suffix)||a.parts.label.localeCompare(b.parts.label,'en-GB',{numeric:true}));
  const opened=expandedStreets.has(key)||Boolean(q);
  return `<details class="street-group" data-street="${esc(key)}" ${opened?'open':''}><summary>${esc(group.street)} <span class="street-count">${group.items.length}</span></summary><div class="street-addresses">${group.items.map(({p})=>`<button type="button" class="property-row" data-i="${properties.indexOf(p)}"><strong>${esc(p.address)}</strong><span>${esc(p.postcode||'')}${p.id?' · ID '+esc(p.id):''}</span></button>`).join('')}</div></details>`;
 }).join('')||'<p class="hint">No matching addresses.</p>';
 // Respond to user interaction, not browser-generated initial <details> toggle events.
 el.querySelectorAll('.street-group > summary').forEach(summary=>summary.addEventListener('click',()=>{
  const group=summary.parentElement;
  const key=group.dataset.street;
  // Native details toggles after click; update once its open state has changed.
  setTimeout(()=>{
   if(group.open)expandedStreets.add(key);else expandedStreets.delete(key);
   // Refresh markers without rebuilding the disclosures under the pointer.
   refreshStreetMarkers();
   fitExpandedStreetAddresses();
  },0);
 }));
 el.querySelectorAll('.property-row').forEach(button=>button.addEventListener('click',()=>focusProperty(properties[+button.dataset.i])));
}

function normaliseStreet(s){return String(s||'').toLowerCase().replace(/[’']/g, "'").replace(/\b(street|st\.?)(?=\W|$)/g,'street').replace(/\b(road|rd\.?)(?=\W|$)/g,'road').replace(/\b(avenue|ave\.?)(?=\W|$)/g,'avenue').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function matchingCaption(caption,address){
 const c=normaliseStreet(caption),a=normaliseStreet(address);
 if(!a||!c.startsWith(a))return false;
 const rest=c.slice(a.length).trim();
 // Require a word boundary; prevent 23 Parry Road matching 230 Parry Road.
 return !rest||rest.startsWith('front')||rest.startsWith('rear')||rest.startsWith('side')||rest.startsWith('crack')||rest.startsWith('damage')||rest.startsWith('wall')||rest.startsWith('window')||rest.startsWith('door')||rest.startsWith('roof')||rest.startsWith('external')||rest.startsWith('internal')||rest.startsWith('elevation')||rest.startsWith('photo')||rest.startsWith('view')||rest.startsWith('subsidence')||rest.startsWith('movement')||rest.startsWith('garden')||rest.startsWith('brick')||rest.startsWith('ceiling')||rest.startsWith('floor')||rest.startsWith('foundation')||rest.startsWith('chimney')||rest.startsWith('boundary');
}
function photoEntries(p){
 const result=[];
 for(const url of String(p.photos||'').split(/[|;\n]+/).map(x=>x.trim())){
  try{if(new URL(url).protocol==='https:')result.push({url,caption:p.address})}catch{}
 }
 for(const item of photoIndex){
  if(matchingCaption(item.caption,p.address))result.push(item);
 }
 return [...new Map(result.map(x=>[x.url,x])).values()].slice(0,24);
}
function safePhotoUrls(p){return photoEntries(p).map(x=>x.url)}
function parsePhotoIndex(csv){
 const lines=csvRecords(csv.replace(/^\uFEFF/,''));if(!lines.length)return [];
 const headers=splitCSV(lines[0]).map(normaliseHeader);
 const ci=headers.indexOf('caption'),ui=headers.findIndex(h=>['imageurl','photourl','url'].includes(h));
 if(ci<0||ui<0)throw Error('Photo index needs Caption and Image URL columns');
 return lines.slice(1).map(line=>{const v=splitCSV(line);return {caption:(v[ci]||'').trim(),url:(v[ui]||'').trim()}}).filter(x=>{try{return !!x.caption&&new URL(x.url).protocol==='https:'}catch{return false}});
}
async function loadPhotoIndex(){
 try{
  const response=await fetch('photo-index.csv?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  photoIndex=parsePhotoIndex(await response.text());
  photoIndexStatus(`${photoIndex.length} indexed photographs loaded.`);
 }catch(e){photoIndexStatus('No photograph index loaded. Shared Webador album link remains available.');}
 render();
}
function photoIndexStatus(message){const el=document.querySelector('#photoIndexStatus');if(el)el.textContent=message}
function photoAlbumLink(){
 const url=String(cfg.propertyPhotoAlbumUrl||'').trim();
 try{const u=new URL(url);if(u.protocol!=='https:')return '';return `<p class="album-link"><a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">View Property Photographs ↗</a></p>`;}catch{return '';}
}
function requestWebadorPhotos(address){
 // The parent Webador page checks the iframe source before opening its album viewer.
 if(window.parent===window){alert('Open the map on its Webador page to view the linked album.');return;}
 window.parent.postMessage({type:'hs2-qpt-open-photos',address:String(address||'')},'*');
}
// Ask the Webador parent for thumbnail previews whenever a property is displayed.
function requestWebadorPreviews(address){
 if(window.parent===window)return;
 window.parent.postMessage({type:'hs2-qpt-request-previews',address:String(address||'')},'*');
}
window.addEventListener('message',event=>{
 if(event.source!==window.parent||!event.data||event.data.type!=='hs2-qpt-photo-previews')return;
 // The reply must come from the page that embeds this map.
 try{if(document.referrer&&event.origin!==new URL(document.referrer).origin)return;}catch{return;}
 const address=String(event.data.address||'');
 const photos=Array.isArray(event.data.photos)?event.data.photos.slice(0,3):[];
 document.querySelectorAll('.hs2-live-previews').forEach(box=>{
  if(box.dataset.address!==address)return;
  box.replaceChildren();
  if(!photos.length){box.textContent='No matching Webador photographs yet.';return;}
  photos.forEach(photo=>{
   let url;try{url=new URL(photo.thumb);if(url.protocol!=='https:')return;}catch{return;}
   const button=document.createElement('button');button.type='button';button.className='hs2-preview-tile';
   button.title=String(photo.caption||'View photographs');
   const img=document.createElement('img');img.src=url.href;img.alt=String(photo.caption||'Property photograph');img.loading='lazy';
   button.appendChild(img);button.addEventListener('click',()=>requestWebadorPhotos(address));box.appendChild(button);
  });
 });
});
function bindPhotoButtons(scope){
 if(!scope)return;
 const previews=scope.querySelector('.hs2-live-previews');if(previews)requestWebadorPreviews(previews.dataset.address);
 scope.querySelectorAll('.hs2-webador-gallery').forEach(button=>{
  button.addEventListener('click',()=>requestWebadorPhotos(button.dataset.address));
 });
}
function propertyCard(p){
 const distance=Number.isFinite(p.distance)?Math.round(p.distance)+' metres (estimated)':'Not available';
 const photos=photoEntries(p);
 const gallery=photos.length?`<div class="property-gallery">${photos.map((photo,i)=>`<a href="${esc(photo.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open property photo ${i+1}: ${esc(photo.caption)}"><img src="${esc(photo.url)}" alt="${esc(photo.caption)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"><small>${esc(photo.caption)}</small></a>`).join('')}</div>`:'<p class="hint">No indexed photographs for this property yet.</p>';
 return `<div class="property-card"><h3>${esc(p.address)}</h3><p><strong>Location:</strong> ${esc(p.address)}${p.postcode?', '+esc(p.postcode):''}</p><p><strong>Property ID:</strong> ${esc(p.id)}</p><p><strong>Distance from tunnel:</strong> ${distance}</p><p><strong>Coordinates:</strong> ${Number.isFinite(+p.latitude)&&Number.isFinite(+p.longitude)?Number(p.latitude).toFixed(6)+', '+Number(p.longitude).toFixed(6):'Unavailable'}</p>${p.notes?`<p>${esc(p.notes)}</p>`:''}<h4>Damage recorded</h4><p class="damage-description">${p.damage?esc(p.damage).replace(/^(no damage|none|nil|no damage recorded|no visible damage|unaffected)$/i,'Non-affected').replace(/\r?\n/g,'<br>'):'Non-affected'}</p><h4>Associated photographs</h4><div class="hs2-live-previews" data-address="${esc(p.address)}" aria-label="Webador photograph previews"><span class="hint">Loading Webador photographs…</span></div><button type="button" class="hs2-webador-gallery" data-address="${esc(p.address)}">View property photographs</button><p class="hint">Opens the Webador album viewer when displayed on the QPT website.</p>${gallery}${photoAlbumLink()}<button type="button" class="edit-location" data-property-id="${esc(p.id)}" data-property-address="${esc(p.address)}">Edit location on map</button><p class="hint">Tunnel geometry is provisional. Distance is horizontal and does not establish eligibility or safeguarding status.</p></div>`;
}
function showDetails(p){document.querySelector('#details').innerHTML='<h2>Selected property</h2>'+propertyCard(p);bindEditLocation(document.querySelector('#details'));bindPhotoButtons(document.querySelector('#details'))}
function focusProperty(p,zoom=19){
 if(!p)return;
 showDetails(p);
 if(!isLocalCoordinate(p.latitude,p.longitude)){
  pinMsg('This property has no confirmed map coordinates. Select it in the Pinpoint Editor and place its marker manually.');
  return;
 }
 const lat=Number(p.latitude),lon=Number(p.longitude);
 // Leaflet popup autoPan used to move the map away from the chosen pinpoint.
 // Disable it so the selected house stays exactly in the map centre.
 map.closePopup();
 map.stop();
 map.invalidateSize({pan:false});
 map.setView(L.latLng(lat,lon),zoom,{animate:false,reset:true});
 const popup=L.popup({maxWidth:340,minWidth:240,autoPan:false,keepInView:false})
  .setLatLng([lat,lon]).setContent(propertyCard(p)).openOn(map);
 if(popup.getElement()){bindEditLocation(popup.getElement());bindPhotoButtons(popup.getElement());}
 // Keep the pinpoint centred even when the map is inside a resizing Webador iframe.
 requestAnimationFrame(()=>{
  map.invalidateSize({pan:false});
  map.panTo([lat,lon],{animate:false});
 });
}

function splitCSV(line){let out=[],v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v.trim());v=''}else v+=c}out.push(v.trim());return out}
// Preserve quoted line breaks in free-text fields such as Damage.
function csvRecords(text){let records=[],start=0,quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted;}else if((c==='\n'||c==='\r')&&!quoted){const line=text.slice(start,i);if(line.trim())records.push(line);if(c==='\r'&&text[i+1]==='\n')i++;start=i+1;}}const last=text.slice(start);if(last.trim())records.push(last);return records;}
function normaliseHeader(x){return String(x||'').toLowerCase().trim().replace(/[ _-]+/g,'')}
function parseCSV(text){const lines=csvRecords(text.replace(/^\uFEFF/,''));if(lines.length<2)throw Error('The sheet has no data rows.');const raw=splitCSV(lines[0]);const aliases={id:['id','propertyid','ref','reference'],address:['address','propertyaddress','houseaddress'],postcode:['postcode','postalcode','zip'],latitude:['latitude','lat'],longitude:['longitude','lng','lon','long'],notes:['notes','note','comments','comment'],damage:['damage','damagedescription','propertydamage'],photos:['photos','photourls','photo','images','imageurls','photolinks']};const idx={};raw.forEach((h,i)=>{const n=normaliseHeader(h);for(const [key,vals] of Object.entries(aliases))if(vals.includes(n))idx[key]=i});if(idx.address===undefined)throw Error('Missing required column: Address.');const rows=[];lines.slice(1).forEach((line,i)=>{const a=splitCSV(line);if(!a.some(Boolean))return;const get=k=>idx[k]===undefined?'':(a[idx[k]]??'').trim();if(!get('address'))return;const lat=parseFloat(get('latitude')),lon=parseFloat(get('longitude'));rows.push({id:get('id')||String(rows.length+1).padStart(2,'0'),address:get('address'),postcode:get('postcode'),latitude:Number.isFinite(lat)?lat:null,longitude:Number.isFinite(lon)?lon:null,notes:get('notes'),damage:get('damage'),photos:get('photos'),rowNumber:i+2})});if(!rows.length)throw Error('No usable property rows were found.');return rows}
const GEOCODE_CACHE_VERSION='v3';
const QP_BOUNDS={south:51.515,north:51.555,west:-0.245,east:-0.165};
function isLocalCoordinate(lat,lon){lat=+lat;lon=+lon;return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=QP_BOUNDS.south&&lat<=QP_BOUNDS.north&&lon>=QP_BOUNDS.west&&lon<=QP_BOUNDS.east}
function cacheKey(p){return 'hs2qp:geocode:'+GEOCODE_CACHE_VERSION+':'+String(p.address+' '+(p.postcode||'')).toLowerCase().replace(/\s+/g,' ').trim()}
function readGeocodeCache(p){try{const v=JSON.parse(localStorage.getItem(cacheKey(p)));if(v&&isLocalCoordinate(v.lat,v.lon)){p.latitude=v.lat;p.longitude=v.lon;return true}}catch(e){}return false}
function saveGeocodeCache(p){try{localStorage.setItem(cacheKey(p),JSON.stringify({lat:+p.latitude,lon:+p.longitude,display:p.geocodeDisplay||'',saved:Date.now()}))}catch(e){}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function geocodeOne(p){const query=[p.address,p.postcode,'London','UK'].filter(Boolean).join(', ');const base=cfg.geocoderUrl||'https://nominatim.openstreetmap.org/search';const url=base+'?format=jsonv2&limit=1&countrycodes=gb&q='+encodeURIComponent(query);const res=await fetch(url,{headers:{'Accept':'application/json'}});if(!res.ok)throw Error('Geocoder HTTP '+res.status);const data=await res.json();if(!data.length)return false;const lat=Number(data[0].lat),lon=Number(data[0].lon);if(!isLocalCoordinate(lat,lon))return false;p.latitude=lat;p.longitude=lon;p.geocodeDisplay=data[0].display_name||'';saveGeocodeCache(p);return true}
async function resolveMissingCoordinates(rows){const missing=rows.filter(p=>!isLocalCoordinate(p.latitude,p.longitude));missing.forEach(readGeocodeCache);const todo=missing.filter(p=>!isLocalCoordinate(p.latitude,p.longitude));if(!todo.length)return {resolved:missing.length,failed:[]};const failed=[];for(let i=0;i<todo.length;i++){const p=todo[i];setDataStatus(`Locating address ${i+1} of ${todo.length}: ${p.address}${p.postcode?' · '+p.postcode:''}…`,'loading');try{if(!await geocodeOne(p))failed.push(p)}catch(e){failed.push(p)}if(i<todo.length-1)await sleep(Math.max(1100,cfg.geocodeDelayMs||1100))}return {resolved:missing.length-failed.length,failed}}
function validProperties(){return properties.filter(p=>isLocalCoordinate(p.latitude,p.longitude))}
function showUnresolved(failed){const el=document.querySelector('#unresolved');if(!failed.length){el.innerHTML='';return}el.innerHTML=`<details open><summary>${failed.length} address${failed.length===1?'':'es'} could not be located</summary><ul>${failed.map(p=>`<li>${esc(p.address)}${p.postcode?' · '+esc(p.postcode):''}</li>`).join('')}</ul><p class=\"hint\">Check the spelling/postcode in the Google Sheet, then click Reload Google Sheet.</p></details>`}

function setDataStatus(message,kind=''){const el=document.querySelector('#dataStatus');el.textContent=message;el.className='data-status '+kind}
function sheetCsvUrl(){return cfg.spreadsheetId?`https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(cfg.sheetGid||'0')}`:''}
// Fit the opening view to all located properties, including when the Webador
// iframe changes dimensions after the map has loaded.
let openingFitActive=true;
let openingFitObserver=null;
let openingFitTimer=null;
function fitAll(){
 const pts=validProperties().map(p=>[Number(p.latitude),Number(p.longitude)]);
 if(!pts.length)return;
 openingFitActive=true;
 const bounds=L.latLngBounds(pts);
 const applyFit=()=>{
   if(!openingFitActive)return;
   const el=map.getContainer();
   if(el.clientWidth<100||el.clientHeight<100)return;
   map.invalidateSize({pan:false,debounceMoveend:true});
   if(pts.length===1)map.setView(pts[0],17,{animate:false});
   else map.fitBounds(bounds,{
     paddingTopLeft:[35,35],paddingBottomRight:[35,35],
     maxZoom:16,animate:false
   });
 };
 if(openingFitObserver)openingFitObserver.disconnect();
 clearTimeout(openingFitTimer);
 applyFit();
 requestAnimationFrame(()=>requestAnimationFrame(applyFit));
 openingFitObserver=new ResizeObserver(()=>{if(openingFitActive)applyFit();});
 openingFitObserver.observe(map.getContainer());
 openingFitTimer=setTimeout(()=>{
   applyFit();openingFitActive=false;
   openingFitObserver.disconnect();openingFitObserver=null;
 },2500);
}
async function loadGoogleSheet(){const url=sheetCsvUrl();if(!url){setDataStatus('No Google Sheet is configured.','error');return}setDataStatus('Loading properties from Google Sheet…','loading');try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error(`Google returned HTTP ${res.status}`);properties=parseCSV(await res.text());applyManualPins();const geo=await resolveMissingCoordinates(properties);render();fitAll();showUnresolved(geo.failed);setDataStatus(`${properties.length} properties loaded from Google Sheet · ${validProperties().length} located · ${new Date().toLocaleString('en-GB')}`,'ok')}catch(err){properties=[];render();showUnresolved([]);setDataStatus(`Google Sheet could not be loaded: ${err.message}. No sample properties are displayed. Check Sheet sharing or import a CSV.`, 'error')}}
async function loadRoute(){
  tunnelLayer.clearLayers(); zoneLayer.clearLayers(); corridorLayer.clearLayers(); routeLines=[];
  try{
    const res=await fetch('hs2-route.geojson',{cache:'no-store'});
    if(!res.ok) throw Error('HTTP '+res.status);
    const fc=await res.json();
    const route=fc.features.find(f=>f.geometry&&(f.geometry.type==='LineString'||f.geometry.type==='MultiLineString'));
    const zone=fc.features.find(f=>f.geometry&&(f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon'));
    if(route){
      routeFeature=route;
      routeLines=route.geometry.type==='MultiLineString'?route.geometry.coordinates.map(line=>line.map(c=>[c[1],c[0]])):[route.geometry.coordinates.map(c=>[c[1],c[0]])];
      L.geoJSON(route,{style:{color:'#555',weight:3,opacity:.9,dashArray:'10 7',lineCap:'butt'}}).addTo(tunnelLayer);
      // Turf computes a true geographic 30 metre buffer, not a pixel-width stroke.
      if(window.turf && typeof turf.buffer==='function'){
        const corridor=turf.buffer(route,30,{units:'meters',steps:32});
        L.geoJSON(corridor,{style:{color:'#bd3b3b',weight:1.5,opacity:.7,fillColor:'#e66b6b',fillOpacity:.24},interactive:false}).addTo(corridorLayer);
      }
    }
    if(zone){
      L.geoJSON(zone,{style:{color:'#1f5f99',weight:2,opacity:.9,fillColor:'#4f91c7',fillOpacity:.22}}).addTo(zoneLayer);
    }
    document.querySelector('#showTunnel').checked=true;
    document.querySelector('#showZone').checked=false;
    document.querySelector('#showCorridor').checked=true;
    if(!map.hasLayer(tunnelLayer))tunnelLayer.addTo(map);
    if(map.hasLayer(zoneLayer))map.removeLayer(zoneLayer);
    if(!map.hasLayer(corridorLayer))corridorLayer.addTo(map);
    document.querySelector('#routeStatus').textContent='Red shading is a calculated 30 m buffer either side of the current grey tunnel line. The line has NOT been verified against the source screenshot, so this corridor and house distances are indicative only, not an official HS2 eligibility boundary.';
  }catch(err){
    document.querySelector('#routeStatus').textContent='HS2 vector layer could not be loaded: '+err.message;
  }
  render();
}
document.querySelector('#search').addEventListener('input',render);document.querySelector('#status').addEventListener('change',render);
document.querySelector('#showCorridor').addEventListener('change',e=>e.target.checked?corridorLayer.addTo(map):map.removeLayer(corridorLayer));
document.querySelector('#showTunnel').addEventListener('change',e=>e.target.checked?tunnelLayer.addTo(map):map.removeLayer(tunnelLayer));document.querySelector('#showZone').addEventListener('change',e=>e.target.checked?zoneLayer.addTo(map):map.removeLayer(zoneLayer));document.querySelector('#showHouses').addEventListener('change',e=>e.target.checked?markerLayer.addTo(map):map.removeLayer(markerLayer));
document.querySelector('#reloadSheet').addEventListener('click',loadGoogleSheet);
document.querySelector('#csvFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{properties=parseCSV(await f.text());applyManualPins();const geo=await resolveMissingCoordinates(properties);render();fitAll();showUnresolved(geo.failed);setDataStatus(`${properties.length} properties loaded from local CSV · ${validProperties().length} located.`,'ok')}catch(err){alert('Could not import CSV: '+err.message);e.target.value=''}});
// Browsers can restore old form selections after a GitHub Pages refresh. Force a
// predictable startup state so newly loaded properties are never hidden.

// One-time cleanup of caches from the earlier prototype, which could contain
// results for placeholder addresses. Versioned v3 entries are retained.
try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('hs2qp:geocode:')&&!k.startsWith('hs2qp:geocode:'+GEOCODE_CACHE_VERSION+':'))localStorage.removeItem(k)}}catch(e){}
document.querySelector('#status').value='all';
document.querySelector('#search').value='';
document.querySelector('#showHouses').checked=true;
document.querySelector('#showTunnel').checked=true;
document.querySelector('#showZone').checked=false;
document.querySelector('#showCorridor').checked=true;
properties=[];render();loadRoute().then(()=>{if(cfg.useGoogleSheet!==false)loadGoogleSheet();else setDataStatus('Google Sheet loading is disabled. Import a CSV to display properties.','')});


// Manual pinpoints: explicit browser-local overrides, never silently written to Google Sheets.
function storedPins(){try{return JSON.parse(localStorage.getItem(MANUAL_KEY)||'{}')}catch{return {}}}
function pinKey(p){return String(p.id||'').trim()+'|'+String(p.address||'').trim().toLowerCase()}
function matchSavedPin(p,pins){
 const id=String(p.id||'').trim();
 // Stable ID first, so a renamed street does not produce a duplicate property.
 if(id){const found=Object.values(pins).find(v=>String(v.id||'').trim()===id);if(found)return found}
 return pins[pinKey(p)];
}
function applyManualPins(){
 const pins=storedPins(), matched=new Set();
 properties.forEach(p=>{
  const override=matchSavedPin(p,pins);
  if(override){Object.assign(p,{address:override.address||p.address,postcode:override.postcode??p.postcode,notes:override.notes??p.notes,damage:override.damage??p.damage});
   if(isLocalCoordinate(override.latitude,override.longitude)){p.latitude=override.latitude;p.longitude=override.longitude;p.locationSource='manual'}
   matched.add(pinKey(override));
  }
 });
 Object.entries(pins).forEach(([key,p])=>{
  if(!matched.has(key)&&!properties.some(v=>String(v.id||'')===String(p.id||'')&&p.id)&&isLocalCoordinate(p.latitude,p.longitude))properties.push({...p,locationSource:'manual'});
 });
}
function persistProperty(original,updated){
 const pins=storedPins(), oldKey=original?pinKey(original):null;
 if(oldKey)delete pins[oldKey];
 // Also discard stale entries for this ID to prevent reappearance on reload.
 if(updated.id)for(const [key,value] of Object.entries(pins))if(String(value.id||'')===String(updated.id))delete pins[key];
 pins[pinKey(updated)]={...updated};
 localStorage.setItem(MANUAL_KEY,JSON.stringify(pins));
 if(original)Object.assign(original,updated);else properties.push(updated);
}
function refreshPinOptions(){
 const sel=document.querySelector('#pinProperty');if(!sel)return;
 const old=sel.value;
 sel.innerHTML='<option value="new">+ New property</option>'+properties.map((p,i)=>`<option value="${i}">${esc(p.address)}${p.postcode?' ('+esc(p.postcode)+')':''}</option>`).join('');
 sel.value=(old==='new'||old===''||!Number.isInteger(+old)||+old>=properties.length)?'new':old;
}
function pinMsg(s){document.querySelector('#pinMessage').textContent=s}
function stopPin(){
 placingPin=false;map.getContainer().style.cursor='';
 if(draftPin){map.removeLayer(draftPin);draftPin=null}
 document.querySelector('#savePin').disabled=true;document.querySelector('#cancelPin').disabled=true;
}
function selectPropertyForEditing(index){
 const p=properties[index];if(!p)return;
 stopPin();document.querySelector('#pinProperty').value=String(index);
 document.querySelector('#pinAddress').value=p.address;
 document.querySelector('#pinPostcode').value=p.postcode||'';
 document.querySelector('#pinNotes').value=p.notes||'';document.querySelector('#pinDamage').value=p.damage||'';
 if(isLocalCoordinate(p.latitude,p.longitude))focusProperty(p);
 pinMsg('Selected '+p.address+'. Click Place pinpoint on map to correct its location.');
 document.querySelector('#pinEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
function bindEditLocation(container){
 container.querySelectorAll('.edit-location').forEach(b=>b.addEventListener('click',()=>{
  const i=properties.findIndex(p=>String(p.id)===b.dataset.propertyId&&p.address===b.dataset.propertyAddress);
  if(i>=0)selectPropertyForEditing(i);
 }));
}
document.querySelector('#pinProperty').addEventListener('change',e=>{
 const p=properties[+e.target.value];if(e.target.value==='new'||!p){document.querySelector('#pinAddress').value='';document.querySelector('#pinPostcode').value='';document.querySelector('#pinNotes').value='';document.querySelector('#pinDamage').value='';return}
 document.querySelector('#pinAddress').value=p.address;document.querySelector('#pinPostcode').value=p.postcode||'';document.querySelector('#pinNotes').value=p.notes||'';document.querySelector('#pinDamage').value=p.damage||'';
 focusProperty(p);
});
document.querySelector('#saveDetails').addEventListener('click',()=>{
 const chosen=document.querySelector('#pinProperty').value;
 if(chosen==='new'){pinMsg('Select an existing property to edit its street name, or place a pinpoint for a new property.');return}
 const original=properties[+chosen];if(!original)return;
 const address=document.querySelector('#pinAddress').value.trim();
 if(!address){pinMsg('Please enter the street address.');return}
 const updated={...original,address,postcode:document.querySelector('#pinPostcode').value.trim(),notes:document.querySelector('#pinNotes').value.trim(),damage:document.querySelector('#pinDamage').value.trim()};
 try{persistProperty(original,updated)}catch(e){pinMsg('Could not save in this browser: '+e.message);return}
 render();focusProperty(original);pinMsg('Street name and property details saved locally. Export CSV to update your Google Sheet.');
});
document.querySelector('#startPin').addEventListener('click',()=>{
 if(!document.querySelector('#pinAddress').value.trim()){pinMsg('Enter an address first.');return}
 stopPin();placingPin=true;map.getContainer().style.cursor='crosshair';
 document.querySelector('#cancelPin').disabled=false;
 const i=document.querySelector('#pinProperty').value;const p=i==='new'?null:properties[+i];
 if(p&&isLocalCoordinate(p.latitude,p.longitude)){
  draftPin=L.marker([+p.latitude,+p.longitude],{draggable:true,autoPan:true}).addTo(map);
  draftPin.bindTooltip('Drag this marker, or click another building').openTooltip();
  document.querySelector('#savePin').disabled=false;
  map.setView([+p.latitude,+p.longitude],19);
  pinMsg('Drag the existing pinpoint or click a new position on the map, then save.');
 }else pinMsg('Click the building on the map to place the pinpoint.');
});
map.on('click',e=>{
 if(!placingPin)return;
 if(!isLocalCoordinate(e.latlng.lat,e.latlng.lng)){pinMsg('Choose a location in the Queen’s Park area.');return}
 if(draftPin)map.removeLayer(draftPin);
 draftPin=L.marker(e.latlng,{draggable:true,autoPan:true}).addTo(map);
 draftPin.bindTooltip('Drag to refine the position').openTooltip();
 document.querySelector('#savePin').disabled=false;
 pinMsg('Drag the temporary marker if necessary, then select Save pinpoint locally.');
});
document.querySelector('#cancelPin').addEventListener('click',()=>{stopPin();pinMsg('Pinpoint placement cancelled.')});
document.querySelector('#savePin').addEventListener('click',()=>{
 if(!placingPin||!draftPin)return;
 const address=document.querySelector('#pinAddress').value.trim(),postcode=document.querySelector('#pinPostcode').value.trim();
 if(!address){pinMsg('Address is required.');return}
 const loc=draftPin.getLatLng();
 const chosen=document.querySelector('#pinProperty').value;
 const original=chosen==='new'?null:properties[+chosen];
 const id=original?.id||'M'+Date.now().toString(36).toUpperCase();
 const p={...(original||{}),id,address,postcode,notes:document.querySelector('#pinNotes').value.trim(),damage:document.querySelector('#pinDamage').value.trim(),latitude:+loc.lat.toFixed(7),longitude:+loc.lng.toFixed(7),locationSource:'manual'};
 try{persistProperty(original,p)}catch(e){pinMsg('Browser storage failed: '+e.message);return}
 stopPin();render();focusProperty(p);
 pinMsg('Pinpoint saved in this browser. Download CSV to back it up and share it.');
});
function csvCell(v){const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
function propertyCsv(){
 const headers=['ID','Address','Postcode','Latitude','Longitude','Notes','Damage','Photos','Location Source'];
 const rows=properties.map(p=>[p.id,p.address,p.postcode,p.latitude??'',p.longitude??'',p.notes,p.damage||'',p.photos,p.locationSource||'geocoded']);
 return '\uFEFF'+[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
}
function showCsvFallback(csv){
 const panel=document.querySelector('#csvFallback');
 document.querySelector('#csvText').value=csv;
 panel.hidden=false;
 document.querySelector('#csvText').focus();
 pinMsg('CSV ready. If Safari does not download it, use Copy CSV or select the text and paste into a spreadsheet.');
}
document.querySelector('#exportPins').addEventListener('click',()=>{
 const csv=propertyCsv();
 // Data URL avoids Safari's blob: navigation/WebKitBlobResource error.
 // Keep the visible copy fallback for browsers that open the CSV as text.
 showCsvFallback(csv);
 const a=document.createElement('a');
 a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
 a.download='hs2-property-pinpoints.csv';
 a.style.display='none';document.body.appendChild(a);
 try{a.click()}catch(e){pinMsg('Automatic download blocked. Use Copy CSV below.');}
 a.remove();
});
document.querySelector('#copyCsv').addEventListener('click',async()=>{
 const t=document.querySelector('#csvText');
 try{await navigator.clipboard.writeText(t.value);pinMsg('CSV copied. Paste it into a text file or spreadsheet.');}
 catch(e){t.focus();t.select();pinMsg('Press Command+C to copy the selected CSV, then paste into a text file or spreadsheet.');}
});

// Optional import: CSV made from the Webador captions and direct photo image URLs.
document.querySelector('#photoIndexFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{photoIndex=parsePhotoIndex(await file.text());photoIndexStatus(`${photoIndex.length} photographs indexed from local CSV (this browser session only). Upload photo-index.csv to GitHub to publish.`);render();}
 catch(err){photoIndexStatus('Could not read photograph index: '+err.message)}
});
loadPhotoIndex();

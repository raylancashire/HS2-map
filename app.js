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
const markerLayer=L.layerGroup().addTo(map);
let properties=[];

const samples=[
['01','Sample property – Kilburn Lane','',51.5351,-0.2057,'Sample only'],['02','Sample property – Kilburn Lane','',51.5350,-0.2047,'Sample only'],['03','Sample property – Kilburn Lane','',51.5349,-0.2037,'Sample only'],['04','Sample property – Kilburn Lane','',51.5348,-0.2027,'Sample only'],
['05','Sample property – Bravington Road','',51.5337,-0.2091,'Sample only'],['06','Sample property – Bravington Road','',51.5331,-0.2089,'Sample only'],['07','Sample property – Bravington Road','',51.5325,-0.2087,'Sample only'],['08','Sample property – Bravington Road','',51.5319,-0.2085,'Sample only'],
['09','Sample property – Portnall Road','',51.5342,-0.2012,'Sample only'],['10','Sample property – Portnall Road','',51.5336,-0.2010,'Sample only'],['11','Sample property – Portnall Road','',51.5330,-0.2008,'Sample only'],['12','Sample property – Portnall Road','',51.5324,-0.2006,'Sample only'],
['13','Sample property – Ashmore Road','',51.5325,-0.1969,'Sample only'],['14','Sample property – Ashmore Road','',51.5320,-0.1967,'Sample only'],['15','Sample property – Ashmore Road','',51.5315,-0.1965,'Sample only'],['16','Sample property – Ashmore Road','',51.5310,-0.1963,'Sample only'],
['17','Sample property – Queen’s Park area','',51.5344,-0.2061,'Sample only'],['18','Sample property – Queen’s Park area','',51.5338,-0.2037,'Sample only'],['19','Sample property – Queen’s Park area','',51.5331,-0.1994,'Sample only'],['20','Sample property – Queen’s Park area','',51.5324,-0.1955,'Sample only']
].map(r=>({id:r[0],address:r[1],postcode:r[2],latitude:r[3],longitude:r[4],notes:r[5]}));

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toXY(lat,lon,refLat){const R=6371000,rad=Math.PI/180;return {x:lon*rad*R*Math.cos(refLat*rad),y:lat*rad*R}}
function pointSegDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;let t=den?((p.x-a.x)*dx+(p.y-a.y)*dy)/den:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))}
function tunnelDistance(lat,lon){if(!routeLines.length)return NaN;const ref=lat,p=toXY(lat,lon,ref);let d=Infinity;routeLines.forEach(line=>{for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1];d=Math.min(d,pointSegDist(p,toXY(a[0],a[1],ref),toXY(b[0],b[1],ref)))}});return d}
function classify(d){return !Number.isFinite(d)?'unknown':d<=15?'d0':d<=30?'d15':d<=60?'d30':d<=100?'d60':'d100'}
function iconFor(p){return L.divIcon({className:'',html:`<span class="house-marker ${p.status}" aria-label="${esc(p.address)}"></span>`,iconSize:[12,12],iconAnchor:[6,6]})}
function render(){
 markerLayer.clearLayers();const q=document.querySelector('#search').value.toLowerCase().trim(),filter=document.querySelector('#status').value;
 let visible=0;
 properties.forEach(p=>{
  p.distance=isLocalCoordinate(p.latitude,p.longitude)?tunnelDistance(+p.latitude,+p.longitude):NaN;
  p.status=classify(p.distance);
  if(!isLocalCoordinate(p.latitude,p.longitude))return;
  const text=`${p.id} ${p.address} ${p.postcode||''}`.toLowerCase();
  if(q&&!text.includes(q))return;
  if(filter==='very-close'&&!(p.distance<=15))return;
  if(filter==='within-30'&&!(p.distance>15&&p.distance<=30))return;
  if(filter==='outside-30'&&!(p.distance>30))return;
  visible++;
  const m=L.marker([+p.latitude,+p.longitude],{icon:iconFor(p)}).addTo(markerLayer);
  m.bindTooltip(`${esc(p.address)} — ${Number.isFinite(p.distance)?Math.round(p.distance)+' m (estimated)':'distance unavailable'}`);
  m.on('click',()=>showDetails(p));
  m.bindPopup(()=>propertyCard(p),{maxWidth:340,minWidth:240});
 });
 const known=properties.filter(p=>Number.isFinite(p.distance)).length;
 document.querySelector('#summary').innerHTML=`<b>${visible}</b> shown of ${properties.length}<br>Located: ${validProperties().length} · Unresolved: ${properties.length-validProperties().length}<br>Estimated tunnel distances: ${known} · Unavailable: ${properties.length-known}`;
 renderPropertyList(q,filter);
}

function renderPropertyList(q='',filter='all'){
  const el=document.querySelector('#propertyList'); if(!el)return;
  const rows=properties.filter(p=>{const text=`${p.id} ${p.address} ${p.postcode||''}`.toLowerCase();return (!q||text.includes(q))&&(filter==='all'||(filter==='very-close'&&p.distance<=15)||(filter==='within-30'&&p.distance>15&&p.distance<=30)||(filter==='outside-30'&&p.distance>30))});
  el.innerHTML=rows.map((p,i)=>`<button class="property-row" data-i="${properties.indexOf(p)}"><strong>${esc(p.address)}</strong><span>${esc(p.postcode||'')}${p.id?' · ID '+esc(p.id):''}</span></button>`).join('');
  el.querySelectorAll('.property-row').forEach(b=>b.addEventListener('click',()=>{const p=properties[+b.dataset.i]; if(isLocalCoordinate(p.latitude,p.longitude)){map.setView([+p.latitude,+p.longitude],18); showDetails(p)}}));
}

function safePhotoUrls(p){
 const raw=String(p.photos||'').trim();
 return raw.split(/[|;\n]+/).map(x=>x.trim()).filter(x=>{try{const u=new URL(x);return u.protocol==='https:';}catch{return false;}}).slice(0,12);
}
function photoAlbumLink(){
 const url=String(cfg.propertyPhotoAlbumUrl||'').trim();
 try{const u=new URL(url);if(u.protocol!=='https:')return '';return `<p class="album-link"><a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">View Property Photographs ↗</a></p>`;}catch{return '';}
}
function propertyCard(p){
 const distance=Number.isFinite(p.distance)?Math.round(p.distance)+' metres (estimated)':'Not available';
 const photos=safePhotoUrls(p);
 const gallery=photos.length?`<div class="property-gallery">${photos.map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open property photo ${i+1}"><img src="${esc(url)}" alt="Photo ${i+1} associated with ${esc(p.address)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"></a>`).join('')}</div>`:'<p class="hint">No photographs linked to this property.</p>';
 return `<div class="property-card"><h3>${esc(p.address)}</h3><p><strong>Location:</strong> ${esc(p.address)}${p.postcode?', '+esc(p.postcode):''}</p><p><strong>Property ID:</strong> ${esc(p.id)}</p><p><strong>Distance from tunnel:</strong> ${distance}</p><p><strong>Coordinates:</strong> ${Number.isFinite(+p.latitude)&&Number.isFinite(+p.longitude)?Number(p.latitude).toFixed(6)+', '+Number(p.longitude).toFixed(6):'Unavailable'}</p>${p.notes?`<p>${esc(p.notes)}</p>`:''}<h4>Associated photographs</h4>${gallery}${photoAlbumLink()}<p class="hint">Tunnel geometry is provisional. Distance is horizontal and does not establish eligibility or safeguarding status.</p></div>`;
}
function showDetails(p){document.querySelector('#details').innerHTML='<h2>Selected property</h2>'+propertyCard(p)}
function splitCSV(line){let out=[],v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v.trim());v=''}else v+=c}out.push(v.trim());return out}
function normaliseHeader(x){return String(x||'').toLowerCase().trim().replace(/[ _-]+/g,'')}
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw Error('The sheet has no data rows.');const raw=splitCSV(lines[0]);const aliases={id:['id','propertyid','ref','reference'],address:['address','propertyaddress','houseaddress'],postcode:['postcode','postalcode','zip'],latitude:['latitude','lat'],longitude:['longitude','lng','lon','long'],notes:['notes','note','comments','comment'],photos:['photos','photourls','photo','images','imageurls','photolinks']};const idx={};raw.forEach((h,i)=>{const n=normaliseHeader(h);for(const [key,vals] of Object.entries(aliases))if(vals.includes(n))idx[key]=i});if(idx.address===undefined)throw Error('Missing required column: Address.');const rows=[];lines.slice(1).forEach((line,i)=>{const a=splitCSV(line);if(!a.some(Boolean))return;const get=k=>idx[k]===undefined?'':(a[idx[k]]??'').trim();if(!get('address'))return;const lat=parseFloat(get('latitude')),lon=parseFloat(get('longitude'));rows.push({id:get('id')||String(rows.length+1).padStart(2,'0'),address:get('address'),postcode:get('postcode'),latitude:Number.isFinite(lat)?lat:null,longitude:Number.isFinite(lon)?lon:null,notes:get('notes'),photos:get('photos'),rowNumber:i+2})});if(!rows.length)throw Error('No usable property rows were found.');return rows}
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
function fitAll(){const pts=validProperties().map(p=>[+p.latitude,+p.longitude]);if(pts.length===1)map.setView(pts[0],17);else if(pts.length>1)map.fitBounds(pts,{padding:[60,60],maxZoom:17});else map.setView([51.5340,-0.2050],15.2);setTimeout(()=>map.invalidateSize(true),50)}
async function loadGoogleSheet(){const url=sheetCsvUrl();if(!url){setDataStatus('No Google Sheet is configured.','error');return}setDataStatus('Loading properties from Google Sheet…','loading');try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error(`Google returned HTTP ${res.status}`);properties=parseCSV(await res.text());const geo=await resolveMissingCoordinates(properties);render();fitAll();showUnresolved(geo.failed);setDataStatus(`${properties.length} properties loaded from Google Sheet · ${validProperties().length} located · ${new Date().toLocaleString('en-GB')}`,'ok')}catch(err){properties=samples.map(x=>({...x}));render();setDataStatus(`Google Sheet could not be loaded: ${err.message} Showing 20 sample properties instead.`,'error')}}
async function loadRoute(){
  tunnelLayer.clearLayers(); zoneLayer.clearLayers(); routeLines=[];
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
    }
    if(zone){
      L.geoJSON(zone,{style:{color:'#1f5f99',weight:2,opacity:.9,fillColor:'#4f91c7',fillOpacity:.22}}).addTo(zoneLayer);
    }
    document.querySelector('#showTunnel').checked=true;
    document.querySelector('#showZone').checked=true;
    if(!map.hasLayer(tunnelLayer))tunnelLayer.addTo(map);
    if(!map.hasLayer(zoneLayer))zoneLayer.addTo(map);
    document.querySelector('#routeStatus').textContent='HS2 route-in-tunnel trace digitised from the black/faint dashed line on the supplied Queen’s Park HS2 plan. The previous manually inferred twin-bore lines have been removed. Reference/screening geometry only; not a legal or survey boundary.';
  }catch(err){
    document.querySelector('#routeStatus').textContent='HS2 vector layer could not be loaded: '+err.message;
  }
  render();
}
document.querySelector('#search').addEventListener('input',render);document.querySelector('#status').addEventListener('change',render);
document.querySelector('#showTunnel').addEventListener('change',e=>e.target.checked?tunnelLayer.addTo(map):map.removeLayer(tunnelLayer));document.querySelector('#showZone').addEventListener('change',e=>e.target.checked?zoneLayer.addTo(map):map.removeLayer(zoneLayer));document.querySelector('#showHouses').addEventListener('change',e=>e.target.checked?markerLayer.addTo(map):map.removeLayer(markerLayer));
document.querySelector('#reloadSheet').addEventListener('click',loadGoogleSheet);
document.querySelector('#restore').addEventListener('click',()=>{properties=samples.map(x=>({...x}));document.querySelector('#csvFile').value='';render();fitAll();setDataStatus('Showing 20 sample properties.','')});
document.querySelector('#csvFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{properties=parseCSV(await f.text());const geo=await resolveMissingCoordinates(properties);render();fitAll();showUnresolved(geo.failed);setDataStatus(`${properties.length} properties loaded from local CSV · ${validProperties().length} located.`,'ok')}catch(err){alert('Could not import CSV: '+err.message);e.target.value=''}});
// Browsers can restore old form selections after a GitHub Pages refresh. Force a
// predictable startup state so newly loaded properties are never hidden.

// One-time cleanup of caches from the earlier prototype, which could contain
// results for placeholder addresses. Versioned v3 entries are retained.
try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('hs2qp:geocode:')&&!k.startsWith('hs2qp:geocode:'+GEOCODE_CACHE_VERSION+':'))localStorage.removeItem(k)}}catch(e){}
document.querySelector('#status').value='all';
document.querySelector('#search').value='';
document.querySelector('#showHouses').checked=true;
document.querySelector('#showTunnel').checked=true;
document.querySelector('#showZone').checked=true;
properties=samples.map(x=>({...x}));render();loadRoute().then(()=>{if(cfg.useGoogleSheet!==false)loadGoogleSheet();else setDataStatus('Google Sheet loading is disabled; showing sample properties.','')});

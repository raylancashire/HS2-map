/* Named tunnel alignments: selectable in public view; import is maintenance-only. */
(()=>{
 'use strict';
 const select=document.getElementById('routeVersionSelect');
 const status=document.getElementById('routeVersionStatus');
 const input=document.getElementById('routeVersionImport');
 let temporary=null;
 const defaultItem={name:'Original alignment',file:'hs2-route.geojson'};
 const safeFile=file=>typeof file==='string'&&/^[a-z0-9][a-z0-9_.-]*\.geojson$/i.test(file)&&!file.includes('..');
 async function choose(file){
   try{
     let data;
     if(file==='__temporary__')data=temporary;
     else {const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);data=await r.json()}
     if(!data||!Array.isArray(data.features)||!data.features.some(f=>['LineString','MultiLineString'].includes(f?.geometry?.type)))throw Error('No tunnel LineString found');
     window.hs2ActiveRouteFile=file==='__temporary__'?null:file;
     document.dispatchEvent(new Event('hs2-route-version-changed'));
     await loadRoute(data);
     status.textContent='Showing '+select.selectedOptions[0].text+'. Distances are estimates based on this alignment.';
   }catch(e){status.textContent='Could not switch route: '+e.message;}
 }
 select.addEventListener('change',()=>choose(select.value));
 input.addEventListener('change',async()=>{
   const file=input.files?.[0];if(!file)return;
   try{
     temporary=JSON.parse(await file.text());
     if(!Array.isArray(temporary.features)||!temporary.features.some(f=>['LineString','MultiLineString'].includes(f?.geometry?.type)))throw Error('GeoJSON must contain a LineString');
     let opt=select.querySelector('option[value="__temporary__"]');if(!opt){opt=document.createElement('option');opt.value='__temporary__';select.appendChild(opt)}
     opt.textContent='Preview: '+file.name;select.value=opt.value;await choose(opt.value);
     status.textContent+=' Local preview only; publish the GeoJSON and update routes.json to share it.';
   }catch(e){status.textContent='Import failed: '+e.message}
 });
 fetch('routes.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No manifest');return r.json()}).then(items=>{
   if(!Array.isArray(items))return;
   const seen=new Set(['hs2-route.geojson']);
   for(const item of items){if(!item||!safeFile(item.file)||seen.has(item.file))continue;seen.add(item.file);const opt=document.createElement('option');opt.value=item.file;opt.textContent=String(item.name||item.file);select.appendChild(opt)}
 }).catch(()=>{status.textContent='Showing original alignment. Additional published routes will appear here.'});
})();

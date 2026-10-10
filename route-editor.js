/* Standalone route alignment maintenance; does not alter property loading. */
(()=>{
  'use strict';
  if(document.documentElement.classList.contains('webador-public'))return;
  const start=document.getElementById('routeEditStart');
  const stop=document.getElementById('routeEditStop');
  const reset=document.getElementById('routeEditReset');
  const download=document.getElementById('routeEditDownload');
  const status=document.getElementById('routeEditStatus');
  let source=null,working=null,handles=[],active=false,dirty=false;
  const say=t=>{status.textContent=t};
  function feature(){return working?.features?.find(f=>f.geometry?.type==='LineString')}
  function clearHandles(){handles.forEach(h=>map.removeLayer(h));handles=[]}
  function makeHandles(){
    clearHandles();if(!active||!feature())return;
    feature().geometry.coordinates.forEach((coord,i)=>{
      const marker=L.marker([coord[1],coord[0]],{draggable:true,icon:L.divIcon({className:'route-edit-handle',iconSize:[15,15],iconAnchor:[7,7]})}).addTo(map);
      marker.on('drag',()=>{
        const pos=marker.getLatLng();feature().geometry.coordinates[i]=[pos.lng,pos.lat];
        // Update the route and the 30 m corridor as points move.
        loadRoute(working);
        dirty=true;download.disabled=false;
        say('Alignment modified. Download the GeoJSON to save it.');
      });
      handles.push(marker);
    });
  }
  async function readSource(){
    const r=await fetch(window.hs2ActiveRouteFile||'hs2-route.geojson',{cache:'no-store'});
    if(!r.ok)throw Error('Unable to load hs2-route.geojson');
    source=await r.json();working=structuredClone(source);
    if(!feature())throw Error('No LineString tunnel alignment found');
  }
  document.addEventListener('hs2-route-version-changed',()=>{active=false;clearHandles();source=null;working=null;dirty=false;start.disabled=false;stop.disabled=true;download.disabled=true;say('Selected route changed. Click Edit tunnel alignment to edit this version.');});
  // Turf offset uses a signed distance in metres; negative means right.
  document.getElementById('parallelGenerate').addEventListener('click',async()=>{
    try{
      const distance=Number(document.getElementById('parallelDistance').value);
      if(!Number.isFinite(distance)||distance<1||distance>1000)throw Error('Enter a separation between 1 and 1000 metres.');
      if(!window.turf||typeof turf.lineOffset!=='function')throw Error('The route offset library is unavailable.');
      // Always derive from the selected published route, not a prior preview.
      await readSource();
      const route=feature();
      const side=document.getElementById('parallelSide').value;
      const signed=distance*(side==='right'?-1:1);
      const offset=turf.lineOffset(turf.lineString(route.geometry.coordinates),signed,{units:'meters'});
      if(!offset?.geometry?.coordinates?.length)throw Error('Could not generate the parallel route.');
      route.geometry.coordinates=offset.geometry.coordinates;
      route.properties={...(route.properties||{}),parallel_of:window.hs2ActiveRouteFile||'hs2-route.geojson',offset_metres:distance,offset_side:side,provisional:true};
      dirty=true;download.disabled=false;
      await loadRoute(working);
      if(active)makeHandles();
      const filename=document.getElementById('routeVersionName');
      if(filename&&filename.value==='hs2-route-alternative')filename.value='hs2-route-parallel-'+side+'-'+distance+'m';
      say('Parallel route previewed '+distance+' m to the '+side+'. Download as a new GeoJSON to save; the original file has not changed.');
    }catch(e){say('Parallel route could not be generated: '+e.message)}
  });
  start.addEventListener('click',async()=>{
    try{if(!working)await readSource();active=true;start.disabled=true;stop.disabled=false;makeHandles();say('Drag purple handles to reposition the provisional tunnel route.');}
    catch(e){say(e.message)}
  });
  stop.addEventListener('click',()=>{active=false;clearHandles();start.disabled=false;stop.disabled=true;say(dirty?'Editing stopped. Download changes to retain them.':'Editing stopped.');});
  reset.addEventListener('click',async()=>{
    try{if(!source)await readSource();working=structuredClone(source);dirty=false;download.disabled=true;await loadRoute(working);makeHandles();say('Unsaved changes discarded.');}
    catch(e){say(e.message)}
  });
  download.addEventListener('click',()=>{
    if(!working)return;
    const blob=new Blob([JSON.stringify(working,null,2)+'\n'],{type:'application/geo+json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(document.getElementById('routeVersionName')?.value||'hs2-route-new').trim().replace(/[^a-z0-9_-]+/gi,'-')+'.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('Route version downloaded. Upload it to GitHub and register it in routes.json to publish.');
  });
})();

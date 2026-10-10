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

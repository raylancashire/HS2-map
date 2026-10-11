/* Second alignment overlay and property-distance recalculation. */
(()=>{
 'use strict';
 const primary=document.getElementById('routeVersionSelect');
 const secondary=document.getElementById('compareRouteSelect');
 const enabled=document.getElementById('compareRouteEnabled');
 const corridor=document.getElementById('compareRouteCorridor');
 const status=document.getElementById('compareRouteStatus');
 const overlay=L.layerGroup().addTo(map);
 const safe=f=>typeof f==='string'&&/^[a-z0-9][a-z0-9_.-]*\.geojson$/i.test(f)&&!f.includes('..');
 let request=0;
 function setComparison(lines){document.dispatchEvent(new CustomEvent('hs2-comparison-route-changed',{detail:{lines}}));}
 async function options(){
  try{
   const r=await fetch('routes.json',{cache:'no-store'});
   if(!r.ok)throw Error('No route manifest');
   const items=await r.json();
   if(!Array.isArray(items))throw Error('Invalid route manifest');
   secondary.replaceChildren();
   const seen=new Set();
   for(const item of [{name:'Original alignment',file:'hs2-route.geojson'},...items]){
    if(!safe(item.file)||seen.has(item.file))continue;
    seen.add(item.file);
    const option=document.createElement('option');option.value=item.file;option.textContent=item.name||item.file;secondary.append(option);
   }
   if(secondary.options.length>1)secondary.selectedIndex=1;
   else status.textContent='Publish a second GeoJSON route and list it in routes.json to compare both tunnels.';
  }catch(e){status.textContent='Could not read published routes: '+e.message;}
  draw();
 }
 async function draw(){
  const token=++request;overlay.clearLayers();setComparison([]);
  if(!enabled.checked){status.textContent='Second alignment hidden.';return;}
  const file=secondary.value;
  if(!file){status.textContent='No second published route available.';return;}
  if(file===primary.value){status.textContent='Choose a different route for the second tunnel.';return;}
  try{
   const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();if(token!==request)return;
   const lines=(data.features||[]).filter(f=>['LineString','MultiLineString'].includes(f?.geometry?.type));
   if(!lines.length)throw Error('No tunnel line in file');
   for(const line of lines){
    if(corridor.checked&&window.turf?.buffer){
     const area=turf.buffer(line,30,{units:'meters',steps:32});
     L.geoJSON(area,{style:{color:'#087d9d',weight:1,opacity:.6,fillColor:'#20a8c4',fillOpacity:.13},interactive:false}).addTo(overlay);
    }
    L.geoJSON(line,{style:{color:'#087d9d',weight:4,opacity:.95,dashArray:'5 6'},interactive:false}).addTo(overlay);
   }
   const coords=[];
   for(const feature of lines){
    const g=feature.geometry;
    const segments=g.type==='MultiLineString'?g.coordinates:[g.coordinates];
    for(const segment of segments){if(segment.length>1)coords.push(segment.map(c=>[c[1],c[0]]));}
   }
   setComparison(coords);
   status.textContent='Blue dashed line: '+secondary.selectedOptions[0].text+'. Property colours now reflect distance to the nearer displayed tunnel.';
  }catch(e){if(token===request)status.textContent='Second route could not be displayed: '+e.message;}
 }
 enabled.addEventListener('change',draw);
 secondary.addEventListener('change',draw);
 corridor.addEventListener('change',draw);
 primary.addEventListener('change',draw);
 document.addEventListener('hs2-route-version-changed',draw);
 options();
})();

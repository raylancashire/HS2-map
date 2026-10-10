/* Queen's Park ward boundary editor. Isolated from property and tunnel data. */
(()=>{
  'use strict';
  if(document.documentElement.classList.contains('webador-public'))return;
  const el=id=>document.getElementById(id);
  const buttons={start:el('wardEditStart'),stop:el('wardEditStop'),remove:el('wardEditRemove'),undo:el('wardEditUndo'),reset:el('wardEditReset'),download:el('wardEditDownload')};
  const status=el('wardEditStatus');
  const say=t=>status.textContent=t;
  let original=null,working=null,selected=-1,active=false,handles=[],edgeLayer=null,history=[];
  const clone=o=>JSON.parse(JSON.stringify(o));
  function ring(){return working?.features?.[0]?.geometry?.coordinates?.[0]}
  function isValid(){const f=working?.features?.[0];return f && f.geometry?.type==='Polygon' && Array.isArray(ring()) && ring().length>=4}
  function points(){return ring().slice(0,-1)}
  function commitPoints(pts){ring().splice(0,ring().length,...pts.map(p=>p.slice()),pts[0].slice());}
  function checkpoint(){history.push(clone(working));if(history.length>100)history.shift();buttons.undo.disabled=false}
  function clear(){handles.forEach(x=>map.removeLayer(x));handles=[];if(edgeLayer){map.removeLayer(edgeLayer);edgeLayer=null}}
  function refresh(){wardBoundaryLayer.clearLayers();wardBoundaryLayer.addData(working);}
  function changed(){refresh();buttons.download.disabled=false;buttons.reset.disabled=false;say('Boundary preview changed. Download GeoJSON to save it.');}
  function render(){
    clear();if(!active||!isValid())return;
    const pts=points();
    edgeLayer=L.polyline(pts.map(p=>[p[1],p[0]]).concat([[pts[0][1],pts[0][0]]]),{color:'#763aa5',weight:12,opacity:0.01,interactive:true}).addTo(map);
    edgeLayer.on('click',e=>{
      const pt=e.latlng;let best=Infinity,insertAt=0;
      const target=map.latLngToLayerPoint(pt);
      for(let i=0;i<pts.length;i++){
        const a=map.latLngToLayerPoint([pts[i][1],pts[i][0]]),b=map.latLngToLayerPoint([pts[(i+1)%pts.length][1],pts[(i+1)%pts.length][0]]);
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.y-a.y)*dy)/(dx*dx+dy*dy||1)));
        const d=Math.hypot(target.x-(a.x+t*dx),target.y-(a.y+t*dy));if(d<best){best=d;insertAt=i+1;}
      }
      checkpoint();pts.splice(insertAt,0,[pt.lng,pt.lat]);commitPoints(pts);selected=insertAt;changed();render();
    });
    pts.forEach((p,i)=>{
      const icon=L.divIcon({className:'ward-edit-handle'+(selected===i?' selected':''),iconSize:[14,14],iconAnchor:[7,7]});
      const marker=L.marker([p[1],p[0]],{draggable:true,icon}).addTo(map);
      marker.on('click',()=>{selected=i;buttons.remove.disabled=pts.length<=3;render()});
      marker.on('dragstart',checkpoint);
      marker.on('drag',()=>{const q=points(),pos=marker.getLatLng();q[i]=[pos.lng,pos.lat];commitPoints(q);changed()});
      marker.on('dragend',()=>render());handles.push(marker);
    });
    buttons.remove.disabled=selected<0||pts.length<=3;
  }
  function capture(){
    const data=wardBoundaryLayer.toGeoJSON();
    if(!data.features?.length)throw Error('Ward boundary has not loaded.');
    if(data.features.length!==1||data.features[0].geometry?.type!=='Polygon'||data.features[0].geometry.coordinates.length!==1)throw Error('This editor currently supports a single Polygon with no interior holes.');
    original=clone(data);working=clone(data);if(!isValid())throw Error('Invalid ward polygon.');
  }
  buttons.start.addEventListener('click',()=>{
    try{capture();active=true;history=[];selected=-1;buttons.start.disabled=true;buttons.stop.disabled=false;buttons.undo.disabled=true;buttons.reset.disabled=true;buttons.download.disabled=true;render();say('Drag a purple point, or click a boundary edge to add one.');}
    catch(err){say(err.message)}
  });
  buttons.stop.addEventListener('click',()=>{active=false;clear();buttons.start.disabled=false;buttons.stop.disabled=true;buttons.remove.disabled=true;say('Editing stopped. Preview remains visible; download or discard changes.');});
  buttons.remove.addEventListener('click',()=>{const pts=points();if(selected<0||pts.length<=3)return;checkpoint();pts.splice(selected,1);commitPoints(pts);selected=-1;changed();render()});
  buttons.undo.addEventListener('click',()=>{if(!history.length)return;working=history.pop();selected=-1;changed();render();buttons.undo.disabled=!history.length});
  buttons.reset.addEventListener('click',()=>{if(!original)return;working=clone(original);history=[];selected=-1;refresh();render();buttons.undo.disabled=true;buttons.reset.disabled=true;buttons.download.disabled=true;say('Reverted to the boundary loaded when editing began.');});
  buttons.download.addEventListener('click',()=>{
    if(!isValid())return;
    const blob=new Blob([JSON.stringify(working,null,2)+'\n'],{type:'application/geo+json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='queens-park-ward.geojson';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('Downloaded queens-park-ward.geojson. Upload this file to the GitHub repository to publish the corrected boundary.');
  });
  document.addEventListener('hs2-ward-loaded',()=>{
    if(active){active=false;clear();buttons.start.disabled=false;buttons.stop.disabled=true;buttons.remove.disabled=true;}
    say('Ward boundary loaded. Click Edit ward boundary to begin.');
  });
})();

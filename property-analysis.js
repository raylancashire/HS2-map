// Analysis reads the existing in-memory property records; no extra network requests.
(()=>{
 const panel=document.getElementById('propertyAnalysis');
 if(!panel)return;
 const $=id=>document.getElementById(id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const hasDistance=p=>Number.isFinite(p.distance);
 const noDamage=p=>/^(?:unaffected|non[ -]?affected|no damage(?: recorded)?|no visible damage|none|nil)[.!\s]*$/i.test(String(p.damage||'').trim());
 const damageCategory=p=>!String(p.damage||'').trim()?'Not recorded':noDamage(p)?'No damage reported':'Observation recorded';
 const street=p=>{
   const s=String(p.address||'').trim();
   const m=s.match(/^\s*\d+\s*[a-zA-Z]?\s+(.+)$/);
   return m?m[1].trim():(s||'Other addresses');
 };
 const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);const k=Math.floor(b.length/2);return b.length%2?b[k]:(b[k-1]+b[k])/2};
 const bands=[['0–15 m',p=>hasDistance(p)&&p.distance<=15,'#c62828'],['15–30 m',p=>hasDistance(p)&&p.distance>15&&p.distance<=30,'#f28c28'],['30–60 m',p=>hasDistance(p)&&p.distance>30&&p.distance<=60,'#e6bc30'],['60–100 m',p=>hasDistance(p)&&p.distance>60&&p.distance<=100,'#339966'],['Over 100 m',p=>hasDistance(p)&&p.distance>100,'#2878b8'],['Unknown',p=>!hasDistance(p),'#888888']];
 function bars(id,rows){const max=Math.max(1,...rows.map(x=>x[1]));$(id).innerHTML=rows.map(([label,n,color])=>`<div class="analysis-bar-row"><span>${escape(label)}</span><div class="analysis-track"><div class="analysis-fill" style="width:${100*n/max}%;background:${color||'#2c709c'}"></div></div><strong>${n}</strong></div>`).join('')}
 function render(){
  const api=window.HS2PropertyAnalysis;if(!api)return;
  const ps=api.getProperties();const known=ps.filter(hasDistance);const observed=ps.filter(p=>damageCategory(p)==='Observation recorded');
  const stats=[['Properties recorded',ps.length],['Located / measured',known.length],['Observations recorded',observed.length],['Streets',new Set(ps.map(street)).size]];
  $('analysisStats').innerHTML=stats.map(([label,n])=>`<div class="analysis-stat"><strong>${n}</strong><span>${escape(label)}</span></div>`).join('');
  bars('analysisDistance',bands.map(([name,fn,color])=>[name,ps.filter(fn).length,color]));
  bars('analysisDamage',['Observation recorded','No damage reported','Not recorded'].map(k=>[k,ps.filter(p=>damageCategory(p)===k).length]));
  const groups=new Map();ps.forEach(p=>{const name=street(p);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(p)});
  const ordered=[...groups].sort((a,b)=>a[0].localeCompare(b[0],'en-GB',{numeric:true}));
  $('analysisStreets').innerHTML=`<table class="analysis-table"><thead><tr><th>Street</th><th>Properties</th><th>Median distance</th><th>Observations</th></tr></thead><tbody>${ordered.map(([name,items],i)=>{
   const d=median(items.filter(hasDistance).map(p=>p.distance));const obs=items.filter(p=>damageCategory(p)==='Observation recorded').length;
   return `<tr><td><details class="analysis-street-details"><summary>${escape(name)}</summary>${items.map(p=>`<button type="button" data-analysis-index="${ps.indexOf(p)}">${escape(p.address)}</button>`).join('')}</details></td><td>${items.length}</td><td>${d===null?'—':Math.round(d)+' m'}</td><td>${obs}</td></tr>`;
  }).join('')}</tbody></table>`;
  $('analysisNote').textContent='Reported observations are not proof that HS2 caused damage. A blank damage field means not recorded, not unaffected. Distances are approximate and may change with the selected alignment.';
 }
 $('analysisStreets').addEventListener('click',e=>{const btn=e.target.closest('[data-analysis-index]');if(!btn)return;const p=window.HS2PropertyAnalysis?.getProperties()[Number(btn.dataset.analysisIndex)];if(p){panel.open=false;window.HS2PropertyAnalysis.focusProperty(p);window.scrollTo?.({top:0,behavior:'smooth'});}});
 $('analysisExport').addEventListener('click',()=>{
  const ps=window.HS2PropertyAnalysis?.getProperties()||[];
  const fields=['Address','Postcode','Street','Estimated distance (m)','Damage category','Damage description'];
  const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
  const rows=ps.map(p=>[p.address,p.postcode,street(p),hasDistance(p)?Math.round(p.distance):'',damageCategory(p),p.damage]);
  const csv='\uFEFF'+[fields,...rows].map(row=>row.map(quote).join(',')).join('\r\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='hs2-property-analysis.csv';document.body.append(a);a.click();a.remove();
 });
 document.addEventListener('hs2-properties-updated',()=>{if(panel.open)render()});
 panel.addEventListener('toggle',()=>{if(panel.open)render()});
})();

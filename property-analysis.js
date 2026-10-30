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
 // Keep street names as recorded; possible spelling errors are flagged, not silently merged.
 function renderStreetReport(ps){
  let host=document.getElementById('analysisStreetReport');
  if(!host){
   host=document.createElement('details');host.id='analysisStreetReport';host.className='analysis-accordion';
   const target=document.getElementById('analysisStreets');
   target.parentElement.parentElement.insertBefore(host,target.parentElement);
  }
  const groups=new Map();
  ps.forEach(p=>{const name=street(p);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(p)});
  const rows=[...groups].map(([name,items])=>({name,total:items.length,near:items.filter(p=>hasDistance(p)&&p.distance<=30).length,obs:items.filter(p=>damageCategory(p)==='Observation recorded').length,med:median(items.filter(hasDistance).map(p=>p.distance))}));
  rows.sort((a,b)=>b.near-a.near||b.obs-a.obs||a.name.localeCompare(b.name));
  const top=rows.slice(0,10);
  host.innerHTML=`<summary>Street proximity &amp; reported observations — summary report</summary><div class="analysis-accordion-body">
   <p class="hint">Calculated from all ${ps.length} recorded properties, not just the current map viewport. Distances refer to the selected tunnel alignment.</p>
   <p><strong>${ps.filter(p=>hasDistance(p)&&p.distance<=30).length}</strong> recorded properties are estimated to be within 30 m of the alignment. <strong>${ps.filter(p=>damageCategory(p)==='Observation recorded').length}</strong> have reported observations. These figures describe this dataset only, not all properties on each street.</p>
   <div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Street</th><th>Recorded properties</th><th>Within 30 m</th><th>% within 30 m</th><th>Observations</th><th>Median distance</th></tr></thead><tbody>${top.map(r=>`<tr><td>${escape(r.name)}</td><td>${r.total}</td><td>${r.near}</td><td>${Math.round(100*r.near/r.total)}%</td><td>${r.obs}</td><td>${r.med===null?'—':Math.round(r.med)+' m'}</td></tr>`).join('')}</tbody></table></div>
   <p class="hint">Ranked by the number of recorded properties within 30 m, then by observations. A higher count can reflect more submitted records, not necessarily greater damage. Reported cracks or other observations do not establish that HS2 caused them. Distances are indicative, and property coverage is not a complete survey.</p>
   <p class="hint">Please check street-name inconsistencies (for example, Oliphant/Oilphant and Kilravock/Kilravok) in the source sheet rather than automatically merging them.</p></div>`;
 }
 // Turn the existing chart and street sections into individually collapsible panels.
 // Native <details> allows only one panel to stay open at a time.
 const analysisContent=panel.querySelector('.analysis-content');
 const sections=[...analysisContent.querySelectorAll('.analysis-grid > section'),...analysisContent.querySelectorAll(':scope > section')];
 sections.forEach((section,index)=>{
  const heading=section.querySelector(':scope > h2');if(!heading)return;
  const details=document.createElement('details');details.className='analysis-accordion';
  const summary=document.createElement('summary');summary.textContent=heading.textContent;
  const body=document.createElement('div');body.className='analysis-accordion-body';
  heading.remove();while(section.firstChild)body.appendChild(section.firstChild);
  details.append(summary,body);section.replaceWith(details);
  if(index===0)details.open=true;
 });
 // Move all report panels into one vertical column, matching the map pane width.
 const chartGrid=analysisContent.querySelector('.analysis-grid');
 if(chartGrid){chartGrid.classList.add('analysis-accordion-stack');}
 analysisContent.addEventListener('toggle',event=>{
  const target=event.target;
  if(!(target instanceof HTMLDetailsElement)||!target.classList.contains('analysis-accordion')||!target.open)return;
  analysisContent.querySelectorAll('.analysis-accordion').forEach(other=>{if(other!==target)other.open=false});
 },true);
 const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);const k=Math.floor(b.length/2);return b.length%2?b[k]:(b[k-1]+b[k])/2};
 const bands=[['0–15 m',p=>hasDistance(p)&&p.distance<=15,'#c62828'],['15–30 m',p=>hasDistance(p)&&p.distance>15&&p.distance<=30,'#f28c28'],['30–60 m',p=>hasDistance(p)&&p.distance>30&&p.distance<=60,'#e6bc30'],['60–100 m',p=>hasDistance(p)&&p.distance>60&&p.distance<=100,'#339966'],['Over 100 m',p=>hasDistance(p)&&p.distance>100,'#2878b8'],['Unknown',p=>!hasDistance(p),'#888888']];
 function bars(id,rows){const max=Math.max(1,...rows.map(x=>x[1]));$(id).innerHTML=rows.map(([label,n,color])=>`<div class="analysis-bar-row"><span>${escape(label)}</span><div class="analysis-track"><div class="analysis-fill" style="width:${100*n/max}%;background:${color||'#2c709c'}"></div></div><strong>${n}</strong></div>`).join('')}
 function renderVisibleDistance(){
  const api=window.HS2PropertyAnalysis;if(!api)return;
  const ps=typeof api.getVisibleProperties==='function'?api.getVisibleProperties():api.getProperties();
  bars('analysisDistance',bands.map(([name,fn,color])=>[name,ps.filter(fn).length,color]));
  const container=$('analysisDistance');
  let count=document.getElementById('analysisVisibleCount');
  if(!count){count=document.createElement('p');count.id='analysisVisibleCount';count.className='analysis-visible-count';container.parentElement.insertBefore(count,container);}
  count.textContent=`Showing ${ps.length} of ${api.getProperties().length} properties in the current map view`;
 }
 function renderClaims(all){
  const ps=all.filter(item=>!/^(excluded)$/i.test(String(item.mapVisibility||'').trim()));
  const norm=s=>String(s??'').trim().toLowerCase().replace(/[\\s_-]+/g,' ');
  const yes=ps.filter(item=>norm(item.claimReported)==='yes');
  const no=ps.filter(item=>norm(item.claimReported)==='no');
  const unknown=ps.length-yes.length-no.length;
  const results=['Pending','Under Review','Accepted','Rejected','Withdrawn','Settled','Other'];
  const grouped=results.map(label=>[label,yes.filter(item=>norm(item.claimResult)===norm(label)).length]);
  const notRecorded=yes.filter(item=>!norm(item.claimResult)).length;
  const unrecognised=yes.filter(item=>norm(item.claimResult)&&!results.some(label=>norm(item.claimResult)===norm(label))).length;
  const host=$('analysisClaims');
  if(!host)return;
  host.innerHTML=`<div class="analysis-stats claims-stats">
    <div class="analysis-stat"><strong>${yes.length}</strong><span>Claims reported</span></div>
    <div class="analysis-stat"><strong>${no.length}</strong><span>No claim reported</span></div>
    <div class="analysis-stat"><strong>${unknown}</strong><span>Unknown / not recorded</span></div>
    <div class="analysis-stat"><strong>${ps.length}</strong><span>Included properties</span></div>
   </div>
   <h3>Outcomes for reported claims</h3>
   <div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Claim result</th><th>Properties</th></tr></thead><tbody>
   ${grouped.map(([label,n])=>`<tr><td>${escape(label)}</td><td>${n}</td></tr>`).join('')}
   <tr><td>Not recorded</td><td>${notRecorded}</td></tr>
   ${unrecognised?`<tr><td>Other recorded values</td><td>${unrecognised}</td></tr>`:''}
   </tbody></table></div>
   <p class="hint">Outcome counts cover only properties marked Claim Reported = Yes. These are records in the Sheet, not independently verified claim decisions.</p>`;
 }
 function render(){
  const api=window.HS2PropertyAnalysis;if(!api)return;
  const ps=api.getProperties();renderClaims(ps);const known=ps.filter(hasDistance);const observed=ps.filter(p=>damageCategory(p)==='Observation recorded');
  const stats=[['Properties recorded',ps.length],['Located / measured',known.length],['Observations recorded',observed.length],['Streets',new Set(ps.map(street)).size]];
  $('analysisStats').innerHTML=stats.map(([label,n])=>`<div class="analysis-stat"><strong>${n}</strong><span>${escape(label)}</span></div>`).join('');
  renderVisibleDistance();
  renderStreetReport(ps);
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
 document.addEventListener('hs2-properties-updated',render);
 document.addEventListener('hs2-map-viewport-updated',()=>{if(panel.open)renderVisibleDistance()});
 panel.addEventListener('toggle',()=>{if(panel.open)render()});
 // Populate the always-visible summary even when the dashboard is closed.
 if(window.HS2PropertyAnalysis)render();
})();

(function(){
  const $=(q,el=document)=>el.querySelector(q);
  const currentSet=getCurrentSet();
  const STORAGE_KEY='yt_gallery_admin_draft_v2_'+currentSet.key;
  const VISIT_KEY='yt_gallery_visit_count_local_'+currentSet.key;
  const SORT_MODE_KEY='yt_gallery_item_sort_mode_'+currentSet.key;
  let sortMode=localStorage.getItem(SORT_MODE_KEY)==='1';

  $('#adminTitle').textContent=`Admin Page — ${currentSet.label}`;
  $('#dataFileLabel').textContent=currentSet.data;
  $('#exportBtn').textContent=`Export ${currentSet.data}`;
  $('#loadSampleBtn').textContent=`Load current ${currentSet.data}`;
  $('#setButtons').innerHTML=Object.entries(PORTFOLIO_SETS).map(([key,set])=>`<a class="btn ${key===currentSet.key?'primary':'ghost'}" href="admin.html?set=${key}">${set.label}</a>`).join('');

  function uid(){return 'vid-'+Math.random().toString(16).slice(2,10)}
  function suid(){return 'sec-'+Math.random().toString(16).slice(2,10)}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._tm);toast._tm=setTimeout(()=>t.classList.remove('show'),2200)}
  function parseYouTubeId(url){ if(!url)return null; url=String(url).trim(); if(/^[a-zA-Z0-9_-]{11}$/.test(url))return url; for(const re of [/youtu\.be\/([a-zA-Z0-9_-]{11})/,/[?&]v=([a-zA-Z0-9_-]{11})/,/\/embed\/([a-zA-Z0-9_-]{11})/,/\/shorts\/([a-zA-Z0-9_-]{11})/,/([a-zA-Z0-9_-]{11})(?!.*[a-zA-Z0-9_-]{11})/]){const m=url.match(re); if(m)return m[1]} return null; }
  const sanitize=t=>String(t??'').replace(/[<>]/g,'');
  function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY); if(raw){const s=JSON.parse(raw); return{sections:s.sections||[],items:s.items||[]}}}catch(e){} return{sections:[],items:[]}}
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  function normalize(){
    state.sections=(state.sections||[]).map((s,idx)=>({id:String(s.id||suid()),title:String(s.title||s.category||`Section ${idx+1}`),category:String(s.category||s.title||`Category ${idx+1}`),order:Number(s.order??(idx+1))})).sort((a,b)=>a.order-b.order);
    const fallback=state.sections[0]?.category||'Uncategorized';
    state.items=(state.items||[]).map(it=>({id:String(it.id||uid()),title:String(it.title||''),youtube_url:String(it.youtube_url||''),category:String(it.category||fallback),description:String(it.description||''),extra_links:Array.isArray(it.extra_links)?it.extra_links.filter(x=>x&&x.url).map(x=>({label:String(x.label||'Link'),url:String(x.url)})):[],tags:Array.isArray(it.tags)?it.tags.map(String).filter(Boolean):[],created_at:String(it.created_at||''),priority:Number(it.priority??9999),featured:!!it.featured}));
  }
  function toData(){return{version:2,generated_at:new Date().toISOString().replace('T',' ').slice(0,19),sections:state.sections.map(s=>({id:s.id,title:s.title,category:s.category,order:s.order})),items:state.items}}
  function download(filename,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}

  function replaceData(data,msg='Data loaded.'){
    state.sections=Array.isArray(data?.sections)?data.sections:[];
    state.items=Array.isArray(data?.items)?data.items:[];
    normalize();persist();renderAll();toast(msg);
  }

  function makeUniqueId(preferredId,existingIds,makeId){
    let id=String(preferredId||makeId());
    while(existingIds.has(id))id=makeId();
    existingIds.add(id);
    return id;
  }

  function mergeData(data){
    const incomingSections=Array.isArray(data?.sections)?data.sections:[];
    const incomingItems=Array.isArray(data?.items)?data.items:[];
    if(!incomingSections.length&&!incomingItems.length)return toast('Import kosong. Tiada data ditambah.');

    const sectionIds=new Set(state.sections.map(s=>String(s.id)));
    const itemIds=new Set(state.items.map(it=>String(it.id)));
    const categoryMap=new Map(state.sections.map(s=>[String(s.category||'').toLowerCase(),String(s.category||'')]));
    const existingItemKeys=new Set(state.items.map(it=>`${String(it.category||'').toLowerCase()}|${String(it.youtube_url||'').toLowerCase()}`));
    let nextOrder=Math.max(0,...state.sections.map(s=>Number(s.order)||0));
    let sectionsAdded=0,itemsAdded=0,itemsSkipped=0;

    incomingSections
      .slice()
      .sort((a,b)=>(Number(a?.order)||9999)-(Number(b?.order)||9999))
      .forEach((s,idx)=>{
        const title=String(s?.title||s?.category||`Imported Section ${idx+1}`).trim();
        const category=String(s?.category||s?.title||title).trim();
        if(!category)return;
        const key=category.toLowerCase();
        if(categoryMap.has(key))return;
        nextOrder+=1;
        state.sections.push({
          id:makeUniqueId(s?.id,sectionIds,suid),
          title:title||category,
          category,
          order:nextOrder
        });
        categoryMap.set(key,category);
        sectionsAdded+=1;
      });

    incomingItems.forEach((it,idx)=>{
      const youtubeUrl=String(it?.youtube_url||'').trim();
      const category=String(it?.category||'Uncategorized').trim()||'Uncategorized';
      const itemKey=`${category.toLowerCase()}|${youtubeUrl.toLowerCase()}`;
      if(youtubeUrl&&existingItemKeys.has(itemKey)){itemsSkipped+=1;return;}

      if(!categoryMap.has(category.toLowerCase())){
        nextOrder+=1;
        state.sections.push({id:makeUniqueId('',sectionIds,suid),title:category,category,order:nextOrder});
        categoryMap.set(category.toLowerCase(),category);
        sectionsAdded+=1;
      }

      state.items.push({
        id:makeUniqueId(it?.id,itemIds,uid),
        title:String(it?.title||`Imported Item ${idx+1}`),
        youtube_url:youtubeUrl,
        category,
        description:String(it?.description||''),
        extra_links:Array.isArray(it?.extra_links)?it.extra_links:[],
        tags:Array.isArray(it?.tags)?it.tags:[],
        created_at:String(it?.created_at||''),
        priority:Number(it?.priority??9999),
        featured:!!it?.featured
      });
      if(youtubeUrl)existingItemKeys.add(itemKey);
      itemsAdded+=1;
    });

    normalize();persist();renderAll();
    toast(`Import added: ${sectionsAdded} section, ${itemsAdded} item${itemsSkipped?`, ${itemsSkipped} duplicate skipped`:''}.`);
  }

  localStorage.setItem(VISIT_KEY,String(Number(localStorage.getItem(VISIT_KEY)||'0')+1)); $('#visitCount').textContent=localStorage.getItem(VISIT_KEY);

  function setSectionForm(s){$('#sec_id').value=s?.id||'';$('#sec_title').value=s?.title||'';$('#sec_category').value=s?.category||'';$('#sec_order').value=String(s?.order??(state.sections.length+1));$('#sec_mode').textContent=s?'Edit':'New'}
  function getSectionForm(){const id=($('#sec_id').value||'').trim()||suid();return{id,title:($('#sec_title').value||'').trim(),category:($('#sec_category').value||'').trim(),order:Number(($('#sec_order').value||'').trim()||999)}}
  function upsertSection(s){if(!s.title)return toast('Section title wajib.'); if(!s.category)return toast('Category wajib.'); const others=state.sections.filter(x=>x.id!==s.id).map(x=>x.category.toLowerCase()); if(others.includes(s.category.toLowerCase()))return toast('Category duplicate.'); const idx=state.sections.findIndex(x=>x.id===s.id); if(idx>=0)state.sections[idx]=s; else state.sections.push(s); state.sections.sort((a,b)=>a.order-b.order); const cats=new Set(state.sections.map(x=>x.category)); const fallback=state.sections[0]?.category||'Uncategorized'; state.items.forEach(it=>{if(!cats.has(it.category))it.category=fallback}); persist();renderAll();toast('Section saved.');setSectionForm(s)}
  function deleteSection(id){const idx=state.sections.findIndex(x=>x.id===id); if(idx<0)return; const cat=state.sections[idx].category; state.sections.splice(idx,1); const fallback=state.sections[0]?.category||'Uncategorized'; state.items.forEach(it=>{if(it.category===cat)it.category=fallback}); persist();renderAll();toast('Section deleted.');setSectionForm(null)}
  function moveSection(id,dir){const sorted=state.sections.slice().sort((a,b)=>a.order-b.order);const i=sorted.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=sorted.length)return;[sorted[i].order,sorted[j].order]=[sorted[j].order,sorted[i].order];state.sections=sorted.sort((a,b)=>a.order-b.order);persist();renderAll()}
  function renderSections(){const rows=$('#sec_rows');rows.innerHTML=''; if(!state.sections.length){rows.innerHTML='<div class="notice">Tiada section. Tambah section dulu.</div>';return} for(const s of state.sections.slice().sort((a,b)=>a.order-b.order)){const row=document.createElement('div');row.className='row';row.innerHTML=`<div><div><strong>${sanitize(s.title)}</strong></div><div class="pill">Category: ${sanitize(s.category)}</div></div><div class="hide-sm"><div class="pill">Order: ${sanitize(s.order)}</div></div><div class="hide-md"><div class="pill">ID: ${sanitize(s.id)}</div></div><div class="row-actions"><button class="btn sm ghost edit">Edit</button><button class="btn sm ghost up">↑</button><button class="btn sm ghost down">↓</button><button class="btn sm danger del">Delete</button></div>`;row.querySelector('.edit').addEventListener('click',()=>setSectionForm(s));row.querySelector('.up').addEventListener('click',()=>moveSection(s.id,-1));row.querySelector('.down').addEventListener('click',()=>moveSection(s.id,1));row.querySelector('.del').addEventListener('click',()=>{if(confirm(`Delete section "${s.title}"? Items akan dipindah.`))deleteSection(s.id)});rows.appendChild(row)}}

  function refreshCategorySelect(){ $('#category').innerHTML=state.sections.map(s=>`<option value="${sanitize(s.category)}">${sanitize(s.category)}</option>`).join('') }
  function setItemForm(it){refreshCategorySelect();$('#id').value=it?.id||'';$('#title').value=it?.title||'';$('#youtube_url').value=it?.youtube_url||'';$('#created_at').value=it?.created_at||new Date().toISOString().slice(0,10);$('#priority').value=String(it?.priority??'');$('#featured').checked=!!it?.featured;$('#tags').value=(it?.tags||[]).join(', ');$('#description').value=it?.description||'';$('#category').value=it?.category||(state.sections[0]?.category||'');$('#extra_links').value=(it?.extra_links||[]).map(l=>`${l.label||'Link'} | ${l.url}`).join('\n');const v=$('#youtube_url').value||'';$('#yt_status').textContent=v?(parseYouTubeId(v)?'OK':'Invalid link'):'-';$('#item_mode').textContent=it?'Edit':'New'}
  function parseExtraLinks(text){return String(text||'').split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{const parts=line.split('|').map(s=>s.trim());return parts.length===1?{label:'Link',url:parts[0]}:{label:parts[0]||'Link',url:parts.slice(1).join(' | ').trim()}}).filter(x=>x.url)}

  function pnum(v){const n=Number(v);return Number.isFinite(n)?n:9999}
  function sectionRank(cat){const s=state.sections.find(x=>x.category===cat);return pnum(s?.order)}
  function sortedItems(list){
  return list.slice().sort((a,b)=>
    pnum(a.priority)-pnum(b.priority) ||
    new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )
}
  
  
  function getCurrentSortScope(){const cat=($('#filter_cat').value||'').trim();let list=state.items.slice();if(cat)list=list.filter(it=>it.category===cat);return sortedItems(list)}
  function reorderItemByDrop(draggedId,targetId,placeAfter){const scope=getCurrentSortScope();const from=scope.findIndex(it=>it.id===draggedId);let to=scope.findIndex(it=>it.id===targetId);if(from<0||to<0||draggedId===targetId)return;if(placeAfter)to+=1;const [moved]=scope.splice(from,1);if(from<to)to-=1;scope.splice(Math.max(0,Math.min(to,scope.length)),0,moved);scope.forEach((it,idx)=>{it.priority=idx+1});const pos=new Map(state.items.map((it,idx)=>[it.id,idx]));state.items.sort((a,b)=>sectionRank(a.category)-sectionRank(b.category)||pnum(a.priority)-pnum(b.priority)||(pos.get(a.id)||0)-(pos.get(b.id)||0));persist();renderItems();toast('Order updated. Export JSON to save it permanently.')}
  function updateSortUi(canDrag=true){const btn=$('#sortToggleBtn'),help=$('#sortHelp'),rows=$('#rows');if(!btn||!help)return;btn.textContent=sortMode?'Done Sorting':'Sorting Mode';btn.className=sortMode?'btn primary':'btn ghost';if(rows)rows.classList.toggle('sort-mode',sortMode);help.hidden=!sortMode;help.textContent=canDrag?'Sorting mode: compact view is on. Drag the handle to rearrange items. The new order is saved into Priority automatically.':'Sorting mode: clear Search / Featured filter first before dragging, so the order does not update only a partial list.'}
  function getItemForm(){const id=($('#id').value||'').trim()||uid();return{id,title:($('#title').value||'').trim(),youtube_url:($('#youtube_url').value||'').trim(),category:($('#category').value||'').trim(),description:($('#description').value||'').trim(),extra_links:parseExtraLinks($('#extra_links').value||''),tags:($('#tags').value||'').split(',').map(s=>s.trim()).filter(Boolean),created_at:($('#created_at').value||'').trim(),priority:Number((($('#priority').value||'').trim())||9999),featured:$('#featured').checked}}
  function upsertItem(it){const idx=state.items.findIndex(x=>x.id===it.id); if(idx>=0)state.items[idx]=it; else state.items.unshift(it); persist();renderItems();toast('Item saved.');setItemForm(it)}
  function deleteItem(id){const idx=state.items.findIndex(x=>x.id===id); if(idx<0)return; state.items.splice(idx,1);persist();renderItems();toast('Item deleted.');setItemForm(null)}
  function renderItems(){
    refreshCategorySelect();
    const cats=state.sections.map(s=>s.category);
    const prevCat=($('#filter_cat').value||'').trim();
    $('#filter_cat').innerHTML='<option value="">Semua category</option>'+cats.map(c=>`<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('');
    $('#filter_cat').value=cats.includes(prevCat)?prevCat:'';
    const q=($('#search').value||'').toLowerCase().trim(),cat=($('#filter_cat').value||'').trim(),feat=($('#filter_feat').value||'').trim();
    let list=sortedItems(state.items.slice());
    if(cat)list=list.filter(it=>it.category===cat);
    if(feat==='featured')list=list.filter(it=>!!it.featured);
    if(q)list=list.filter(it=>`${it.title} ${it.description} ${it.tags.join(' ')} ${it.youtube_url} ${it.category}`.toLowerCase().includes(q));
    const canDrag=sortMode&&!q&&!feat;
    $('#count').textContent=`${list.length} item`;
    const rows=$('#rows');
    rows.innerHTML='';
    updateSortUi(canDrag);
    if(!list.length){rows.innerHTML='<div class="notice">Tiada item.</div>';return}
    for(const it of list){
      const ok=!!parseYouTubeId(it.youtube_url);
      const row=document.createElement('div');
      row.dataset.id=it.id;
      row.className=sortMode?`row compact-row ${canDrag?'draggable-row':'sort-disabled'}`:'row';
      if(canDrag)row.draggable=true;
      if(sortMode){
        row.innerHTML=`<div class="drag-handle" title="Drag to sort" aria-label="Drag to sort">☰</div><div class="compact-main"><strong>${sanitize(it.title||'(untitled)')}</strong><div class="compact-meta"><span>${sanitize(it.category||'-')}</span><span>Priority: ${sanitize(it.priority??'-')}</span><span>${sanitize(it.created_at||'-')}</span>${it.featured?'<span>⭐ Featured</span>':''}</div></div><div class="compact-actions"><button class="btn sm ghost edit">Edit</button></div>`;
        row.querySelector('.edit').addEventListener('click',()=>setItemForm(it));
        if(canDrag){
          row.addEventListener('dragstart',e=>{row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',it.id)});
          row.addEventListener('dragend',()=>row.classList.remove('dragging'));
          row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drop-target');e.dataTransfer.dropEffect='move'});
          row.addEventListener('dragleave',()=>row.classList.remove('drop-target'));
          row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drop-target');const draggedId=e.dataTransfer.getData('text/plain');const rect=row.getBoundingClientRect();reorderItemByDrop(draggedId,it.id,e.clientY>rect.top+rect.height/2)});
        }
      }else{
        row.innerHTML=`<div><div><strong>${sanitize(it.title||'(untitled)')}</strong></div><div class="pill">${sanitize(it.category||'-')} • P:${sanitize(it.priority??'-')} • ${sanitize(it.created_at||'-')}</div></div><div class="hide-md"><div class="item-desc">${sanitize(it.description||'-')}</div></div><div class="hide-sm"><div class="pill">${ok?'YouTube OK':'Link invalid'}</div><div class="pill">${it.featured?'⭐ Featured':''}</div></div><div class="hide-lg"><div class="pill">${(it.tags||[]).slice(0,4).map(sanitize).join(', ')||'-'}</div></div><div class="row-actions"><button class="btn sm ghost edit">Edit</button><button class="btn sm danger del">Delete</button></div>`;
        row.querySelector('.edit').addEventListener('click',()=>setItemForm(it));
        row.querySelector('.del').addEventListener('click',()=>{if(confirm(`Delete "${it.title}"?`))deleteItem(it.id)});
      }
      rows.appendChild(row)
    }
  }
  function renderAll(){renderSections();renderItems()}
  const state=loadState(); normalize(); persist(); setSectionForm(null); setItemForm(null);

  $('#sec_newBtn').addEventListener('click',()=>setSectionForm(null)); $('#sec_saveBtn').addEventListener('click',()=>upsertSection(getSectionForm())); $('#sec_deleteBtn').addEventListener('click',()=>{const id=($('#sec_id').value||'').trim();if(!id)return toast('Tiada section dipilih.');const s=state.sections.find(x=>x.id===id);if(!s)return toast('Section tak jumpa.');if(confirm(`Delete section "${s.title}"?`))deleteSection(id)});
  $('#newBtn').addEventListener('click',()=>setItemForm(null)); $('#saveBtn').addEventListener('click',()=>{if(!state.sections.length)return toast('Tambah section dulu.');const it=getItemForm();if(!it.title)return toast('Title wajib.');if(!it.youtube_url)return toast('YouTube link wajib.');if(!parseYouTubeId(it.youtube_url))return toast('Link YouTube invalid.');upsertItem(it)}); $('#deleteBtn').addEventListener('click',()=>{const id=($('#id').value||'').trim();if(!id)return toast('Tiada item dipilih.');const it=state.items.find(x=>x.id===id);if(!it)return toast('Item tak jumpa.');if(confirm(`Delete "${it.title}"?`))deleteItem(id)});
  $('#exportBtn').addEventListener('click',()=>{download(currentSet.data,JSON.stringify(toData(),null,2));toast(`Export ${currentSet.data} siap.`)});
  $('#importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{mergeData(JSON.parse(await f.text()));setSectionForm(null);setItemForm(null);e.target.value=''}catch(err){console.error(err);toast('Import gagal: JSON tak valid.')}});
  $('#clearAllBtn').addEventListener('click',()=>{if(!confirm('Clear semua draft (localStorage)?'))return;state.sections=[];state.items=[];normalize();persist();renderAll();setSectionForm(null);setItemForm(null);toast('Cleared.')});
  $('#youtube_url').addEventListener('input',()=>{const v=$('#youtube_url').value||'';$('#yt_status').textContent=v?(parseYouTubeId(v)?'OK':'Invalid link'):'-'});
  ['input','change'].forEach(evt=>{$('#search').addEventListener(evt,renderItems);$('#filter_cat').addEventListener(evt,renderItems);$('#filter_feat').addEventListener(evt,renderItems)});
  $('#sortToggleBtn').addEventListener('click',()=>{sortMode=!sortMode;localStorage.setItem(SORT_MODE_KEY,sortMode?'1':'0');renderItems();toast(sortMode?'Sorting mode on. Drag compact rows to reorder.':'Sorting mode off.')});
  $('#loadSampleBtn').addEventListener('click',async()=>{try{const res=await fetch('./'+currentSet.data,{cache:'no-store'});replaceData(await res.json(),`Current ${currentSet.data} loaded.`);setSectionForm(null);setItemForm(null)}catch(e){toast(`Tak dapat load ${currentSet.data}. Import manual lebih selamat.`)}});
  renderAll();
})();

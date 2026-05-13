(function(){
  const $ = (q, el=document)=>el.querySelector(q);
  const currentSet = getCurrentSet();
  $('#pageTitle').textContent = currentSet.title;

  function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._tm); toast._tm=setTimeout(()=>t.classList.remove('show'),2200); }
  function parseYouTubeId(url){
    if(!url) return null; url=String(url).trim();
    if(/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    for(const re of [/youtu\.be\/([a-zA-Z0-9_-]{11})/,/[?&]v=([a-zA-Z0-9_-]{11})/,/\/embed\/([a-zA-Z0-9_-]{11})/,/\/shorts\/([a-zA-Z0-9_-]{11})/,/([a-zA-Z0-9_-]{11})(?!.*[a-zA-Z0-9_-]{11})/]){ const m=url.match(re); if(m) return m[1]; }
    return null;
  }
  const thumbUrl=id=>`https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const embedUrl=id=>`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  const sanitize=t=>String(t ?? '').replace(/[<>]/g,'');

  function renderSections(data){
    const wrap=$('#sections'); wrap.innerHTML='';
    const items=Array.isArray(data.items)?data.items:[];
    let sections=Array.isArray(data.sections)?data.sections.map(s=>({...s,order:Number(s.order??9999)})).sort((a,b)=>a.order-b.order):[];
    if(!sections.length){
      const cats=[...new Set(items.map(it=>it.category || 'Uncategorized'))];
      sections=cats.map((c,i)=>({id:'sec-'+i,title:c,category:c,order:i+1}));
    }
    const q=($('#search').value||'').toLowerCase().trim();
    const tag=($('#tagFilter').value||'').trim();
    const sort=($('#sort').value||'priority').trim();
    const base=items.filter(it=>{
      if(tag && !(Array.isArray(it.tags) && it.tags.map(String).includes(tag))) return false;
      if(q){ const hay=`${it.title||''} ${it.description||''} ${(it.tags||[]).join(' ')} ${it.category||''}`.toLowerCase(); return hay.includes(q); }
      return true;
    });
    const sorter=(a,b)=>{
      const ap=Number(a.priority??9999), bp=Number(b.priority??9999);
      if(sort==='priority'){ if(ap!==bp) return ap-bp; if(!!b.featured!==!!a.featured) return Number(!!b.featured)-Number(!!a.featured); return String(b.created_at||'').localeCompare(String(a.created_at||'')); }
      if(sort==='newest') return String(b.created_at||'').localeCompare(String(a.created_at||''));
      if(sort==='title') return String(a.title||'').localeCompare(String(b.title||''));
      if(!!b.featured!==!!a.featured) return Number(!!b.featured)-Number(!!a.featured);
      if(ap!==bp) return ap-bp;
      return String(b.created_at||'').localeCompare(String(a.created_at||''));
    };
    let total=0;
    for(const sec of sections){
      const cat=sec.category || sec.title || 'Uncategorized';
      const list=base.filter(it=>String(it.category||'Uncategorized')===String(cat)).sort(sorter);
      if(!list.length) continue; total+=list.length;
      const sectionEl=document.createElement('section'); sectionEl.className='section';
      sectionEl.innerHTML=`<div class="section-head"><div><h2 class="section-title">${sanitize(sec.title||cat)}</h2><div class="section-sub">${list.length} video</div></div></div><div class="row-scroller"></div>`;
      const scroller=sectionEl.querySelector('.row-scroller');
      for(const item of list){
        const yid=parseYouTubeId(item.youtube_url), img=yid?thumbUrl(yid):'';
        const tags=Array.isArray(item.tags)?item.tags:[];
        const card=document.createElement('article'); card.className='card';
        card.innerHTML=`<div class="thumb" role="button" tabindex="0">${img?`<img src="${img}" alt="${sanitize(item.title)}">`:''}<div class="play"><div class="triangle"></div></div></div><div class="body"><h3 class="title">${sanitize(item.title||'Untitled')}</h3><div class="meta">${item.featured?'<span class="badge">⭐ Featured</span>':''}</div><p class="desc">${sanitize(item.description||'')}</p><div class="tags">${tags.slice(0,6).map(t=>`<span class="tag">${sanitize(t)}</span>`).join('')}</div></div>`;
        const open=()=>openModal(item); card.querySelector('.thumb').addEventListener('click',open); card.querySelector('.thumb').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') open(); });
        scroller.appendChild(card);
      }
      wrap.appendChild(sectionEl);
    }
    $('#count').textContent=`${total} video`;
    if(total===0) wrap.innerHTML='<div class="notice">Tiada video match dengan filter/search.</div>';
  }

  function openModal(item){
    const id=parseYouTubeId(item.youtube_url); if(!id) return toast('Link YouTube tak valid.');
    $('#modalTitle').textContent=item.title||'Play'; $('#modal').classList.add('open');
    $('#player').innerHTML=`<iframe src="${embedUrl(id)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    $('#modalDesc').textContent=item.description||'';
    const linksWrap=$('#modalLinks'); linksWrap.innerHTML='';
    const links=Array.isArray(item.extra_links)?item.extra_links:[];
    links.forEach(l=>{ if(!l?.url) return; const a=document.createElement('a'); a.className='link'; a.href=String(l.url); a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=l.label?String(l.label):'Link'; linksWrap.appendChild(a); });
    linksWrap.style.display=linksWrap.children.length?'flex':'none'; document.body.style.overflow='hidden';
  }
  function closeModal(){ $('#modal').classList.remove('open'); $('#player').innerHTML=''; document.body.style.overflow=''; }
  async function load(){
    try{
      const res=await fetch('./'+currentSet.data,{cache:'no-store'}); const data=await res.json(); window.__DATA__=data;
      const tags=new Set(); (data.items||[]).forEach(it=>(it.tags||[]).forEach(t=>tags.add(String(t))));
      $('#tagFilter').innerHTML='<option value="">Semua tag</option>'+[...tags].sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${sanitize(t)}">${sanitize(t)}</option>`).join('');
      renderSections(data);
    }catch(e){ $('#sections').innerHTML=`<div class="notice">Tak dapat load <span class="kbd">${currentSet.data}</span>. Jika test local (file://), guna VSCode Live Server.</div>`; }
  }
  const rerender=()=>renderSections(window.__DATA__||{items:[]});
  ['input','change'].forEach(evt=>$('#search').addEventListener(evt,rerender));
  $('#tagFilter').addEventListener('change',rerender); $('#sort').addEventListener('change',rerender);
  $('#closeModal').addEventListener('click',closeModal); $('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); }); window.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
  load();
})();

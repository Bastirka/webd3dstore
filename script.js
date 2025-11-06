/* global Fuse */

// ==============================
// Config & State
// ==============================
const PAGE_SIZE = 9;
const state = {
  page: 1,
  q: '',
  tag: '',
  source: '',
  sort: 'relevance',
  results: [],
  data: []
};

// ==============================
// DOM Helpers
// ==============================
const el = sel => document.querySelector(sel);
const grid = el('#grid');
const count = el('#count');
const pageInfo = el('#pageInfo');
const prevBtn = el('#prev');
const nextBtn = el('#next');
const sourceSel = el('#sourceFilter');
const tagSel = el('#tagFilter');
const sortSel = el('#sortSel');
const qInput = el('#q');

// ==============================
// UI Helpers
// ==============================
function escapeHtml(s){
  return (s||'').replace(/[&<>\"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function externalIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3h7v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M10 14L21 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M21 14v6a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

// Pielāgot krāsu akcentus (ja CSS definēts .src-*)
function SOURCE_CLASS(name=''){
  name = (name||'').toLowerCase();
  if(name.includes('makerworld')) return 'src-mw';
  if(name.includes('creality'))   return 'src-cc';
  if(name.includes('thingiverse'))return 'src-tv';
  if(name.includes('cults'))      return 'src-c3d';
  if(name.includes('printables')) return 'src-pr';
  if(name.includes('thangs'))     return 'src-th';
  return '';
}

// ==============================
// Options, Search, Sort, Render
// ==============================
function renderOptions(){
  const sources = [...new Set(state.data.map(d=>d.source?.name).filter(Boolean))].sort();
  sourceSel.innerHTML = '<option value="">All sources</option>' + sources.map(s=>`<option>${s}</option>`).join('');

  const tags = [...new Set(state.data.flatMap(d=>d.tags||[]))].sort();
  tagSel.innerHTML = '<option value="">All tags</option>' + tags.map(t=>`<option>${t}</option>`).join('');
}

function applySearch(){
  const options = {
    keys: [
      {name:'name', weight:0.6},
      {name:'description', weight:0.2},
      {name:'tags', weight:0.2}
    ],
    threshold: 0.35,
    includeScore: true
  };

  let arr = state.data;
  if(state.q){
    const fuse = new Fuse(arr, options);
    arr = fuse.search(state.q).map(r=>({ ...r.item, _score: r.score }));
  } else {
    arr = arr.map(r=>({ ...r, _score: 1 }));
  }

  if(state.source) arr = arr.filter(r => r.source?.name === state.source);
  if(state.tag)    arr = arr.filter(r => (r.tags||[]).includes(state.tag));

  switch(state.sort){
    case 'name':
      arr.sort((a,b)=>a.name.localeCompare(b.name));
      break;
    case 'date':
      arr.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
      break;
    case 'popularity':
      arr.sort((a,b)=>(b.popularity||0)-(a.popularity||0));
      break;
    default: // relevance (zemāks score = labāk)
      arr.sort((a,b)=>(a._score||1)-(b._score||1));
  }

  state.results = arr;
  state.page = 1;
  renderPage();
}

function cardHTML(d){
  const tags = (d.tags||[]).slice(0,4).map(t=>`<span class="badge">${t}</span>`).join(' ');
  const img = d.image || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200';
  const sourceUrl = (d.source && d.source.url) ? d.source.url : `./details.html?id=${encodeURIComponent(d.id)}`;
  const sourceName = d.source?.name || '—';

  // “View on [Source]” poga (ja ir URL)
  const srcBtn = d.source?.url
    ? `<a class="btn btn-src ${SOURCE_CLASS(sourceName)}" href="${d.source.url}" target="_blank" rel="noopener">
         ${externalIcon()} <span>View on ${escapeHtml(sourceName)}</span>
       </a>`
    : '';

  return `<article class="card item">
    <a class="thumb-link" href="${sourceUrl}" target="_blank" rel="noopener">
      <img src="${img}" alt="${escapeHtml(d.name)}" class="thumb" loading="lazy">
    </a>
    <div class="item-body">
      <h3 class="item-title">
        <a href="./details.html?id=${encodeURIComponent(d.id)}">${escapeHtml(d.name)}</a>
      </h3>
      <div class="badges">${tags}</div>
      <div class="meta">
        <span>${escapeHtml(sourceName)}</span>
        <span>★ ${d.popularity||0}</span>
      </div>
      <div class="actions">
        ${srcBtn}
        <a class="btn" href="./details.html?id=${encodeURIComponent(d.id)}">Details</a>
      </div>
    </div>
  </article>`;
}

function renderPage(){
  const total = state.results.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const start = (state.page-1)*PAGE_SIZE;
  const slice = state.results.slice(start, start+PAGE_SIZE);

  count.textContent = total ? `${total} result${total>1?'s':''}` : 'No results';
  pageInfo.textContent = `Page ${state.page} / ${pages}`;
  prevBtn.disabled = state.page<=1;
  nextBtn.disabled = state.page>=pages;

  grid.innerHTML = slice.map(cardHTML).join('');
  document.getElementById('year').textContent = new Date().getFullYear();

  const params = new URLSearchParams({ q: state.q, tag: state.tag, source: state.source, sort: state.sort, page: state.page });
  history.replaceState(null, '', `?${params.toString()}`);
}

// ==============================
// External Platforms Quick Search
// ==============================
function buildPlatformUrls(q) {
  const e = encodeURIComponent((q||'').trim());
  return [
    { name: 'MakerWorld',     url: `https://makerworld.com/en/search?q=${e}` },
    { name: 'Creality Cloud', url: `https://www.crealitycloud.com/search?keyword=${e}` },
    { name: 'Thingiverse',    url: `https://www.thingiverse.com/search?q=${e}&type=things` },
    { name: 'Cults3D',        url: `https://cults3d.com/en/search?q=${e}` },
    { name: 'Printables',     url: `https://www.printables.com/search/models?q=${e}` },
    { name: 'Thangs',         url: `https://thangs.com/search/${e}` },
    { name: 'MyMiniFactory',  url: `https://www.myminifactory.com/search/?query=${e}` },
  ];
}

function renderExternalSearch(q) {
  const wrap = document.getElementById('extSearch');
  const btns = document.getElementById('extSearchBtns');
  if (!wrap || !btns) return;

  const term = (q || '').trim();
  if (!term) { wrap.style.display = 'none'; btns.innerHTML = ''; return; }

  const rows = buildPlatformUrls(term).map(p => {
    return `<a class="btn btn-src ${SOURCE_CLASS(p.name)}" href="${p.url}" target="_blank" rel="noopener">
      ${externalIcon()} <span>“${escapeHtml(term)}” on ${escapeHtml(p.name)}</span>
    </a>`;
  }).join('');

  btns.innerHTML = rows;
  wrap.style.display = 'block';
}

// ==============================
// Load & Events
// ==============================
async function load(){
  document.getElementById('year').textContent = new Date().getFullYear();

  const res = await fetch('./data/stl-index.json');
  state.data = await res.json();
  renderOptions();

  const usp = new URLSearchParams(location.search);
  state.q = usp.get('q') || '';
  state.tag = usp.get('tag') || '';
  state.source = usp.get('source') || '';
  state.sort = usp.get('sort') || 'relevance';
  state.page = parseInt(usp.get('page') || '1', 10);

  qInput.value = state.q;
  sourceSel.value = state.source;
  tagSel.value = state.tag;
  sortSel.value = state.sort;

  // Render both internal results + external quick-search
  applySearch();
  renderExternalSearch(state.q);
}

document.addEventListener('DOMContentLoaded', load);

// — Search interactions
el('#searchBtn').addEventListener('click', ()=>{
  state.q = qInput.value.trim();
  applySearch();
  renderExternalSearch(state.q);
});

qInput.addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    state.q = qInput.value.trim();
    applySearch();
    renderExternalSearch(state.q);
  }
});

// Live update external buttons as user types
qInput.addEventListener('input', ()=> renderExternalSearch(qInput.value));

// Optional: Ctrl/Cmd + Enter → open all platform searches at once
qInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    buildPlatformUrls(qInput.value).forEach(p => window.open(p.url, '_blank', 'noopener'));
  }
});

// — Filters & Sort
sourceSel.addEventListener('change', e=>{ state.source = e.target.value; applySearch(); });
tagSel.addEventListener('change', e=>{ state.tag = e.target.value; applySearch(); });
sortSel.addEventListener('change', e=>{ state.sort = e.target.value; applySearch(); });

// — Pagination
prevBtn.addEventListener('click', ()=>{ if(state.page>1){ state.page--; renderPage(); }});
nextBtn.addEventListener('click', ()=>{ const pages = Math.ceil(state.results.length/PAGE_SIZE); if(state.page<pages){ state.page++; renderPage(); }});

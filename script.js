/* global Fuse */
const PAGE_SIZE = 9;
const state = { page: 1, q: '', tag: '', source: '', sort: 'relevance', results: [], data: [] };

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
  if(state.tag) arr = arr.filter(r => (r.tags||[]).includes(state.tag));

  switch(state.sort){
    case 'name': arr.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case 'date': arr.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); break;
    case 'popularity': arr.sort((a,b)=>(b.popularity||0)-(a.popularity||0)); break;
    default: // relevance
      arr.sort((a,b)=>(a._score||1)-(b._score||1));
  }
  state.results = arr;
  state.page = 1;
  renderPage();
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

function cardHTML(d){
  const tags = (d.tags||[]).slice(0,4).map(t=>`<span class="badge">${t}</span>`).join(' ');
  const img = d.image || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200';
  const sourceUrl = (d.source && d.source.url) ? d.source.url : `./details.html?id=${encodeURIComponent(d.id)}`;
  const sourceName = d.source?.name || '—';
  return `<article class="card item">
    <a class="thumb-link" href="${sourceUrl}" target="_blank" rel="noopener">
      <img src="${img}" alt="${escapeHtml(d.name)}" class="thumb" loading="lazy">
    </a>
    <div class="item-body">
      <h3 class="item-title"><a href="./details.html?id=${encodeURIComponent(d.id)}">${escapeHtml(d.name)}</a></h3>
      <div class="badges">${tags}</div>
      <div class="meta">
        <span>${sourceName}</span>
        <span>★ ${d.popularity||0}</span>
      </div>
    </div>
  </article>`;
}

function escapeHtml(s){return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

async function load(){
  document.getElementById('year').textContent = new Date().getFullYear();
  const url = './data/stl-index.json';
  const res = await fetch(url);
  state.data = await res.json();
  renderOptions();
  const usp = new URLSearchParams(location.search);
  state.q = usp.get('q')||'';
  state.tag = usp.get('tag')||'';
  state.source = usp.get('source')||'';
  state.sort = usp.get('sort')||'relevance';
  state.page = parseInt(usp.get('page')||'1',10);
  qInput.value = state.q;
  sourceSel.value = state.source;
  tagSel.value = state.tag;
  sortSel.value = state.sort;
  applySearch();
}

document.addEventListener('DOMContentLoaded', load);
el('#searchBtn').addEventListener('click', ()=>{ state.q = qInput.value.trim(); applySearch(); });
qInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ state.q = qInput.value.trim(); applySearch(); }});
sourceSel.addEventListener('change', e=>{ state.source = e.target.value; applySearch(); });
tagSel.addEventListener('change', e=>{ state.tag = e.target.value; applySearch(); });
sortSel.addEventListener('change', e=>{ state.sort = e.target.value; applySearch(); });
el('#clearFilters').addEventListener('click', ()=>{ state.q=''; qInput.value=''; state.tag=''; tagSel.value=''; state.source=''; sourceSel.value=''; state.sort='relevance'; sortSel.value='relevance'; applySearch(); });
prevBtn.addEventListener('click', ()=>{ if(state.page>1){ state.page--; renderPage(); }});
nextBtn.addEventListener('click', ()=>{ const pages = Math.ceil(state.results.length/PAGE_SIZE); if(state.page<pages){ state.page++; renderPage(); }});

const el = sel => document.querySelector(sel);

async function load(){
  document.getElementById('year').textContent = new Date().getFullYear();
  const usp = new URLSearchParams(location.search);
  const id = usp.get('id');
  const res = await fetch('./data/stl-index.json');
  const data = await res.json();
  const model = data.find(x=>x.id===id);
  if(!model){ el('#model').innerHTML = '<div class="card">Model not found.</div>'; return; }
  const img = model.image || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200';
  const sourceUrl = (model.source && model.source.url) ? model.source.url : '#';
  el('#model').innerHTML = `
    <section class="viewer">
      <a href="${sourceUrl}" target="_blank" rel="noopener" title="Open source page">
        <img src="${img}" alt="${escapeHtml(model.name)}" style="max-width:100%; max-height:100%; object-fit:contain"/>
      </a>
    </section>
    <section class="info">
      <h1 class="title">${escapeHtml(model.name)}</h1>
      <p>${escapeHtml(model.description||'')}</p>
      <div class="tags">${(model.tags||[]).map(t=>`<span class='badge'>${t}</span>`).join(' ')}</div>
      <div class="files">
        <h3>Files</h3>
        <ul>
          ${(model.files||[]).map(f=>`<li><a href="${f.url}" target="_blank" rel="noopener">${f.type.toUpperCase()} file</a></li>`).join('')}
        </ul>
      </div>
      <div class="meta" style="margin-top:8px">
        <span>Source: <a href="${sourceUrl}" target="_blank" rel="noopener">${escapeHtml(model.source?.name||'—')}</a></span>
        <span>★ ${model.popularity||0}</span>
      </div>
      <div style="margin-top:12px">
        <a class="btn" href="./index.html">← Back to search</a>
      </div>
    </section>
  `;
}

function escapeHtml(s){return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

document.addEventListener('DOMContentLoaded', load);

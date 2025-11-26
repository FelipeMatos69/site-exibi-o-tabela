// Controle básico de campanhas — armazena em localStorage e atualiza tabela + gráfico
(function(){
  const sample = [
    {"id":1,"name":"Lançamento produto A","media":"Facebook","start":"2025-10-01","end":"2025-10-15","cost":12500.00,"results":320,"reach":45000},
    {"id":2,"name":"Promo Black Friday","media":"Google","start":"2025-11-15","end":"2025-11-30","cost":22000.50,"results":910,"reach":150000},
    {"id":3,"name":"Campanha institucional","media":"TV","start":"2025-09-01","end":"2025-09-30","cost":50000.00,"results":120,"reach":800000},
    {"id":4,"name":"Awareness Instagram","media":"Instagram","start":"2025-08-10","end":"2025-08-31","cost":4800.00,"results":60,"reach":34000}
  ];

  const STORAGE_KEY = 'ads_control_v1';
  const getEl = id => document.getElementById(id);

  // init data
  function load(){
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(!data){ data = sample; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    return data;
  }

  let campaigns = load();

  // elements
  const tbody = document.querySelector('#campaignsTable tbody');
  const totalCostEl = getEl('totalCost');
  const totalResultsEl = getEl('totalResults');
  const totalReachEl = getEl('totalReach');
  const chartCanvas = getEl('chart');
  const ctx = chartCanvas.getContext('2d');

  // render table
  function formatCurrency(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function cpa(cost,results){ return results? (cost/results).toFixed(2) : '—'; }

  function renderTable(list){
    tbody.innerHTML = '';
    list.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.name}</strong><div class="small">${c.id}</div></td>
        <td>${c.media}</td>
        <td>${c.start}</td>
        <td>${c.end}</td>
        <td>${formatCurrency(c.cost)}</td>
        <td>${c.results}</td>
        <td>${c.reach.toLocaleString()}</td>
        <td>${cpa(c.cost,c.results)}</td>
        <td>
          <button class="btn small edit" data-id="${c.id}">Editar</button>
          <button class="btn small danger del" data-id="${c.id}">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    attachRowActions();
  }

  // stats
  function updateSummary(list){
    const totalCost = list.reduce((s,i)=>s + Number(i.cost),0);
    const totalResults = list.reduce((s,i)=>s + Number(i.results),0);
    const totalReach = list.reduce((s,i)=>s + Number(i.reach),0);
    totalCostEl.textContent = formatCurrency(totalCost);
    totalResultsEl.textContent = totalResults.toLocaleString();
    totalReachEl.textContent = totalReach.toLocaleString();
    renderChart(list);
  }

  // simple bar chart
  function renderChart(list){
    const padding = 40;
    const w = chartCanvas.width = chartCanvas.clientWidth;
    const h = chartCanvas.height = 300;
    ctx.clearRect(0,0,w,h);
    if(!list.length) return;
    const names = list.map(i=>i.name);
    const values = list.map(i=>i.cost);
    const max = Math.max(...values);
    const barW = (w - padding*2) / values.length * 0.7;
    values.forEach((v,idx)=>{
      const x = padding + idx * ((w - padding*2) / values.length) + (( (w - padding*2) / values.length) - barW)/2;
      const barH = (v / max) * (h - padding*2);
      const y = h - padding - barH;
      // bar
      ctx.fillStyle = '#0066cc';
      ctx.fillRect(x,y,barW,barH);
      // label
      ctx.fillStyle = '#0b1a2b';
      ctx.font = '12px sans-serif';
      ctx.fillText(names[idx], x, h - 6);
      // value on top
      ctx.fillText(formatCurrency(v), x, y - 6);
    });
  }

  // persist
  function saveAll(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }

  // attach actions
  function attachRowActions(){
    document.querySelectorAll('.edit').forEach(btn=>{
      btn.onclick = ()=> openModalWithId(Number(btn.dataset.id));
    });
    document.querySelectorAll('.del').forEach(btn=>{
      btn.onclick = ()=>{
        const id = Number(btn.dataset.id);
        if(confirm('Excluir campanha?')) {
          campaigns = campaigns.filter(c=>c.id !== id);
          saveAll();
          applyFilters();
        }
      };
    });
  }

  // filter/search
  function applyFilters(){
    const q = getEl('search').value.toLowerCase();
    const media = getEl('filterMedia').value;
    const from = getEl('fromDate').value;
    const to = getEl('toDate').value;
    let list = campaigns.filter(c=>{
      const matchQ = c.name.toLowerCase().includes(q) || c.media.toLowerCase().includes(q);
      const matchMedia = media? c.media === media : true;
      const matchFrom = from? c.start >= from : true;
      const matchTo = to? c.end <= to : true;
      return matchQ && matchMedia && matchFrom && matchTo;
    });
    renderTable(list);
    updateSummary(list);
  }

  // export CSV
  function exportCSV(){
    const headers = ['id','name','media','start','end','cost','results','reach'];
    const rows = campaigns.map(c=>[c.id,c.name,c.media,c.start,c.end,c.cost,c.results,c.reach]);
    const lines = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob([lines], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'campaigns_export.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // modal logic
  const modal = getEl('modal');
  const form = getEl('campaignForm');
  let editingId = null;

  function openModal(){
    editingId = null;
    getEl('modalTitle').textContent = 'Nova campanha';
    form.reset();
    modal.classList.remove('hidden');
  }
  function closeModal(){ modal.classList.add('hidden'); }

  function openModalWithId(id){
    const c = campaigns.find(x=>x.id===id);
    if(!c) return;
    editingId = id;
    getEl('modalTitle').textContent = 'Editar campanha';
    getEl('name').value = c.name;
    getEl('media').value = c.media;
    getEl('startDate').value = c.start;
    getEl('endDate').value = c.end;
    getEl('cost').value = c.cost;
    getEl('results').value = c.results;
    getEl('reach').value = c.reach;
    modal.classList.remove('hidden');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const obj = {
      id: editingId || (campaigns.reduce((s,i)=>Math.max(s,i.id),0)+1),
      name: getEl('name').value,
      media: getEl('media').value,
      start: getEl('startDate').value,
      end: getEl('endDate').value,
      cost: parseFloat(getEl('cost').value) || 0,
      results: parseInt(getEl('results').value) || 0,
      reach: parseInt(getEl('reach').value) || 0
    };
    if(editingId){
      campaigns = campaigns.map(c=> c.id===editingId? obj : c);
    } else {
      campaigns.push(obj);
    }
    saveAll();
    closeModal();
    populateMediaFilter();
    applyFilters();
  });

  getEl('btnCancel').onclick = closeModal;
  getEl('btnAdd').onclick = openModal;
  getEl('btnFilter').onclick = applyFilters;
  getEl('btnClear').onclick = ()=>{
    getEl('search').value='';
    getEl('filterMedia').value='';
    getEl('fromDate').value='';
    getEl('toDate').value='';
    applyFilters();
  };
  getEl('btnExport').onclick = exportCSV;

  // search input debounce
  let debounce;
  getEl('search').addEventListener('input', ()=> {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 250);
  });

  // populate media options
  function populateMediaFilter(){
    const mediaSet = Array.from(new Set(campaigns.map(c=>c.media)));
    const sel = getEl('filterMedia');
    sel.innerHTML = '<option value="">Todas mídias</option>';
    mediaSet.forEach(m=>{
      const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o);
    });
  }

  // init
  populateMediaFilter();
  applyFilters();

  // keep canvas responsive on resize
  window.addEventListener('resize', ()=> renderChart(campaigns));
})();
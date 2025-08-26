// REMUBRUTA v2 — Escenarios: Mercado (Bancos, IPC, Alyc), Alchemy, Bandas (MIN/MID/MAX)
let TODOS=[]; let REMU={}; let seleccionado=null; let modo='mercado';

async function boot(){
  const c = await fetch('./data/colaboradores.json').then(r=>r.json());
  const r = await fetch('./data/remubruta.json').then(r=>r.json());
  TODOS=c; REMU=r; cargarFiltros(c); renderResultados([]); hook();
}
function hook(){
  document.getElementById('q').addEventListener('input', filtrar);
  ['f-sector','f-area','f-jefe'].forEach(id=> document.getElementById(id).addEventListener('change', filtrar));
  document.getElementById('btn-limpiar').addEventListener('click', ()=>{
    document.getElementById('q').value='';
    document.getElementById('f-sector').value='';
    document.getElementById('f-area').value='';
    document.getElementById('f-jefe').value='';
    renderResultados([]);
  });
}
function cargarFiltros(data){
  fill('f-sector', uniq(data.map(x=>x.sector)));
  fill('f-area', uniq(data.map(x=>x.area)));
  fill('f-jefe', uniq(data.map(x=>x.jefe)));
}
function fill(id, arr){
  const sel=document.getElementById(id);
  arr.filter(Boolean).sort().forEach(v=>{ const o=document.createElement('option'); o.value=v;o.text=v; sel.appendChild(o); });
}
function filtrar(){
  const q=(document.getElementById('q').value||'').toLowerCase();
  const s=document.getElementById('f-sector').value, a=document.getElementById('f-area').value, j=document.getElementById('f-jefe').value;
  const res=TODOS.filter(c=>{
    const n=(c.nombreCompleto||'').toLowerCase();
    const okN=!q || n.includes(q);
    const okS=!s || c.sector===s; const okA=!a || c.area===a; const okJ=!j || c.jefe===j;
    return okN&&okS&&okA&&okJ;
  }).sort((A,B)=> (parseFloat(B.nivel||0))-(parseFloat(A.nivel||0)));
  renderResultados(res);
}
function renderResultados(items){
  const cont=document.getElementById('resultados');
  if(!items.length){ cont.innerHTML='<div style="text-align:center;color:#666">Ajustá los filtros…</div>'; return; }
  let html='<div class="lista-colaboradores">';
  items.forEach(c=>{
    html+=`<div class="tarjeta" onclick="seleccionar('${c.legajo}')">
      <div class="row"><strong>${c.nombreCompleto}</strong><span class="badge">${c.legajo}</span></div>
      <div class="row" style="flex-wrap:wrap;gap:6px;font-size:13px;color:#555">
        ${c.sector?`<span>${c.sector}</span>`:''}${c.area?`<span>${c.area}</span>`:''}${c.jefe?`<span>${c.jefe}</span>`:''}${c.rango?`<span>${c.rango}</span>`:''}
      </div></div>`;
  }); html+='</div>'; cont.innerHTML=html;
}
function seleccionar(legajo){ seleccionado=TODOS.find(x=>String(x.legajo)===String(legajo)); if(!seleccionado) return; renderFicha(seleccionado); }
function info(label,value){ const v=(value==null||value==='')?'No especificado':value; return `<div class="info-box"><label>${label}</label><div>${v}</div></div>`; }

function renderFicha(d){
  const cont=document.getElementById('contenido');
  cont.innerHTML=`
    <div class="section">
      <div class="row" style="align-items:center">
        <h3>📋 Información General</h3>
        <div style="text-align:right;margin-left:auto">
          <h4 style="margin:0;color:#3f51b5">${d.nombreCompleto}</h4>
          <div style="color:#666">Legajo: ${d.legajo}</div>
        </div>
      </div>
      <div class="grid">
        ${info('Sector', d.sector)} ${info('Área', d.area)} ${info('Rango', d.rango)} ${info('Jefe', d.jefe)}
        ${info('ANTIGUEDAD', `${d.ANTIGUEDAD||0} años`)} ${info('Nivel Salarial', d['Nivel Salarial'])}
        ${info('Relación con Alguien', d['Relación con Alguien']||'No especificado')} ${info('Franja Etaria', d['Franja Etaria']||'No especificado')}
      </div>
    </div>

    <div class="panel">
      <h3>📊 Historial de Remuneraciones</h3>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div class="seg">
          <button onclick="setModo('mercado')" id="m-mercado" class="on">Mercado</button>
          <button onclick="setModo('bandas')" id="m-bandas">Bandas</button>
          <button onclick="setModo('alchemy')" id="m-alchemy">Alchemy</button>
        </div>
      </div>
      <div id="remu-tbl" style="margin-top:10px"></div>
      <div class="svg-wrap"><svg id="remu-svg" viewBox="0 0 800 320" width="100%" height="320" preserveAspectRatio="none"></svg></div>
    </div>
  `;
  renderRemu(d.legajo);
}

function setModo(m){ modo=m; ['m-mercado','m-bandas','m-alchemy'].forEach(id=>{
  const el=document.getElementById(id); if(!el) return; el.classList.toggle('on', id==='m-'+m);
}); drawChart('remu-svg', (REMU[String(seleccionado.legajo)]||[])); }

function renderRemu(legajo){
  const rows=(REMU[String(legajo)]||[]).slice().sort((a,b)=> new Date(a.periodo)-new Date(b.periodo));
  const f=n=>'$'+Math.round(+n||0).toLocaleString('es-AR');
  const tbl=['<table class="tabla"><thead><tr><th>Periodo</th><th>BRUTO</th><th>Bancos</th><th>IPC</th><th>Alyc</th><th>Alchemy</th><th>MIN</th><th>MID</th><th>MAX</th></tr></thead><tbody>'];
  rows.forEach(r=> tbl.push(`<tr><td>${r.periodo}</td><td><strong>${f(r.sueldo)}</strong></td><td>${f(r.banco)}</td><td>${f(r.ipc)}</td><td>${f(r.alyc)}</td><td>${f(r.alchemy)}</td><td>${f(r.min)}</td><td>${f(r.mid)}</td><td>${f(r.max)}</td></tr>`));
  tbl.push('</tbody></table>'); document.getElementById('remu-tbl').innerHTML=tbl.join('');
  drawChart('remu-svg', rows);
}

function drawChart(id, rows){
  const svg=document.getElementById(id); svg.innerHTML='';
  const W=800,H=320, pad={l:48,r:12,t:10,b:24};
  const X= (i,n)=> pad.l + (i*(W-pad.l-pad.r))/Math.max(1,n-1);
  let series=[];
  if(modo==='mercado'){
    series=[{k:'sueldo',n:'Sueldo Bruto',c:'#3f51b5'},{k:'banco',n:'Esc. Bancos',c:'#0F9D58'},{k:'ipc',n:'Esc. IPC',c:'#DB4437'},{k:'alyc',n:'Esc. Alyc',c:'#FF9800'}];
  }else if(modo==='bandas'){
    series=[{k:'sueldo',n:'Sueldo Bruto',c:'#3f51b5'},{k:'min',n:'MIN',c:'#00796B'},{k:'mid',n:'MID',c:'#455A64'},{k:'max',n:'MAX',c:'#6A1B9A'}];
  }else{
    series=[{k:'sueldo',n:'Sueldo Bruto',c:'#3f51b5'},{k:'alchemy',n:'Alchemy',c:'#1E88E5'}];
  }
  const allY = series.flatMap(s=> rows.map(r=> +r[s.k]||0));
  const ymin = Math.min(...allY), ymax = Math.max(...allY);
  const Y = v => pad.t + (H-pad.t-pad.b) * (1 - (v - ymin) / Math.max(1,(ymax - ymin)));

  const ax = document.createElementNS('http://www.w3.org/2000/svg','path');
  ax.setAttribute('d', `M${pad.l} ${pad.t} V${H-pad.b} H${W-pad.r}`);
  ax.setAttribute('stroke','#999'); ax.setAttribute('fill','none'); ax.setAttribute('stroke-width','1');
  svg.appendChild(ax);

  rows.forEach((r,i)=>{
    if(i%Math.ceil(rows.length/8)!==0 && i!==rows.length-1) return;
    const tx=document.createElementNS('http://www.w3.org/2000/svg','text');
    tx.setAttribute('x', X(i,rows.length)); tx.setAttribute('y', H-6);
    tx.setAttribute('text-anchor','middle'); tx.setAttribute('font-size','10'); tx.textContent=(r.periodo||'').slice(0,7);
    svg.appendChild(tx);
  });

  series.forEach((s,di)=>{
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    let d=''; rows.forEach((r,i)=>{ const x=X(i,rows.length), y=Y(+r[s.k]||0); d += (i?' L':'M')+x+' '+y; });
    path.setAttribute('d', d); path.setAttribute('fill','none'); path.setAttribute('stroke', s.c); path.setAttribute('stroke-width','2');
    svg.appendChild(path);
    const y=pad.t+6 + di*14;
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', W-pad.r-150); rect.setAttribute('y', y-9); rect.setAttribute('width',10); rect.setAttribute('height',10); rect.setAttribute('fill', s.c); svg.appendChild(rect);
    const tx=document.createElementNS('http://www.w3.org/2000/svg','text');
    tx.setAttribute('x', W-pad.r-134); tx.setAttribute('y', y); tx.setAttribute('font-size','11'); tx.textContent=s.n; svg.appendChild(tx);
  });
}

function uniq(a){ return [...new Set(a)]; }
boot();

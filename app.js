// People Review — Demo (anon) — front-end estático
// Basado en la UI original, reemplazando google.script.run por fetch a /data/*.json

let TODOS = [];
let REMU = {};
let seleccionado = null;
let chartRadar = null;
let chartRemu = null;
let currentDataType = 'mercado';

async function boot() {
  const colab = await fetch('./data/colaboradores.json').then(r=>r.json());
  const remu = await fetch('./data/remuneraciones.json').then(r=>r.json());
  TODOS = colab;
  REMU = remu;
  cargarFiltros(colab);
  renderResultados([]);
  hookEventos();
}

function hookEventos(){
  document.getElementById('q').addEventListener('input', filtrar);
  ['f-sector','f-area','f-jefe'].forEach(id => {
    document.getElementById(id).addEventListener('change', filtrar);
  });
  document.getElementById('btn-limpiar').addEventListener('click', ()=>{
    document.getElementById('q').value='';
    document.getElementById('f-sector').value='';
    document.getElementById('f-area').value='';
    document.getElementById('f-jefe').value='';
    renderResultados([]);
  });
}

function cargarFiltros(data){
  const sectores = uniq(data.map(x=>x.sector).filter(Boolean)).sort();
  const areas = uniq(data.map(x=>x.area).filter(Boolean)).sort();
  const jefes = uniq(data.map(x=>x.jefe).filter(Boolean)).sort();
  fillSelect('f-sector', sectores);
  fillSelect('f-area', areas);
  fillSelect('f-jefe', jefes);
}

function fillSelect(id, arr){
  const sel = document.getElementById(id);
  arr.forEach(v=>{
    const o = document.createElement('option');
    o.value=v;o.textContent=v; sel.appendChild(o);
  });
}

function filtrar(){
  const q = (document.getElementById('q').value||'').toLowerCase();
  const s = document.getElementById('f-sector').value;
  const a = document.getElementById('f-area').value;
  const j = document.getElementById('f-jefe').value;
  let res = TODOS.filter(c=>{
    const n = (c.nombreCompleto||'').toLowerCase();
    const n2 = (c.nombre||'').toLowerCase()+" "+(c.apellido||'').toLowerCase();
    const okN = !q || n.includes(q) || n2.includes(q);
    const okS = !s || c.sector===s;
    const okA = !a || c.area===a;
    const okJ = !j || c.jefe===j;
    return okN && okS && okA && okJ;
  }).sort((A,B)=> (parseFloat(B.nivel||0))-(parseFloat(A.nivel||0)));
  renderResultados(res);
}

function renderResultados(items){
  const cont = document.getElementById('resultados');
  if(!items.length){
    cont.innerHTML = '<div style="text-align:center;color:#666">Ajustá los filtros para ver colaboradores…</div>';
    return;
  }
  let html = '<div class="lista-colaboradores">';
  items.forEach(c=>{
    html += `<div class="tarjeta" onclick="seleccionar('${c.legajo}')">
      <div class="row"><strong>${c.nombreCompleto}</strong><span class="badge">${c.legajo}</span></div>
      <div class="row" style="flex-wrap:wrap;gap:6px;font-size:13px;color:#555">
        ${c.sector?`<span>${c.sector}</span>`:''}
        ${c.area?`<span>${c.area}</span>`:''}
        ${c.jefe?`<span>${c.jefe}</span>`:''}
        ${c.rango?`<span>${c.rango}</span>`:''}
      </div>
    </div>`;
  });
  html += '</div>';
  cont.innerHTML = html;
}

function seleccionar(legajo){
  seleccionado = TODOS.find(x=>String(x.legajo)===String(legajo));
  if(!seleccionado){ return; }
  renderFicha(seleccionado);
}

function renderFicha(d){
  const comp = ['Compromiso','Expertise','Emprendedor','Integridad'].map(k=> parseFloat(d[k])||0);
  const promComp = (comp.reduce((a,b)=>a+b,0) / comp.length);
  const objetivos = [1,2,3,4,5].map(i=> (parseFloat(d[`Objetivo ${i} Nota`])||0));
  const sumaObj = objetivos.reduce((a,b)=>a+b,0);
  const desempeno = (sumaObj*0.6 + promComp*0.4);
  const ninePos = nineBox(desempeno, parseFloat(d['Potencial'])||0);

  const cont = document.getElementById('contenido');
  cont.innerHTML = `
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

    <div class="section">
      <h3>🎓 Formación y Experiencia</h3>
      <div class="grid">
        ${info('ESTUDIOS', d.ESTUDIOS)} ${info('Profesión', d['Profesión'])} ${info('Empleador anterior', d['Empleador anterior'])}
        ${info('Rol anterior', d['Rol anterior'])} ${info('Años en el Rol', d['Años en el Rol'])}
        ${info('Cómo llegó a la empresa', d['Cómo llegó a la empresa'])} ${info('Certificaciones', d['Certificaciones'])}
        ${info('Cursos Realizados', d['Cursos Realizados'])} ${info('Experiencia Previa', d['Experiencia Previa'])}
      </div>
    </div>

    <div class="section">
      <h3>🎯 Evaluación de Desempeño</h3>
      <div class="grid">
        ${info('Objetivos (suma)', sumaObj.toFixed(2))} ${info('Competencias (prom.)', promComp.toFixed(2))} ${info('Desempeño', desempeno.toFixed(2))}
      </div>
    </div>

    <div class="dash">
      <div class="panel">
        <h3>Perfil Conductual (PDA)</h3>
        <canvas id="radarPDA" height="300"></canvas>
        <div style="margin-top:12px">
          <label>⚡ Nivel de Energía</label>
          <div class="heat"><div class="pin" style="left:${(parseFloat(d['NIVEL DE ENERGIA'])||0)}%"></div></div>
          <div style="margin-top:6px"><strong>Valor:</strong> ${d['NIVEL DE ENERGIA']||0}</div>
        </div>
      </div>

      <div class="panel">
        <h3>Matriz 9-Box</h3>
        <div>Posición: <strong>${ninePos}</strong></div>
        <div style="margin-top:10px;font-size:14px;color:#555">${nineDesc(ninePos)}</div>
      </div>
    </div>

    <div class="section">
      <h3>📊 Historial de Remuneraciones</h3>
      <div id="remu-tbl"></div>
      <div style="margin:10px 0">
        <button onclick="cambiarTipo('mercado')" id="btn-mercado" class="on">Comparación Mercado</button>
        <button onclick="cambiarTipo('bandas')" id="btn-bandas">Comparación Bandas</button>
        <button onclick="cambiarTipo('Alchemy')" id="btn-alchemy">Comparación Pauta Alchemy</button>
      </div>
      <canvas id="remu-chart" height="300"></canvas>
    </div>
  `;

  renderRadar(comp);
  renderRemuneraciones(d.legajo);
}

function info(label, value){
  const v = value==null || value==='' ? 'No especificado' : value;
  return `<div class="info-box"><label>${label}</label><div>${v}</div></div>`;
}

function renderRadar(comp){
  const ctx = document.getElementById('radarPDA');
  if(chartRadar) chartRadar.destroy();
  chartRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Compromiso','Expertise','Emprendedor','Integridad'],
      datasets: [{
        label: 'PDA',
        data: comp,
        backgroundColor: 'rgba(63, 81, 181, 0.15)',
        borderColor: '#3f51b5',
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: { responsive:true, scales:{ r:{ beginAtZero:true, suggestedMax:5 } } }
  });
}

function renderRemuneraciones(legajo){
  const data = (REMU[String(legajo)]||[]).slice().sort((a,b)=> new Date(a.periodo) - new Date(b.periodo));
  // Tabla
  const tbl = [`<table class="tabla"><thead><tr>
    <th>Periodo</th><th>Sueldo</th><th>Bancos</th><th>IPC</th><th>Alchemy</th><th>Alyc</th>
    <th>MIN</th><th>MID</th><th>MAX</th></tr></thead><tbody>`];
  data.forEach(r=>{
    const f = n => '$'+Math.round(+n||0).toLocaleString('es-AR');
    tbl.push(`<tr><td>${r.periodo}</td><td><strong>${f(r.sueldo)}</strong></td>
      <td>${f(r.banco)}</td><td>${f(r.ipc)}</td><td>${f(r.alchemy)}</td><td>${f(r.alyc)}</td>
      <td>${f(r.min)}</td><td>${f(r.mid)}</td><td>${f(r.max)}</td></tr>`);
  });
  tbl.push('</tbody></table>');
  document.getElementById('remu-tbl').innerHTML = tbl.join('');

  // Chart
  drawRemuChart(data);
}

function cambiarTipo(t){
  currentDataType = t;
  ['btn-mercado','btn-bandas','btn-alchemy'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.className = (id==='btn-'+t.toLowerCase()) ? 'on' : '';
  });
  drawRemuChart((REMU[String(seleccionado.legajo)]||[]));
}

function drawRemuChart(data){
  const ctx = document.getElementById('remu-chart');
  if(chartRemu) chartRemu.destroy();
  const labels = data.map(d=> d.periodo);
  let datasets = [];
  if(currentDataType==='mercado'){
    datasets = [
      serie('Sueldo Bruto', data.map(d=>d.sueldo), '#3f51b5', true),
      serie('Escenario Bancos', data.map(d=>d.banco), '#0F9D58'),
      serie('Escenario IPC', data.map(d=>d.ipc), '#DB4437'),
      serie('Escenario Alyc', data.map(d=>d.alyc), '#FF9800')
    ];
  } else if(currentDataType==='bandas'){
    datasets = [
      serie('Sueldo Bruto', data.map(d=>d.sueldo), '#3f51b5', true),
      serie('MIN', data.map(d=>d.min), '#00796B'),
      serie('MID', data.map(d=>d.mid), '#455A64'),
      serie('MAX', data.map(d=>d.max), '#6A1B9A')
    ];
  } else {
    datasets = [
      serie('Sueldo Bruto', data.map(d=>d.sueldo), '#3f51b5', true),
      serie('Alchemy', data.map(d=>d.alchemy), '#1E88E5')
    ];
  }
  chartRemu = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets },
    options:{ responsive:true, tension:0.25, scales:{ y:{ beginAtZero:false } } }
  });
}

function serie(label, data, color, fill=false){
  return {
    label, data,
    borderColor: color, backgroundColor: fill? 'rgba(63,81,181,0.12)' : 'transparent',
    borderWidth: fill? 3:2, fill
  };
}

function nineBox(desempeno, potencial){
  // Mapa simple 3x3 por umbrales (2.5 y 3.5)
  const d = desempeno = desempeno;
  const p = potencial;
  const bx = p<2.5?0 : (p<=3.5?1:2);
  const by = d<2.5?2 : (d<=3.5?1:0);
  // Convertir a posiciones conocidas (1..9) (modelo libre)
  const matrix = [
    [4,3,1],
    [7,5,2],
    [9,8,6]
  ];
  return matrix[by][bx];
}

function nineDesc(pos){
  const map = {
    1:'Talento Superior',2:'Talento en Desarrollo',3:'Alto Talento',4:'Talento Sólido',5:'Talento Clave',
    6:'Enigma',7:'Talento Promedio',8:'Talento Inconsistente',9:'Riesgo'
  };
  return map[pos] || '—';
}

function uniq(a){ return [...new Set(a)]; }

// init
boot();

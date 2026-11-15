import { CraneProjectJson } from '../types/crane';

export function generatePanelWebHtml(project: CraneProjectJson): string {
  const ssid = project.network.wifiSsid || 'GRUA';
  const pinEnabled = project.network.operatorPinEnabled ? 'true' : 'false';
  const rMax = project.calibration.rMaxUsefulCm || 45;
  const dCp = project.calibration.counterweightDistDcpCm ?? 0;
  const whR = project.calibration.warehouseRadiusCm || 36;
  const whA = project.calibration.warehouseAngleDeg ?? 180;
  const tempC = project.calibration.ambientTempC ?? 25;
  const eOffset = project.calibration.usVOffsetECm || 3.5;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Panel Grua Torre - ${ssid}</title>
<style>
:root{--bg:#0b1120;--card:#111827;--bd:#1e293b;--tx:#f1f5f9;--sub:#94a3b8;--ok:#10b981;--warn:#f59e0b;--err:#ef4444;--acc:#38bdf8}
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
body{background:var(--bg);color:var(--tx);padding-bottom:64px}
header{position:sticky;top:0;z-index:20;background:#0f172a;border-bottom:1px solid var(--bd);padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.brand{font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px}
.badge{font-size:11px;padding:3px 8px;border-radius:6px;background:#1e293b;border:1px solid #334155;font-family:monospace}
.paro-btn{background:var(--err);color:#fff;border:none;padding:12px 22px;border-radius:10px;font-weight:900;font-size:16px;letter-spacing:1px;cursor:pointer;box-shadow:0 0 18px rgba(239,68,68,.45)}
.paro-btn:active{transform:scale(.97)}
nav{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;background:#0d1526;border-bottom:1px solid var(--bd)}
nav button{background:#111827;color:var(--sub);border:1px solid var(--bd);padding:8px 13px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
nav button.act{background:var(--ok);color:#041e14;border-color:var(--ok)}
main{max-width:960px;margin:0 auto;padding:12px;display:grid;gap:12px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.kpi{background:#0b1120;border:1px solid var(--bd);border-radius:8px;padding:8px}
.kpi small{color:var(--sub);font-size:11px;display:block}
.kpi b{font-size:18px;font-family:monospace}
.btn{border:1px solid #334155;background:#1e293b;color:#fff;padding:10px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}
.btn.ok{background:var(--ok);color:#042016;border-color:var(--ok)}
.btn.warn{background:var(--warn);color:#201202;border-color:var(--warn)}
.btn.acc{background:var(--acc);color:#051e2c;border-color:var(--acc)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
label{font-size:12px;color:var(--sub);display:block;margin-bottom:4px}
input,select{width:100%;background:#0b1120;color:#fff;border:1px solid #334155;border-radius:6px;padding:8px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border-bottom:1px solid var(--bd);padding:6px;text-align:left}
th{color:var(--sub)}
.hide{display:none!important}
.modal-bg{position:fixed;inset:0;background:rgba(2,6,23,.82);z-index:50;display:flex;align-items:center;justify-content:center;padding:14px}
.modal{background:var(--card);border:1px solid #475569;border-radius:12px;max-width:420px;width:100%;padding:16px;display:grid;gap:10px}
svg{width:100%;height:auto;background:#080e1a;border:1px solid var(--bd);border-radius:10px;touch-action:manipulation}
.err-banner{background:#450a0a;border:1px solid #ef4444;color:#fecaca;padding:8px 12px;border-radius:8px;font-size:12px}
</style>
</head>
<body>
<header>
  <div class="brand">
    <span>GRUA TORRE</span>
    <span class="badge" id="bState">INICIO</span>
    <span class="badge" id="bLink">UNO: --</span>
  </div>
  <div class="row">
    <button class="btn warn" id="btnRearm" onclick="sendCmd('REARMAR')">Rearmar</button>
    <button class="paro-btn" onclick="sendCmd('PARO')">PARO</button>
  </div>
</header>
<nav>
  <button class="act" onclick="tab(0,this)">Control</button>
  <button onclick="tab(1,this)">Cargas</button>
  <button onclick="tab(2,this)">Calibracion</button>
  <button onclick="tab(3,this)">Diagnostico</button>
  <button onclick="tab(4,this)">Registro</button>
</nav>
<main>
  <div id="errBox" class="err-banner hide"></div>

  <section id="t0" class="grid2">
    <div class="card">
      <h3 style="margin-bottom:8px">Operacion principal</h3>
      <div class="grid4" style="margin-bottom:10px">
        <div class="kpi"><small>Angulo (&theta;)</small><b id="kTheta">0.0 &deg;</b></div>
        <div class="kpi"><small>Radio (r)</small><b id="kRadio">0.0 cm</b></div>
        <div class="kpi"><small>Altura (z)</small><b id="kAltura">0.0 cm</b></div>
        <div class="kpi"><small>Contrapeso min.</small><b id="kMcp">-- g</b></div>
      </div>
      <div class="row" style="margin-bottom:10px">
        <button class="btn acc" onclick="sendCmd('HOME')">1. HOME (Cero)</button>
        <button class="btn" onclick="sendCmd('ESCANEO')">2. ESCANEAR</button>
        <button class="btn ok" onclick="openCpModal()">3. TRABAJAR</button>
        <button class="btn" onclick="sendCmd('MANUAL')">Modo Manual</button>
      </div>
      <p style="font-size:12px;color:var(--sub)">Subestado: <b id="kSub">NINGUNO</b> &middot; Electroiman: <b id="kMag">OFF</b> &middot; Motores activos: <b id="kMot">0/2</b></p>
    </div>
    <div class="card">
      <h3 style="margin-bottom:8px">Movimiento Manual (max 2 motores)</h3>
      <div class="grid2" style="gap:8px">
        <button class="btn" onclick="jog('GIRO',-1)">Giro &larr; (-)</button>
        <button class="btn" onclick="jog('GIRO',1)">Giro &rarr; (+)</button>
        <button class="btn" onclick="jog('CARRO',-1)">Carro Adentro (-)</button>
        <button class="btn" onclick="jog('CARRO',1)">Carro Afuera (+)</button>
        <button class="btn" onclick="jog('CABRESTANTE',1)">Gancho Subir (+)</button>
        <button class="btn" onclick="jog('CABRESTANTE',-1)">Gancho Bajar (-)</button>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn warn" onclick="sendCmd('IMAN_ON')">Iman ON</button>
        <button class="btn" onclick="sendCmd('IMAN_OFF')">Iman OFF</button>
        <button class="btn" onclick="sendCmd('ALTO_MOTORES')">Detener Motores</button>
      </div>
    </div>
  </section>

  <section id="t1" class="hide">
    <div class="grid2">
      <div class="card">
        <h3 style="margin-bottom:4px">Radar polar superior (&theta;, r)</h3>
        <p style="font-size:11px;color:var(--sub);margin-bottom:8px">Doble clic o doble toque en un punto para agregar/editar carga.</p>
        <svg id="svgPolar" viewBox="0 0 300 300"></svg>
      </div>
      <div class="card">
        <h3 style="margin-bottom:4px">Perfil lateral (r vs z)</h3>
        <p style="font-size:11px;color:var(--sub);margin-bottom:8px">Doble clic para ajustar posicion en altura.</p>
        <svg id="svgSide" viewBox="0 0 300 220"></svg>
        <div class="row" style="margin-top:8px;justify-content:space-between">
          <span style="font-size:12px">Contrapeso req: <b id="lblMcp">--</b></span>
          <span style="font-size:12px">Tiempo est.: <b id="lblEta">-- s</b></span>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <h3>Cola de cargas</h3>
        <div class="row">
          <button class="btn acc" onclick="openLoadModal(-1)">+ Agregar carga</button>
          <button class="btn ok" onclick="saveLoads()">Guardar en ESP32</button>
        </div>
      </div>
      <table><thead><tr><th>Orden</th><th>ID</th><th>Masa (g)</th><th>r (cm)</th><th>&theta; (&deg;)</th><th>Accion</th></tr></thead><tbody id="tbLoads"></tbody></table>
    </div>
  </section>

  <section id="t2" class="hide card">
    <h3 style="margin-bottom:8px">Asistente de Calibracion (guarda en NVS)</h3>
    <div class="grid2">
      <div><label>Radio minimo r0 (cm)</label><input id="cR0" type="number" step="0.5" value="8"></div>
      <div><label>Offset US-V sobre iman e (cm)</label><input id="cE" type="number" step="0.1" value="${eOffset}"></div>
      <div><label>Offset horizontal US-H s_H (cm)</label><input id="cSh" type="number" step="0.1" value="0"></div>
      <div><label>Temperatura ambiente (&deg;C)</label><input id="cTemp" type="number" step="0.5" value="${tempC}"></div>
      <div><label>Distancia contrapeso d_cp (cm)</label><input id="cDcp" type="number" step="0.5" value="${dCp}"></div>
      <div><label>Bodega (r cm / &theta; &deg;)</label><div class="row"><input id="cWhR" type="number" value="${whR}" style="width:48%"><input id="cWhA" type="number" value="${whA}" style="width:48%"></div></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn ok" onclick="saveCal()">Guardar Calibracion</button>
      <button class="btn acc" onclick="sendCmd('TEST_HALL')">Probar Hall + HOME</button>
      <button class="btn" onclick="sendCmd('ZERO_ENC')">Poner Pulsos a 0</button>
    </div>
  </section>

  <section id="t3" class="hide card">
    <h3 style="margin-bottom:8px">Diagnostico en vivo y voltajes esperados</h3>
    <table>
      <thead><tr><th>Sensor / Canal</th><th>Lectura cruda</th><th>Multimetro esperado</th></tr></thead>
      <tbody id="tbDiag"></tbody>
    </table>
  </section>

  <section id="t4" class="hide card">
    <div class="row" style="justify-content:space-between;margin-bottom:8px">
      <h3>Registro de eventos</h3>
      <a class="btn acc" href="/api/registro.csv" download="grua_registro.csv" style="text-decoration:none">Descargar CSV</a>
    </div>
    <table><thead><tr><th>Tiempo</th><th>Estado</th><th>Evento</th></tr></thead><tbody id="tbLogs"></tbody></table>
  </section>
</main>

<div id="mCp" class="modal-bg hide">
  <div class="modal">
    <h3>Confirmacion obligatoria de seguridad</h3>
    <p id="mCpTxt" style="font-size:13px;color:#fcd34d"></p>
    <div class="row" style="justify-content:flex-end">
      <button class="btn" onclick="closeModals()">No esta puesto</button>
      <button class="btn ok" onclick="confirmWork()">Si, contrapeso colocado</button>
    </div>
  </div>
</div>

<div id="mLoad" class="modal-bg hide">
  <div class="modal">
    <h3 id="mLoadTitle">Editar carga</h3>
    <input type="hidden" id="fIdx" value="-1">
    <div><label>ID / Nombre</label><input id="fId" type="text" maxlength="16"></div>
    <div><label>Masa (g)</label><input id="fMass" type="number" min="1" max="2000"></div>
    <div><label>Radio r (cm)</label><input id="fR" type="number" min="5" max="${rMax}"></div>
    <div><label>Angulo &theta; (0-360&deg;)</label><input id="fT" type="number" min="0" max="360"></div>
    <div><label>Orden</label><input id="fOrd" type="number" min="1" max="20"></div>
    <div class="row" style="justify-content:flex-end">
      <button class="btn" onclick="closeModals()">Cancelar</button>
      <button class="btn ok" onclick="commitLoadModal()">Guardar</button>
    </div>
  </div>
</div>

<div id="mPin" class="modal-bg ${pinEnabled === 'true' ? '' : 'hide'}">
  <div class="modal">
    <h3>PIN de operador requerido</h3>
    <p style="font-size:12px;color:var(--sub)">Ingresa el PIN de 4 digitos configurado para habilitar ordenes.</p>
    <input id="fPin" type="password" maxlength="4" placeholder="0000">
    <button class="btn ok" onclick="unlockPin()">Desbloquear panel</button>
  </div>
</div>

<script>
let st={estado:'REPOSO',sub:'NINGUNO',theta:0,r:10,z:0,hall:0,home:0,paro:0,link:1,mag:0,mot:0,err:'OK',ush:0,usv:0,fc:[0,0,0],pot:[0,0],logs:[]};
let loads=[];
let pinToken='';
let rMax=${rMax},dCp=${dCp},whR=${whR},whA=${whA};
const $=id=>document.getElementById(id);

function tab(idx,btn){
  for(let i=0;i<5;i++) $('t'+i).classList.toggle('hide',i!==idx);
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  if(idx===1) drawPlots();
}
function closeModals(){$('mCp').classList.add('hide');$('mLoad').classList.add('hide');}
function unlockPin(){pinToken=$('fPin').value||'';$('mPin').classList.add('hide');}

async function api(url,method='GET',body=null){
  const opt={method,headers:{'Content-Type':'application/json','X-Crane-Pin':pinToken}};
  if(body) opt.body=JSON.stringify(body);
  const r=await fetch(url,opt);
  return r.json();
}
async function sendCmd(cmd,extra={}){try{await api('/api/orden','POST',{cmd,...extra});poll();}catch(e){}}
function jog(m,d){sendCmd('JOG',{motor:m,dir:d});}

function calcMcp(){
  if(!loads.length||dCp<=0) return 0;
  let mx=0; loads.forEach(l=>{const m=(+l.massG||0)*(+l.rCm||0); if(m>mx)mx=m;});
  return (1.1*mx/dCp);
}

function openCpModal(){
  const mcp=calcMcp();
  $('mCpTxt').textContent=dCp>0?'Ya esta colocado el contrapeso de '+mcp.toFixed(1)+' g en la contrapluma?':'Atencion: falta d_cp en Calibracion. Confirmas contrapeso fisico instalado?';
  $('mCp').classList.remove('hide');
}
function confirmWork(){closeModals();sendCmd('TRABAJAR',{contrapeso:1});}

function openLoadModal(idx,presetR,presetT){
  $('fIdx').value=idx;
  if(idx>=0&&loads[idx]){
    const l=loads[idx];
    $('mLoadTitle').textContent='Editar carga '+l.id;
    $('fId').value=l.id;$('fMass').value=l.massG;$('fR').value=l.rCm;$('fT').value=l.thetaDeg;$('fOrd').value=l.order;
  } else {
    $('mLoadTitle').textContent='Nueva carga';
    $('fId').value='C'+(loads.length+1);$('fMass').value=100;
    $('fR').value=presetR||20;$('fT').value=presetT||45;$('fOrd').value=loads.length+1;
  }
  $('mLoad').classList.remove('hide');
}
function commitLoadModal(){
  const idx=+$('fIdx').value;
  const item={id:$('fId').value||'C',massG:+$('fMass').value||50,rCm:+$('fR').value||15,thetaDeg:+$('fT').value||0,order:+$('fOrd').value||1};
  if(idx>=0) loads[idx]=item; else loads.push(item);
  loads.sort((a,b)=>a.order-b.order);
  closeModals(); renderLoads(); drawPlots();
}
function delLoad(i){loads.splice(i,1);renderLoads();drawPlots();}
async function saveLoads(){await api('/api/cargas','POST',{cargas:loads});poll();}
async function saveCal(){
  dCp=+$('cDcp').value||dCp; whR=+$('cWhR').value||whR; whA=+$('cWhA').value||whA;
  await api('/api/calibracion','POST',{r0:+$('cR0').value,e:+$('cE').value,sh:+$('cSh').value,temp:+$('cTemp').value,dcp:dCp,whr:whR,wha:whA});
  poll();
}

function renderLoads(){
  $('tbLoads').innerHTML=loads.map((l,i)=>'<tr><td>'+l.order+'</td><td><b>'+l.id+'</b></td><td>'+l.massG+'</td><td>'+l.rCm+'</td><td>'+l.thetaDeg+'&deg;</td><td><button class="btn" style="padding:4px 8px" onclick="openLoadModal('+i+')">Edit</button> <button class="btn" style="padding:4px 8px" onclick="delLoad('+i+')">X</button></td></tr>').join('');
  const mcp=calcMcp();
  $('kMcp').textContent=dCp>0?mcp.toFixed(1)+' g':'POR CONF.';
  $('lblMcp').textContent=dCp>0?mcp.toFixed(1)+' g':'POR CONF.';
  $('lblEta').textContent=(loads.length*22)+' s';
}

function drawPlots(){
  const sp=$('svgPolar'),cx=150,cy=150,sc=125/rMax;
  let p='<circle cx="150" cy="150" r="125" fill="none" stroke="#1e293b" stroke-width="1.5"/>';
  p+='<circle cx="150" cy="150" r="62" fill="none" stroke="#1e293b" stroke-dasharray="4 4"/>';
  const bx=cx+Math.cos((st.theta-90)*Math.PI/180)*125, by=cy+Math.sin((st.theta-90)*Math.PI/180)*125;
  p+='<line x1="150" y1="150" x2="'+bx+'" y2="'+by+'" stroke="#38bdf8" stroke-width="3"/>';
  const crx=cx+Math.cos((st.theta-90)*Math.PI/180)*(st.r*sc), cry=cy+Math.sin((st.theta-90)*Math.PI/180)*(st.r*sc);
  p+='<circle cx="'+crx+'" cy="'+cry+'" r="5" fill="#10b981"/>';
  const wx=cx+Math.cos((whA-90)*Math.PI/180)*(whR*sc), wy=cy+Math.sin((whA-90)*Math.PI/180)*(whR*sc);
  p+='<rect x="'+(wx-7)+'" y="'+(wy-7)+'" width="14" height="14" fill="#f59e0b" rx="2"/>';
  loads.forEach(l=>{
    const lx=cx+Math.cos((l.thetaDeg-90)*Math.PI/180)*(l.rCm*sc), ly=cy+Math.sin((l.thetaDeg-90)*Math.PI/180)*(l.rCm*sc);
    p+='<circle cx="'+lx+'" cy="'+ly+'" r="6" fill="#ec4899" stroke="#fff"/><text x="'+(lx+8)+'" y="'+(ly+3)+'" fill="#f8fafc" font-size="9">'+l.id+'</text>';
  });
  sp.innerHTML=p;

  const ss=$('svgSide'),sx=260/rMax;
  let s='<line x1="25" y1="25" x2="25" y2="195" stroke="#475569" stroke-width="4"/><line x1="25" y1="25" x2="285" y2="25" stroke="#38bdf8" stroke-width="4"/>';
  const px=25+st.r*sx, py=25+Math.min(160,Math.max(10,st.z*3));
  s+='<rect x="'+(px-8)+'" y="22" width="16" height="8" fill="#38bdf8"/><line x1="'+px+'" y1="30" x2="'+px+'" y2="'+py+'" stroke="#cbd5e1" stroke-dasharray="3 3"/><rect x="'+(px-6)+'" y="'+py+'" width="12" height="10" fill="'+(st.mag?'#f59e0b':'#10b981')+'"/>';
  loads.forEach(l=>{const lx=25+l.rCm*sx; s+='<circle cx="'+lx+'" cy="190" r="5" fill="#ec4899"/>';});
  ss.innerHTML=s;
}

$('svgPolar').addEventListener('dblclick',ev=>{
  const rc=$('svgPolar').getBoundingClientRect();
  const x=(ev.clientX-rc.left)/rc.width*300-150, y=(ev.clientY-rc.top)/rc.height*300-150;
  const r=Math.min(rMax,Math.max(5,Math.round(Math.hypot(x,y)/(125/rMax))));
  let th=Math.round(Math.atan2(y,x)*180/Math.PI+90); if(th<0)th+=360;
  openLoadModal(-1,r,th);
});
$('svgSide').addEventListener('dblclick',ev=>{
  const rc=$('svgSide').getBoundingClientRect();
  const x=(ev.clientX-rc.left)/rc.width*300-25;
  const r=Math.min(rMax,Math.max(5,Math.round(x/(260/rMax))));
  openLoadModal(-1,r,Math.round(st.theta));
});

async function poll(){
  try{
    const d=await api('/api/estado');
    if(d){st=Object.assign(st,d); if(Array.isArray(d.cargas)) loads=d.cargas;}
    $('bState').textContent=st.estado;
    $('bLink').textContent='UNO: '+(st.link?'OK':'SIN ENLACE');
    $('kTheta').textContent=(+st.theta||0).toFixed(1)+' °';
    $('kRadio').textContent=(+st.r||0).toFixed(1)+' cm';
    $('kAltura').textContent=(+st.z||0).toFixed(1)+' cm';
    $('kSub').textContent=st.sub||'NINGUNO';
    $('kMag').textContent=st.mag?'ENERGIZADO':'APAGADO';
    $('kMot').textContent=(st.mot||0)+'/2';
    $('errBox').classList.toggle('hide',!st.err||st.err==='OK');
    $('errBox').textContent='Fallo activo: '+st.err;
    renderLoads(); drawPlots();
    const diag=await api('/api/diag');
    if(diag&&diag.rows){
      $('tbDiag').innerHTML=diag.rows.map(x=>'<tr><td>'+x.n+'</td><td><b>'+x.v+'</b></td><td style="color:#94a3b8">'+x.m+'</td></tr>').join('');
    }
    if(Array.isArray(st.logs)){
      $('tbLogs').innerHTML=st.logs.slice(0,25).map(l=>'<tr><td>'+l.t+'</td><td>'+l.s+'</td><td>'+l.msg+'</td></tr>').join('');
    }
  }catch(e){}
}
poll();
setInterval(poll,300);
</script>
</body>
</html>`;
}

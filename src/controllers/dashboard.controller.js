export function serveDashboard(req, res) {
  const token = req.query.token || '';
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panel Loyalty</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif}
body{background:#f7f5f2}
.hdr{background:#1a1a1a;padding:14px 20px;color:#f5c518;font-weight:800;font-size:16px}
.nav{background:#fff;border-bottom:1px solid #e8e6e0;display:flex;padding:0 20px}
.ni{padding:12px 16px;font-size:13px;color:#888;cursor:pointer;border-bottom:2px solid transparent}
.ni.on{color:#1a1a1a;font-weight:600;border-bottom-color:#1a1a1a}
.main{padding:20px}
.mets{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.met{background:#fff;border-radius:10px;padding:14px;border-left:4px solid #f5c518}
.ml{font-size:10px;text-transform:uppercase;color:#888;margin-bottom:6px}
.mv{font-size:26px;font-weight:800;color:#1a1a1a}
.sec{background:#fff;border-radius:10px;padding:18px;margin-bottom:14px}
.st{font-size:13px;font-weight:600;margin-bottom:12px}
.sf{display:flex;gap:8px;margin-bottom:12px}
.si{flex:1;padding:9px 12px;border:1px solid #e8e6e0;border-radius:7px;font-size:13px;outline:none}
.sb{padding:9px 16px;background:#1a1a1a;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
.rb{background:#f7f5f2;border-radius:7px;padding:12px;display:none;margin-bottom:10px}
.rb.on{display:block}
.ra{display:flex;gap:7px;margin-top:10px}
.bg{flex:1;padding:8px;background:#f5c518;color:#1a1a1a;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
.br{flex:1;padding:8px;background:#fff;color:#1a1a1a;border:1px solid #e8e6e0;border-radius:7px;font-size:12px;cursor:pointer}
.msg{padding:9px 12px;border-radius:7px;font-size:12px;margin-top:8px;display:none}
.msg.ok{background:#dcfce7;color:#166534;display:block}
.msg.err{background:#fee2e2;color:#991b1b;display:block}
.cr{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e8e6e0;border-radius:8px;margin-bottom:7px}
.ca{width:34px;height:34px;border-radius:50%;background:#f5c518;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.cn{font-size:13px;font-weight:600}
.cm{font-size:11px;color:#888;margin-top:1px}
.cs{font-size:12px;font-weight:700;margin-left:auto}
.pg{display:none}.pg.on{display:block}
</style>
</head>
<body>
<div class="hdr">★ Loyalty — Panel del negocio</div>
<div class="nav">
  <div class="ni on" onclick="pg('res',this)">Resumen</div>
  <div class="ni" onclick="pg('sel',this)">Dar Sellos</div>
  <div class="ni" onclick="pg('cli',this)">Clientes</div>
</div>
<div class="main">
  <div class="pg on" id="pg-res">
    <div class="mets">
      <div class="met"><div class="ml">Clientes</div><div class="mv" id="mc">-</div></div>
      <div class="met"><div class="ml">Sellos hoy</div><div class="mv" id="ms">-</div></div>
      <div class="met"><div class="ml">Premios</div><div class="mv" id="mp">-</div></div>
      <div class="met"><div class="ml">Emails</div><div class="mv" id="me">-</div></div>
    </div>
    <div class="sec"><div class="st" id="st">Cargando...</div></div>
  </div>
  <div class="pg" id="pg-sel">
    <div class="sec">
      <div class="st">Dar sello</div>
      <div class="sf">
        <input class="si" id="ci" placeholder="Código LC-2026-00001 o nombre">
        <button class="sb" onclick="buscar()">Buscar</button>
      </div>
      <div class="rb" id="rb">
        <div style="font-weight:600" id="rn"></div>
        <div style="font-size:11px;color:#888;margin-top:3px" id="rs"></div>
        <div class="ra">
          <button class="bg" onclick="sello()">+ Dar Sello</button>
          <button class="br">Canjear</button>
        </div>
      </div>
      <div class="msg" id="sm"></div>
    </div>
  </div>
  <div class="pg" id="pg-cli">
    <div class="sec">
      <div class="st" id="ct">Clientes</div>
      <div id="cl"></div>
    </div>
  </div>
</div>
<script>
const API='https://loyalty-backend-production-204b.up.railway.app';
const T='${token}';
let cur=null,cls=[];

async function load(){
  try{
    const r=await fetch(API+'/api/admin/stats/dashboard',{headers:{Authorization:'Bearer '+T}});
    const d=await r.json();
    document.getElementById('mc').textContent=d.metrics.totalCustomers;
    document.getElementById('ms').textContent=d.metrics.stampsToday;
    document.getElementById('mp').textContent=d.metrics.rewardsTotal;
    document.getElementById('me').textContent=d.metrics.emailCount;
    document.getElementById('st').textContent='✅ Sistema funcionando correctamente';
    const r2=await fetch(API+'/api/admin/customers?limit=100',{headers:{Authorization:'Bearer '+T}});
    const d2=await r2.json();
    cls=d2.customers||[];
    document.getElementById('ct').textContent=d2.total+' clientes registrados';
    const cl=document.getElementById('cl');
    cl.innerHTML=cls.map(c=>{
      const i=c.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return '<div class="cr"><div class="ca">'+i+'</div><div><div class="cn">'+c.name+'</div><div class="cm">'+c.cardCode+' · '+(c.email||'Sin email')+'</div></div><div class="cs">'+c.totalStamps+' ★</div></div>';
    }).join('');
  }catch(e){
    document.getElementById('st').textContent='Error: '+e.message;
  }
}

function pg(n,el){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+n).classList.add('on');
  el.classList.add('on');
}

function buscar(){
  const s=document.getElementById('ci').value.trim().toUpperCase();
  const f=cls.find(c=>c.cardCode===s||c.name.toUpperCase().includes(s));
  if(f){cur=f;document.getElementById('rn').textContent=f.name;document.getElementById('rs').textContent=f.totalStamps+' sellos · '+f.cardCode;document.getElementById('rb').classList.add('on');document.getElementById('sm').className='msg';}
  else msg('Cliente no encontrado','err');
}

async function sello(){
  if(!cur)return;
  try{
    const r=await fetch(API+'/api/admin/stamps/give',{method:'POST',headers:{Authorization:'Bearer '+T,'Content-Type':'application/json'},body:JSON.stringify({cardCode:cur.cardCode,method:'MANUAL'})});
    const d=await r.json();
    if(d.ok){cur.totalStamps++;document.getElementById('rs').textContent=cur.totalStamps+' sellos · '+cur.cardCode;msg('✅ Sello dado a '+cur.name,'ok');}
    else msg('❌ '+(d.error||'Error'),'err');
  }catch(e){msg('Error: '+e.message,'err');}
}

function msg(t,c){const e=document.getElementById('sm');e.textContent=t;e.className='msg '+c;}

load();
</script>
</body>
</html>`);
}

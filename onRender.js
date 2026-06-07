const THRESHOLD  = 55;
const MAX_POINTS = 300;

const LINE_COLORS = [
  '#f97316','#38bdf8','#a78bfa',
  '#34d399','#f472b6','#facc15',
];

function downsample(values,labels,threshold){
  if(values.length<=threshold)return{values,labels};
  const sv=[values[0]],sl=[labels[0]];
  const bucket=(values.length-2)/(threshold-2);
  let a=0;
  for(let i=0;i<threshold-2;i++){
    const rs=Math.floor((i+1)*bucket)+1;
    const re=Math.min(Math.floor((i+2)*bucket)+1,values.length);
    const cm=Math.min(Math.floor((rs+re)/2),values.length-1);
    let maxA=-1,maxI=rs;
    for(let j=rs;j<re;j++){
      const area=Math.abs((a-cm)*(values[j]-values[a])-(a-j)*(values[cm]-values[a]))*0.5;
      if(area>maxA){maxA=area;maxI=j;}
    }
    sv.push(values[maxI]);sl.push(labels[maxI]);a=maxI;
  }
  sv.push(values[values.length-1]);sl.push(labels[labels.length-1]);
  return{values:sv,labels:sl};
}

function extractAllSeries(){
  if(!data||!data.series||!data.series.length)return[];
  const result=[];
  data.series.forEach(frame=>{
    if(!frame||!frame.fields)return;
    const tf=frame.fields.find(f=>f.type==='time');
    if(!tf)return;
    const tv=typeof tf.values.toArray==='function'?tf.values.toArray():Array.from(tf.values);
    frame.fields.filter(f=>f.type==='number').forEach(vf=>{
      const vv=typeof vf.values.toArray==='function'?vf.values.toArray():Array.from(vf.values);
      const rl=[],rv=[];
      for(let i=0;i<tv.length;i++){
        const val=parseFloat(vv[i]);
        if(isNaN(val))continue;
        const d=new Date(tv[i]);
        rl.push(d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'));
        rv.push(val);
      }
      if(!rv.length)return;
      const ds=downsample(rv,rl,MAX_POINTS);
      result.push({name:vf.name||'Link',labels:ds.labels,values:ds.values});
    });
  });
  return result;
}

function parseName(raw){
  const b=(raw.match(/\[([^\]]+)\]/g)||[]).map(x=>x.replace(/[\[\]]/g,''));
  return{sla:b[0]?b[0].replace(/^SLA_/,''):raw,iface:b[1]||''};
}

function hexAlpha(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return`rgba(${r},${g},${b},${a})`;
}

function createCard(serie,idx){
  const{sla,iface}=parseName(serie.name);
  const v=serie.values;
  const last=v[v.length-1],avg=v.reduce((a,b)=>a+b,0)/v.length;
  const mx=Math.max(...v),mn=Math.min(...v);
  const fmt=x=>x%1===0?x.toFixed(0):x.toFixed(1);
  const bCls=last>THRESHOLD?'badge b-crit':last>THRESHOLD*0.85?'badge b-warn':'badge b-ok';
  const bTxt=last>THRESHOLD?'Crítico':last>THRESHOLD*0.85?'Atenção':'Normal';
  const card=document.createElement('div');
  card.className='card';
  card.innerHTML=`
    <div class="card-head">
      <div><div class="card-name">${sla}</div><div class="card-iface">${iface}</div></div>
      <span class="${bCls}">${bTxt}</span>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-lbl">Atual</div>
        <div><span class="kpi-val">${fmt(last)}</span><span class="kpi-unit">ms</span></div></div>
      <div class="kpi"><div class="kpi-lbl">Média</div>
        <div><span class="kpi-val">${fmt(avg)}</span><span class="kpi-unit">ms</span></div></div>
      <div class="kpi"><div class="kpi-lbl">Máx</div>
        <div><span class="kpi-val">${fmt(mx)}</span><span class="kpi-unit">ms</span></div></div>
      <div class="kpi"><div class="kpi-lbl">Mín</div>
        <div><span class="kpi-val">${fmt(mn)}</span><span class="kpi-unit">ms</span></div></div>
    </div>
    <div class="chart-wrap">
      <canvas data-idx="${idx}" aria-label="Latência ${sla} ${iface}"></canvas>
    </div>`;
  return card;
}

function drawChart(canvas,values,labels,palIdx){
  const color=LINE_COLORS[palIdx%LINE_COLORS.length];
  const W=canvas.offsetWidth||canvas.parentElement.offsetWidth||200;
  const H=canvas.offsetHeight||canvas.parentElement.offsetHeight||100;
  const dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);

  const PAD={top:12,right:40,bottom:28,left:38};
  const cW=W-PAD.left-PAD.right;
  const cH=H-PAD.top-PAD.bottom;
  const bot=PAD.top+cH;

  const minV=Math.min(...values);
  const maxV=Math.max(...values);
  const padding=(maxV-minV)*0.15||5;
  const yMin=Math.max(0,minV-padding);
  const yMax=maxV+padding*2;

  const xPos=i=>PAD.left+(values.length>1?(i/(values.length-1))*cW:cW/2);
  const yPos=v=>PAD.top+cH-((Math.min(v,yMax)-yMin)/(yMax-yMin))*cH;

  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;
  const steps=4;
  for(let s=0;s<=steps;s++){
    const yv=yMin+(yMax-yMin)*(s/steps);
    const y=yPos(yv);
    ctx.beginPath();ctx.moveTo(PAD.left,y);ctx.lineTo(PAD.left+cW,y);ctx.stroke();
    if(s>0){
      ctx.fillStyle='#252e3d';ctx.font='8px Inter,sans-serif';ctx.textAlign='right';
      ctx.fillText(Math.round(yv)+'ms',PAD.left-4,y+3);
    }
  }

  ctx.fillStyle='#252e3d';ctx.font='8px Inter,sans-serif';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(labels.length/6));
  for(let i=0;i<labels.length;i+=xStep)ctx.fillText(labels[i],xPos(i),H-PAD.bottom+11);

  const ty=yPos(THRESHOLD);
  if(ty>=PAD.top&&ty<=bot){
    ctx.save();
    ctx.strokeStyle='rgba(248,113,113,0.35)';ctx.lineWidth=0.9;
    ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(PAD.left,ty);ctx.lineTo(PAD.left+cW,ty);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(248,113,113,0.5)';ctx.font='8px Inter,sans-serif';ctx.textAlign='right';
    ctx.fillText(THRESHOLD+'ms',W-2,ty-3);
    ctx.restore();
  }

  const pts=values.map((v,i)=>({x:xPos(i),y:yPos(v)}));

  function buildPath(){
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[Math.max(i-1,0)],p1=pts[i];
      const p2=pts[i+1],p3=pts[Math.min(i+2,pts.length-1)];
      ctx.bezierCurveTo(
        p1.x+(p2.x-p0.x)/6,p1.y+(p2.y-p0.y)/6,
        p2.x-(p3.x-p1.x)/6,p2.y-(p3.y-p1.y)/6,
        p2.x,p2.y
      );
    }
  }

  const gradFill=ctx.createLinearGradient(0,PAD.top,0,bot);
  gradFill.addColorStop(0,   hexAlpha(color,0.55));
  gradFill.addColorStop(0.5, hexAlpha(color,0.40));
  gradFill.addColorStop(1,   hexAlpha(color,0.25));

  buildPath();
  ctx.lineTo(pts[pts.length-1].x,bot);
  ctx.lineTo(pts[0].x,bot);
  ctx.closePath();
  ctx.fillStyle=gradFill;
  ctx.fill();

  ctx.save();
  ctx.shadowColor=hexAlpha(color,0.70);ctx.shadowBlur=10;
  buildPath();
  ctx.strokeStyle=color;ctx.lineWidth=1.5;
  ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  ctx.restore();

  values.forEach((v,i)=>{
    if(v<=THRESHOLD)return;
    const px=xPos(i),py=yPos(v);
    ctx.save();ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);
    ctx.fillStyle='rgba(248,113,113,0.2)';ctx.fill();ctx.restore();
    ctx.save();
    ctx.shadowColor='rgba(248,113,113,0.8)';ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);
    ctx.fillStyle='#f87171';ctx.fill();ctx.restore();
  });

  canvas._data={pts,values,labels,W,H,PAD,color};
}

function attachTooltip(canvas){
  if(canvas._tipOk)return;canvas._tipOk=true;
  const wrap=canvas.parentElement;
  const tip=document.createElement('div');
  tip.style.cssText='position:absolute;background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:5px;padding:5px 10px;font-size:10px;color:#e2e8f0;pointer-events:none;display:none;z-index:999;white-space:nowrap;font-family:Inter,sans-serif;';
  const vl=document.createElement('div');
  vl.style.cssText='position:absolute;width:1px;background:rgba(255,255,255,0.08);pointer-events:none;display:none;z-index:998;';
  wrap.appendChild(tip);wrap.appendChild(vl);
  canvas.addEventListener('mousemove',e=>{
    const d=canvas._data;if(!d)return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    let best=0,bd=Infinity;
    d.pts.forEach((p,i)=>{const dd=Math.abs(p.x-mx);if(dd<bd){bd=dd;best=i;}});
    const v=d.values[best],col=v>THRESHOLD?'#f87171':d.color;
    const warn=v>THRESHOLD?`<br><span style="color:#f87171;font-size:9px">▲ acima do limiar</span>`:'';
    tip.innerHTML=`<span style="color:#7a8499;font-size:9px">${d.labels[best]}</span><br><span style="color:${col};font-weight:600">${v.toFixed(1)}ms</span>${warn}`;
    tip.style.left=Math.min(d.pts[best].x+8,d.W-95)+'px';
    tip.style.top=Math.max(d.pts[best].y-52,d.PAD.top)+'px';
    tip.style.display='block';
    vl.style.left=d.pts[best].x+'px';vl.style.top=d.PAD.top+'px';
    vl.style.height=(d.H-d.PAD.top-d.PAD.bottom)+'px';vl.style.display='block';
  });
  canvas.addEventListener('mouseleave',()=>{tip.style.display='none';vl.style.display='none';});
}

const allSeries=extractAllSeries();
const grid=htmlNode.getElementById('cardsGrid');
const sub=htmlNode.getElementById('dashSub');
const upd=htmlNode.getElementById('dashUpd');

if(!allSeries.length){
  grid.innerHTML=`<div style="color:#3d4a5c;font-size:12px;padding:20px;grid-column:1/-1;text-align:center;">
    <div style="font-size:22px;margin-bottom:8px">⚠</div>Sem dados</div>`;
}else{
  const n=allSeries.length;
  const cols=n<=2?n:n<=4?2:3;
  grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  grid.innerHTML='';
  allSeries.forEach((s,i)=>grid.appendChild(createCard(s,i)));

  // ── Nome do host extraído dinamicamente dos dados ──
  const hostName = (()=>{
    try{
      const frame = data.series[0];
      const tf = frame.fields.find(f=>f.type==='number');
      if(!tf||!tf.name)return'';
      // Tenta extrair o host do nome do field, ex: "NOME-HOST: Latency"
      const m = tf.name.match(/^([^:[\]]+?)[\s:[]/);
      return m ? m[1].trim() : '';
    }catch(e){return'';}
  })();

  sub.textContent = (hostName ? hostName + ' · ' : '') + n + ' links monitorados';
  upd.textContent='atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  function drawAll(tries){
    let pending=false;
    htmlNode.querySelectorAll('canvas[data-idx]').forEach(cv=>{
      const i=parseInt(cv.dataset.idx);
      const W=cv.offsetWidth||cv.parentElement.offsetWidth;
      const H=cv.offsetHeight||cv.parentElement.offsetHeight;
      if(W>10&&H>10){drawChart(cv,allSeries[i].values,allSeries[i].labels,i);attachTooltip(cv);}
      else pending=true;
    });
    if(pending&&tries>0)setTimeout(()=>drawAll(tries-1),80);
  }
  setTimeout(()=>drawAll(15),60);
}

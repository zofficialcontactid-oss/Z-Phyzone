// CURSOR
const cur = document.getElementById('cur');
const curRing = document.getElementById('curRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX; my=e.clientY;
  cur.style.transform=`translate(${mx-6}px,${my-6}px)`;
});
function animRing(){
  rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
  curRing.style.transform=`translate(${rx-18}px,${ry-18}px)`;
  requestAnimationFrame(animRing);
}
animRing();

// BACKGROUND PARTICLES
const canvas = document.getElementById('canvas-bg');
const ctx = canvas.getContext('2d');
let W,H,particles=[];
function resize(){
  W=canvas.width=window.innerWidth;
  H=canvas.height=window.innerHeight;
}
resize();
window.addEventListener('resize',resize);

class Particle {
  constructor(){this.reset();}
  reset(){
    this.x=Math.random()*W;
    this.y=Math.random()*H;
    this.vx=(Math.random()-0.5)*0.3;
    this.vy=(Math.random()-0.5)*0.3;
    this.r=Math.random()*1.5+0.5;
    this.a=Math.random()*0.5+0.1;
    this.life=0;
    this.maxLife=Math.random()*300+200;
  }
  update(){
    this.x+=this.vx; this.y+=this.vy; this.life++;
    if(this.life>this.maxLife||this.x<0||this.x>W||this.y<0||this.y>H) this.reset();
  }
  draw(){
    const prog=this.life/this.maxLife;
    const alpha=this.a*Math.sin(prog*Math.PI);
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(59,130,246,${alpha})`;
    ctx.fill();
  }
}

for(let i=0;i<120;i++) particles.push(new Particle());

function drawConnections(){
  for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
      const dx=particles[i].x-particles[j].x;
      const dy=particles[i].y-particles[j].y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<100){
        ctx.beginPath();
        ctx.moveTo(particles[i].x,particles[i].y);
        ctx.lineTo(particles[j].x,particles[j].y);
        ctx.strokeStyle=`rgba(59,130,246,${(1-dist/100)*0.12})`;
        ctx.lineWidth=0.5;
        ctx.stroke();
      }
    }
  }
}

function bgLoop(){
  ctx.clearRect(0,0,W,H);
  particles.forEach(p=>{p.update();p.draw();});
  drawConnections();
  requestAnimationFrame(bgLoop);
}
bgLoop();

// FREE FALL PREVIEW ANIMATION
const ffC = document.getElementById('ffCanvas');
if(ffC){
  const fc = ffC.getContext('2d');
  let ffy=10, ffv=0, ffg=0.18, fftrail=[];
  function ffDraw(){
    fc.clearRect(0,0,300,180);
    // bg gradient
    const grd=fc.createLinearGradient(0,0,0,180);
    grd.addColorStop(0,'rgba(10,14,26,1)');
    grd.addColorStop(1,'rgba(26,42,108,0.6)');
    fc.fillStyle=grd; fc.fillRect(0,0,300,180);
    // grid lines
    fc.strokeStyle='rgba(37,99,235,0.1)'; fc.lineWidth=0.5;
    for(let i=0;i<300;i+=30){fc.beginPath();fc.moveTo(i,0);fc.lineTo(i,180);fc.stroke();}
    for(let i=0;i<180;i+=30){fc.beginPath();fc.moveTo(0,i);fc.lineTo(300,i);fc.stroke();}
    // velocity arrow
    const arrLen=Math.min(ffv*6,40);
    fc.strokeStyle='rgba(103,232,249,0.7)'; fc.lineWidth=1.5;
    fc.beginPath(); fc.moveTo(150,ffy); fc.lineTo(150,ffy+arrLen);fc.stroke();
    // trail
    fftrail.push({x:150,y:ffy,a:1});
    if(fftrail.length>20) fftrail.shift();
    fftrail.forEach((t,i)=>{
      fc.beginPath();
      fc.arc(t.x,t.y,3*(i/fftrail.length),0,Math.PI*2);
      fc.fillStyle=`rgba(59,130,246,${0.6*i/fftrail.length})`;
      fc.fill();
    });
    // ball
    const ballGrad=fc.createRadialGradient(148,ffy-2,1,150,ffy,8);
    ballGrad.addColorStop(0,'#93c5fd'); ballGrad.addColorStop(1,'#2563eb');
    fc.beginPath(); fc.arc(150,ffy,8,0,Math.PI*2);
    fc.fillStyle=ballGrad; fc.fill();
    // ground
    fc.fillStyle='rgba(59,130,246,0.3)'; fc.fillRect(0,168,300,4);
    // label
    fc.fillStyle='rgba(103,232,249,0.8)'; fc.font='10px Space Mono,monospace';
    fc.fillText(`v = ${(ffv*5).toFixed(1)} m/s`,8,16);
    fc.fillText(`h = ${((168-ffy)/10).toFixed(1)} m`,8,30);
    // update physics
    ffv+=ffg; ffy+=ffv;
    if(ffy>=162){ffy=162;ffv=0;
      setTimeout(()=>{ffy=10;ffv=0;fftrail=[];},800);
    }
    requestAnimationFrame(ffDraw);
  }
  ffDraw();
}

// PENDULUM PREVIEW
const penC = document.getElementById('penCanvas');
if(penC){
  const pc = penC.getContext('2d');
  let pAngle=Math.PI/4, pOmega=0, pAlpha=0, pL=80, pG=0.008;
  function penDraw(){
    pc.clearRect(0,0,300,180);
    const grd=pc.createLinearGradient(0,0,0,180);
    grd.addColorStop(0,'rgba(10,14,26,1)'); grd.addColorStop(1,'rgba(26,42,108,0.5)');
    pc.fillStyle=grd; pc.fillRect(0,0,300,180);
    pc.strokeStyle='rgba(37,99,235,0.08)'; pc.lineWidth=0.5;
    for(let i=0;i<300;i+=30){pc.beginPath();pc.moveTo(i,0);pc.lineTo(i,180);pc.stroke();}
    for(let i=0;i<180;i+=30){pc.beginPath();pc.moveTo(0,i);pc.lineTo(300,i);pc.stroke();}
    const ox=150, oy=30;
    const bx=ox+pL*Math.sin(pAngle);
    const by=oy+pL*Math.cos(pAngle);
    pc.strokeStyle='rgba(148,163,184,0.5)'; pc.lineWidth=1.5;
    pc.beginPath(); pc.moveTo(ox,oy); pc.lineTo(bx,by); pc.stroke();
    pc.beginPath(); pc.arc(ox,oy,4,0,Math.PI*2);
    pc.fillStyle='rgba(148,163,184,0.6)'; pc.fill();
    const bg=pc.createRadialGradient(bx-2,by-2,1,bx,by,9);
    bg.addColorStop(0,'#93c5fd'); bg.addColorStop(1,'#2563eb');
    pc.beginPath(); pc.arc(bx,by,9,0,Math.PI*2);
    pc.fillStyle=bg; pc.fill();
    pc.fillStyle='rgba(103,232,249,0.7)'; pc.font='10px Space Mono,monospace';
    pc.fillText(`θ = ${(pAngle*180/Math.PI).toFixed(1)}°`,8,16);
    pAlpha=-pG*Math.sin(pAngle);
    pOmega+=pAlpha; pOmega*=0.9995;
    pAngle+=pOmega;
    requestAnimationFrame(penDraw);
  }
  penDraw();
}

// PROJECTILE PREVIEW
const projC = document.getElementById('projCanvas');
if(projC){
  const rc = projC.getContext('2d');
  let pt=0, pVx=3.5, pVy=0, pAng=45*Math.PI/180, pSpeed=4;
  pVx=pSpeed*Math.cos(pAng); pVy=-pSpeed*Math.sin(pAng);
  let px=30, py=160, trail=[];
  function projDraw(){
    rc.clearRect(0,0,300,180);
    const grd=rc.createLinearGradient(0,0,0,180);
    grd.addColorStop(0,'rgba(10,14,26,1)'); grd.addColorStop(1,'rgba(26,42,108,0.5)');
    rc.fillStyle=grd; rc.fillRect(0,0,300,180);
    rc.strokeStyle='rgba(37,99,235,0.08)'; rc.lineWidth=0.5;
    for(let i=0;i<300;i+=30){rc.beginPath();rc.moveTo(i,0);rc.lineTo(i,180);rc.stroke();}
    for(let i=0;i<180;i+=30){rc.beginPath();rc.moveTo(0,i);rc.lineTo(300,i);rc.stroke();}
    trail.push({x:px,y:py});
    if(trail.length>40) trail.shift();
    if(trail.length>1){
      rc.beginPath(); rc.moveTo(trail[0].x,trail[0].y);
      trail.forEach((t,i)=>{
        rc.lineTo(t.x,t.y);
        rc.strokeStyle=`rgba(59,130,246,${i/trail.length*0.6})`;
      });
      rc.stroke();
    }
    const bg=rc.createRadialGradient(px-2,py-2,1,px,py,7);
    bg.addColorStop(0,'#93c5fd'); bg.addColorStop(1,'#2563eb');
    rc.beginPath(); rc.arc(px,py,7,0,Math.PI*2);
    rc.fillStyle=bg; rc.fill();
    rc.fillStyle='rgba(59,130,246,0.3)'; rc.fillRect(0,168,300,4);
    rc.fillStyle='rgba(103,232,249,0.7)'; rc.font='10px Space Mono,monospace';
    rc.fillText(`x=${px.toFixed(0)}  y=${(168-py).toFixed(0)}`,8,16);
    pVy+=0.06; px+=pVx; py+=pVy;
    if(py>=162 || px>300){
      px=30; py=160; pVx=pSpeed*Math.cos(pAng); pVy=-pSpeed*Math.sin(pAng); trail=[];
    }
    requestAnimationFrame(projDraw);
  }
  projDraw();
}

// SCROLL REVEAL
const reveals=document.querySelectorAll('.reveal');
const obs=new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{
    if(e.isIntersecting){
      setTimeout(()=>e.target.classList.add('visible'),i*80);
    }
  });
},{threshold:0.1});
reveals.forEach(r=>obs.observe(r));

// NAV scroll effect
const nav=document.querySelector('nav');
window.addEventListener('scroll',()=>{
  nav.style.borderBottomColor=window.scrollY>50?'rgba(59,130,246,0.4)':'rgba(59,130,246,0.25)';
});
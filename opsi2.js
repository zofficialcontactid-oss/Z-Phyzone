// APLIKASI TEMA SAAT LOAD
function checkTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('light-theme');
    }
}
checkTheme();

// CURSOR
const cur = document.getElementById('cur');
const curRing = document.getElementById('curRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX; my=e.clientY;
  if(cur) cur.style.transform=`translate(${mx-6}px,${my-6}px)`;
});
function animRing(){
  rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
  if(curRing) curRing.style.transform=`translate(${rx-18}px,${ry-18}px)`;
  requestAnimationFrame(animRing);
}
animRing();

// BACKGROUND PARTICLES
const canvas = document.getElementById('canvas-bg');
if(canvas) {
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
        const isLight = document.documentElement.classList.contains('light-theme');
        ctx.fillStyle = isLight ? `rgba(37,99,235,${alpha})` : `rgba(59,130,246,${alpha})`;
        ctx.fill();
      }
    }

    for(let i=0;i<120;i++) particles.push(new Particle());

    function drawConnections(){
      const isLight = document.documentElement.classList.contains('light-theme');
      for(let i=0;i<particles.length;i++){
        for(let j=i+1;j<particles.length;j++){
          const dx=particles[i].x-particles[j].x;
          const dy=particles[i].y-particles[j].y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<100){
            ctx.beginPath();
            ctx.moveTo(particles[i].x,particles[i].y);
            ctx.lineTo(particles[j].x,particles[j].y);
            ctx.strokeStyle= isLight ? `rgba(37,99,235,${(1-dist/100)*0.12})` : `rgba(59,130,246,${(1-dist/100)*0.12})`;
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
}

// FREE FALL PREVIEW ANIMATION
const ffC = document.getElementById('ffCanvas');
if(ffC){
  const fc = ffC.getContext('2d');
  let ffy=10, ffv=0, ffg=0.18, fftrail=[];
  function ffDraw(){
    fc.clearRect(0,0,300,180);
    const isLight = document.documentElement.classList.contains('light-theme');
    const grd=fc.createLinearGradient(0,0,0,180);
    grd.addColorStop(0, isLight ? 'rgba(226,232,240,1)' : 'rgba(10,14,26,1)');
    grd.addColorStop(1, isLight ? 'rgba(203,213,225,0.6)' : 'rgba(26,42,108,0.6)');
    fc.fillStyle=grd; fc.fillRect(0,0,300,180);
    fc.strokeStyle= isLight ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)'; fc.lineWidth=0.5;
    for(let i=0;i<300;i+=30){fc.beginPath();fc.moveTo(i,0);fc.lineTo(i,180);fc.stroke();}
    for(let i=0;i<180;i+=30){fc.beginPath();fc.moveTo(0,i);fc.lineTo(300,i);fc.stroke();}
    const arrLen=Math.min(ffv*6,40);
    fc.strokeStyle= isLight ? 'rgba(2,132,199,0.7)' : 'rgba(103,232,249,0.7)'; fc.lineWidth=1.5;
    fc.beginPath(); fc.moveTo(150,ffy); fc.lineTo(150,ffy+arrLen);fc.stroke();
    fftrail.push({x:150,y:ffy,a:1});
    if(fftrail.length>20) fftrail.shift();
    fftrail.forEach((t,i)=>{
      fc.beginPath();
      fc.arc(t.x,t.y,3*(i/fftrail.length),0,Math.PI*2);
      fc.fillStyle=`rgba(59,130,246,${0.6*i/fftrail.length})`;
      fc.fill();
    });
    const ballGrad=fc.createRadialGradient(148,ffy-2,1,150,ffy,8);
    ballGrad.addColorStop(0, isLight ? '#3b82f6' : '#93c5fd'); ballGrad.addColorStop(1,'#2563eb');
    fc.beginPath(); fc.arc(150,ffy,8,0,Math.PI*2);
    fc.fillStyle=ballGrad; fc.fill();
    fc.fillStyle='rgba(59,130,246,0.3)'; fc.fillRect(0,168,300,4);
    fc.fillStyle= isLight ? '#0284c7' : 'rgba(103,232,249,0.8)'; fc.font='10px Space Mono,monospace';
    fc.fillText(`v = ${(ffv*5).toFixed(1)} m/s`,8,16);
    fc.fillText(`h = ${((168-ffy)/10).toFixed(1)} m`,8,30);
    ffv+=ffg; ffy+=ffv;
    if(ffy>=162){ffy=162;ffv=0; setTimeout(()=>{ffy=10;ffv=0;fftrail=[];},800); }
    requestAnimationFrame(ffDraw);
  }
  ffDraw();
}

// SCROLL REVEAL
const reveals=document.querySelectorAll('.reveal');
const obs=new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{
    if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('visible'),i*80); }
  });
},{threshold:0.1});
reveals.forEach(r=>obs.observe(r));

// NAV scroll effect
const nav=document.querySelector('nav');
if(nav){
    window.addEventListener('scroll',()=>{
      nav.style.borderBottomColor=window.scrollY>50?'rgba(59,130,246,0.4)':'rgba(59,130,246,0.25)';
    });
}

// SIDEBAR TOGGLE LOGIC (Khusus index.html & materi.html)
const sidebar = document.getElementById('right-sidebar');
const overlay = document.getElementById('sidebar-overlay');
const openBtn = document.getElementById('btn-open-sidebar');
const closeBtn = document.getElementById('btn-close-sidebar');

if (sidebar && overlay && openBtn && closeBtn) {
    function openSide() { sidebar.classList.add('active'); overlay.classList.add('active'); }
    function closeSide() { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
    openBtn.addEventListener('click', openSide);
    closeBtn.addEventListener('click', closeSide);
    overlay.addEventListener('click', closeSide);
    
    // Tutup jika link ditekan
    const navItems = document.querySelectorAll('.snav-item');
    navItems.forEach(item => item.addEventListener('click', closeSide));
}

// THEME TOGGLE LOGIC GLOBAL
const themeBtns = document.querySelectorAll('.btn-theme-toggle');
function updateThemeUI() {
    const isLight = document.documentElement.classList.contains('light-theme');
    themeBtns.forEach(btn => {
        btn.innerHTML = isLight ? '🌙 Mode Gelap' : '🌞 Mode Terang';
    });
}
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-theme');
        const isLight = document.documentElement.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateThemeUI();
    });
});
updateThemeUI();
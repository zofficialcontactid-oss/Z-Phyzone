/* =========================================
   1. KONSTANTA & VARIABEL GLOBAL
   ========================================= */
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// Parameter Fisika Alam
const g = 9.81;
const airDensity = 1.225;
const dragCoeffAir = 0.47;

// Parameter Visual
const maxHeight = 75;
const groundY = canvas.height - 50; 
const pixelsPerMeter = (groundY - 50) / maxHeight; 

// State Simulasi
let leftBall = null;
let rightBall = null;
let isRunning = false;
let animationId = null;
let chart1 = null;
let chart2 = null;

let stars = [];
let currentGraph1 = 'speed';
let currentGraph2 = 'accel';

let chartBounds = { time: 10, speed: 40, height: 75, accel: 12 };

// PERBAIKAN LAG: Penghitung frame untuk update grafik
let frameCounter = 0; 

/* =========================================
   2. INITIALIZATION & EVENT LISTENERS
   ========================================= */

function initStars() {
    stars = [];
    for(let i=0; i<150; i++) {
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * groundY, r: Math.random() * 1.5, opacity: Math.random() });
    }
}

function updatePageTheme() {
    const leftAtm = document.querySelector('input[name="atm-left"]:checked').value;
    const rightAtm = document.querySelector('input[name="atm-right"]:checked').value;
    const body = document.body;

    if (leftAtm === 'vacuum' && rightAtm === 'vacuum') body.style.background = "radial-gradient(circle at center, #1b2735 0%, #090a0f 100%)";
    else if (leftAtm === 'air' && rightAtm === 'air') body.style.background = "linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 100%)";
    else if (leftAtm === 'vacuum' && rightAtm === 'air') body.style.background = "linear-gradient(to right, #090a0f 40%, #87CEEB 60%)";
    else body.style.background = "linear-gradient(to right, #87CEEB 40%, #090a0f 60%)";
    
    draw();
}

document.querySelectorAll('input[name="atm-left"], input[name="atm-right"]').forEach(radio => {
    radio.addEventListener('change', function(e) {
        if (leftBall && !isRunning) leftBall.atmosphere = document.querySelector('input[name="atm-left"]:checked').value;
        if (rightBall && !isRunning) rightBall.atmosphere = document.querySelector('input[name="atm-right"]:checked').value;
        updatePageTheme();
    });
});

/* --- LOGIKA PERHITUNGAN MASSA JENIS & UPDATE UI --- */

// Fungsi baru untuk menghitung dan menampilkan massa jenis ke layar
function updateDensityDisplay(side) {
    const massVal = parseFloat(document.getElementById(`mass-${side}`).value);
    const diamVal = parseFloat(document.getElementById(`diameter-${side}`).value);
    const displayEl = document.getElementById(`density-display-${side}`);
    
    // Cegah error jika input kosong/nol
    if (isNaN(massVal) || isNaN(diamVal) || diamVal <= 0) {
        displayEl.textContent = 'ρ = - kg/m³';
        return;
    }
    
    // Rumus: Volume Bola = 4/3 * pi * r^3, lalu Rho = m / V
    const radius = diamVal / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const density = massVal / volume;
    
    // Tampilkan format angka yang cantik tanpa desimal berlebih
    displayEl.textContent = `ρ = ${density.toLocaleString('id-ID', {maximumFractionDigits: 0})} kg/m³`;
}

function hitungMassaOtomatis(side) {
    const matSelect = document.getElementById(`material-${side}`);
    if (matSelect.value === 'custom') return;

    const massaJenis = parseFloat(matSelect.value); 
    let diam = parseFloat(document.getElementById(`diameter-${side}`).value);
    
    if (isNaN(diam) || diam <= 0) diam = 0.01; 

    // Hitung Volume Bola ( V = 4/3 * pi * r^3 )
    const radius = diam / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    
    // Hitung Massa ( m = rho * V )
    const hitungMassa = massaJenis * volume;

    // Update angka di HTML
    const massInput = document.getElementById(`mass-${side}`);
    massInput.value = hitungMassa.toFixed(3);
    
    let ball = side === 'left' ? leftBall : rightBall;
    if (ball && !isRunning) ball.mass = hitungMassa;
}

// Pasang pendeteksi perubahan (Event Listeners)
['left', 'right'].forEach(side => {
    // Jalankan sekali saat halaman pertama dimuat agar angka rho muncul
    setTimeout(() => updateDensityDisplay(side), 100);

    // Jika dropdown material diubah
    document.getElementById(`material-${side}`).addEventListener('change', () => {
        hitungMassaOtomatis(side);
        updateDensityDisplay(side); // Panggil fungsi update rho
    });

    // Jika input diameter diketik manual
    document.getElementById(`diameter-${side}`).addEventListener('input', e => {
        let ball = side === 'left' ? leftBall : rightBall;
        if (ball && !isRunning) {
            ball.diameter = parseFloat(e.target.value);
            hitungMassaOtomatis(side); 
            updateDensityDisplay(side); // Panggil fungsi update rho
            draw();
        }
    });

    // Jika input massa diketik manual
    document.getElementById(`mass-${side}`).addEventListener('input', e => {
        document.getElementById(`material-${side}`).value = 'custom'; 
        let ball = side === 'left' ? leftBall : rightBall;
        if (ball && !isRunning) ball.mass = parseFloat(e.target.value);
        updateDensityDisplay(side); // Panggil fungsi update rho
    });
});

// --- SINKRONISASI KETINGGIAN KIRI ---
const heightLeftRange = document.getElementById('height-left');
const heightLeftInput = document.getElementById('height-left-val');
heightLeftRange.addEventListener('input', function(e) { heightLeftInput.value = e.target.value; if (leftBall && !isRunning) updateBallPosition('left'); });
heightLeftInput.addEventListener('input', function(e) { let val = parseFloat(e.target.value); if (isNaN(val)) val = 0; if (val > 75) val = 75; heightLeftRange.value = val; if (leftBall && !isRunning) updateBallPosition('left'); });

// --- SINKRONISASI KETINGGIAN KANAN ---
const heightRightRange = document.getElementById('height-right');
const heightRightInput = document.getElementById('height-right-val');
heightRightRange.addEventListener('input', function(e) { heightRightInput.value = e.target.value; if (rightBall && !isRunning) updateBallPosition('right'); });
heightRightInput.addEventListener('input', function(e) { let val = parseFloat(e.target.value); if (isNaN(val)) val = 0; if (val > 75) val = 75; heightRightRange.value = val; if (rightBall && !isRunning) updateBallPosition('right'); });

document.getElementById('play-btn').addEventListener('click', startSimulation);
document.getElementById('pause-btn').addEventListener('click', pauseSimulation);
document.getElementById('reset-btn').addEventListener('click', resetSimulation);

document.querySelectorAll('.graph-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const chartNum = this.dataset.chart;
        const graphType = this.dataset.graph;
        document.querySelectorAll(`.graph-btn[data-chart="${chartNum}"]`).forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (chartNum === '1') { currentGraph1 = graphType; updateChartConfig(1); } 
        else { currentGraph2 = graphType; updateChartConfig(2); }
        updateCharts(); 
    });
});

/* =========================================
   3. LOGIKA FISIKA & OBJEK
   ========================================= */

function initializeBalls() {
    const heightLeft = parseFloat(document.getElementById('height-left').value);
    const heightRight = parseFloat(document.getElementById('height-right').value);

    leftBall = createBallObject({ massId: 'mass-left', diamId: 'diameter-left', height: heightLeft, atmName: 'atm-left', xPos: canvas.width * 0.25 }); 
    rightBall = createBallObject({ massId: 'mass-right', diamId: 'diameter-right', height: heightRight, atmName: 'atm-right', xPos: canvas.width * 0.75 }); 

    updatePageTheme(); 
    draw(); 
}

function createBallObject(params) {
    const massEl = document.getElementById(params.massId);
    const diamEl = document.getElementById(params.diamId);
    const atmEl = document.querySelector(`input[name="${params.atmName}"]:checked`);

    return {
        mass: massEl ? parseFloat(massEl.value) : 1,
        diameter: diamEl ? parseFloat(diamEl.value) : 0.1,
        initialHeight: params.height,
        x: params.xPos,
        y: getYFromHeight(params.height),
        initialY: getYFromHeight(params.height),
        velocity: 0,
        acceleration: 0,
        time: 0,
        height: params.height,
        distance: 0,
        vInitial: 0,
        vFinal: 0,
        vTerminal: 0,
        isActive: false,
        hasHitGround: false, 
        atmosphere: atmEl ? atmEl.value : 'air',
        lastLogTime: -1, 
        historySpeed: [], historyAccel: [], historyHeight: [], historyHeightSpeed: []
    };
}

function getYFromHeight(height) { return groundY - (height * pixelsPerMeter); }

function updateBallPosition(side) {
    if (side === 'left' && leftBall) {
        const height = parseFloat(document.getElementById('height-left').value);
        leftBall.initialHeight = height; leftBall.y = getYFromHeight(height); leftBall.initialY = leftBall.y;
    } else if (side === 'right' && rightBall) {
        const height = parseFloat(document.getElementById('height-right').value);
        rightBall.initialHeight = height; rightBall.y = getYFromHeight(height); rightBall.initialY = rightBall.y;
    }
    draw();
}

function calculateTerminalVelocity(ball) {
    if (ball.atmosphere === 'vacuum') return Infinity;
    const radius = ball.diameter / 2;
    const A = Math.PI * radius * radius;
    const k = 0.5 * dragCoeffAir * airDensity * A;
    const effectiveWeight = ball.mass * g; 
    if (effectiveWeight <= 0) return 0;
    return Math.sqrt(effectiveWeight / k);
}

// PERBAIKAN BUG: Mencegah input 0 atau angka negatif agar tidak terjadi Infinity
function refreshBallParams(ball, side) {
    let massVal = parseFloat(document.getElementById(`mass-${side}`).value);
    let diamVal = parseFloat(document.getElementById(`diameter-${side}`).value);

    // KOREKSI OTOMATIS: Jika tidak valid, kembalikan ke angka aman terkecil
    if (isNaN(massVal) || massVal <= 0) { massVal = 0.001; document.getElementById(`mass-${side}`).value = 0.001; }
    if (isNaN(diamVal) || diamVal <= 0) { diamVal = 0.01; document.getElementById(`diameter-${side}`).value = 0.01; }

    ball.mass = massVal;
    ball.diameter = diamVal;
    ball.atmosphere = document.querySelector(`input[name="atm-${side}"]:checked`).value;
    ball.velocity = 0; ball.time = 0; ball.distance = 0; ball.hasHitGround = false;
    ball.vTerminal = calculateTerminalVelocity(ball);
}

/* =========================================
   4. CORE SIMULATION LOOP
   ========================================= */

function calculateChartBounds() {
    let maxTime = 0; let maxSpeed = 0; let maxHeight = Math.max(leftBall.initialHeight, rightBall.initialHeight);

    [leftBall, rightBall].forEach(ball => {
        const radius = ball.diameter / 2; const A = Math.PI * radius * radius;
        const k = 0.5 * dragCoeffAir * airDensity * A; const effectiveWeight = ball.mass * g;
        const terminalVel = ball.atmosphere === 'vacuum' ? Infinity : Math.sqrt(effectiveWeight / k);
        const tau = ball.atmosphere === 'vacuum' ? Infinity : ball.mass / Math.sqrt(effectiveWeight * k);
        let t = 0; let h = ball.initialHeight; let v = 0;

        while (h > 0 && t < 150) { 
            t += 0.1;
            if (ball.atmosphere === 'vacuum') { v = g * t; h = ball.initialHeight - 0.5 * g * t * t; } 
            else { v = terminalVel * Math.tanh(t / tau); h = ball.initialHeight - terminalVel * tau * Math.log(Math.cosh(t / tau)); }
        }
        if (t > maxTime) maxTime = t; if (v > maxSpeed) maxSpeed = v;
    });

    chartBounds.time = Math.max(2, Math.ceil(maxTime * 1.1)); 
    chartBounds.speed = Math.max(5, Math.ceil(maxSpeed * 1.1));
    chartBounds.height = Math.max(10, Math.ceil(maxHeight * 1.1));
    chartBounds.accel = 12; 
}

function startSimulation() {
    if (!leftBall || !rightBall) initializeBalls();
    [leftBall, rightBall].forEach(ball => {
        ball.historySpeed = []; ball.historyAccel = []; ball.historyHeight = []; ball.historyHeightSpeed = []; ball.lastLogTime = -1; 
    });
    
    refreshBallParams(leftBall, 'left'); refreshBallParams(rightBall, 'right');
    updatePageTheme(); calculateChartBounds(); initCharts();           

    isRunning = true; const now = Date.now();
    leftBall.isActive = true; leftBall.startTime = now;
    rightBall.isActive = true; rightBall.startTime = now;
    
    frameCounter = 0; // Reset counter saat mulai
    animate();    
}

function pauseSimulation() { isRunning = false; if (animationId) cancelAnimationFrame(animationId); }

function resetSimulation() {
    pauseSimulation(); initializeBalls();
    if (chart1) { chart1.data.datasets[0].data = []; chart1.data.datasets[1].data = []; chart1.update(); }
    if (chart2) { chart2.data.datasets[0].data = []; chart2.data.datasets[1].data = []; chart2.update(); }
    ['left', 'right'].forEach(side => {
        ['current-height', 'distance', 'speed', 'time', 'accel'].forEach(id => document.getElementById(`${id}-${side}`).textContent = '0.00');
        ['v-final', 'v-terminal'].forEach(id => document.getElementById(`${id}-${side}`).textContent = '-');
    });
    draw();
}

function animate() {
    if (!isRunning) return;
    const now = Date.now();
    let allFinished = true;

    if (leftBall.isActive) {
        const timeElapsed = (now - leftBall.startTime) / 1000;
        updateBallPhysics(leftBall, timeElapsed);
        if (!leftBall.hasHitGround) allFinished = false;
        else if (leftBall.isActive) { leftBall.isActive = false; leftBall.vFinal = Math.max(...leftBall.historySpeed.map(p => p.y)); }
    }

    if (rightBall.isActive) {
        const timeElapsed = (now - rightBall.startTime) / 1000;
        updateBallPhysics(rightBall, timeElapsed);
        if (!rightBall.hasHitGround) allFinished = false;
        else if (rightBall.isActive) { rightBall.isActive = false; rightBall.vFinal = Math.max(...rightBall.historySpeed.map(p => p.y)); }
    }

    draw(); 
    updateDisplays(); 

    // PERBAIKAN LAG: Update grafik chart hanya setiap 4 frame (~15 FPS)
    frameCounter++;
    if (frameCounter % 4 === 0 || allFinished) {
        updateCharts();
    }

    if (!allFinished) {
        animationId = requestAnimationFrame(animate); 
    } else { 
        isRunning = false; 
        draw(); 
    }
}

function updateBallPhysics(ball, currentTime) {
    if (ball.hasHitGround) return; 

    ball.time = currentTime;
    const radius = ball.diameter / 2; const A = Math.PI * radius * radius;
    let velocity, height, acceleration;

    if (ball.atmosphere === 'vacuum') {
        velocity = g * ball.time; height = ball.initialHeight - 0.5 * g * ball.time * ball.time; acceleration = g;
    } else {
        const k = 0.5 * dragCoeffAir * airDensity * A; const effectiveWeight = ball.mass * g;
        const terminalVel = Math.sqrt(effectiveWeight / k); const tau = ball.mass / Math.sqrt(effectiveWeight * k);
        velocity = terminalVel * Math.tanh(ball.time / tau); height = ball.initialHeight - terminalVel * tau * Math.log(Math.cosh(ball.time / tau));
        const dragForce = k * velocity * velocity; acceleration = (effectiveWeight - dragForce) / ball.mass;
    }

    if (height <= 0) {
        ball.historySpeed.push({x: ball.time, y: velocity});
        ball.historyAccel.push({x: ball.time, y: acceleration});
        ball.historyHeight.push({x: ball.time, y: 0});
        ball.historyHeightSpeed.push({x: velocity, y: 0});
        ball.historySpeed.push({x: ball.time, y: 0});
        ball.historyAccel.push({x: ball.time, y: 0});
        ball.historyHeightSpeed.push({x: 0, y: 0});
        ball.height = 0; ball.velocity = 0; ball.acceleration = 0;
        ball.distance = ball.initialHeight; ball.y = groundY; ball.hasHitGround = true;
        ball.lastLogTime = ball.time;
    } else {
        ball.height = height; ball.velocity = velocity; ball.acceleration = acceleration;
        ball.distance = ball.initialHeight - height; ball.y = getYFromHeight(height);
        if ((ball.time - ball.lastLogTime >= 0.05) || ball.lastLogTime < 0) {
            ball.historySpeed.push({x: ball.time, y: ball.velocity});
            ball.historyAccel.push({x: ball.time, y: ball.acceleration});
            ball.historyHeight.push({x: ball.time, y: ball.height});
            ball.historyHeightSpeed.push({x: ball.velocity, y: ball.height});
            ball.lastLogTime = ball.time;
        }
    }
}

/* =========================================
   5. VISUALIZATION (THEME SWITCHING LOGIC)
   ========================================= */

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const leftAtm = document.querySelector('input[name="atm-left"]:checked').value;
    const rightAtm = document.querySelector('input[name="atm-right"]:checked').value;

    drawEnvironmentSection(0, 0, canvas.width/2, canvas.height, leftAtm, 'left');
    drawEnvironmentSection(canvas.width/2, 0, canvas.width/2, canvas.height, rightAtm, 'right');

    if (leftAtm !== rightAtm) {
        ctx.beginPath(); ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([]); 
    }

    drawGrid();
    if (leftBall) drawBall(leftBall, '#ff4757'); 
    if (rightBall) drawBall(rightBall, '#00d2ff'); 
}

function drawEnvironmentSection(x, y, w, h, type, side) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    if (type === 'vacuum') {
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, groundY); spaceGrad.addColorStop(0, '#090a0f'); spaceGrad.addColorStop(1, '#1b2735');
        ctx.fillStyle = spaceGrad; ctx.fillRect(x, 0, w, groundY);
        ctx.fillStyle = '#ffffff';
        stars.forEach(star => { if (star.x >= x && star.x <= x + w) { ctx.globalAlpha = star.opacity; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill(); }});
        ctx.globalAlpha = 1.0;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height); groundGrad.addColorStop(0, '#555'); groundGrad.addColorStop(1, '#222'); 
        ctx.fillStyle = groundGrad; ctx.fillRect(x, groundY, w, h - groundY);
        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + w, groundY); ctx.stroke();
    } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY); skyGrad.addColorStop(0, '#3ac1f7'); skyGrad.addColorStop(1, '#87ceeb');
        ctx.fillStyle = skyGrad; ctx.fillRect(x, 0, w, groundY);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.arc(x + w*0.3, 100, 30, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x + w*0.7, 150, 40, 0, Math.PI*2); ctx.fill();
        const earthGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height); earthGrad.addColorStop(0, '#8b7355'); earthGrad.addColorStop(1, '#5d4037');
        ctx.fillStyle = earthGrad; ctx.fillRect(x, groundY, w, h - groundY);
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + w, groundY); ctx.stroke();
    }
    ctx.restore();
}

function drawGrid() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
    for (let h = 5; h <= maxHeight; h += 5) {
        const y = getYFromHeight(h);
        ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        ctx.shadowColor = "black"; ctx.shadowBlur = 4; ctx.fillText(h + 'm', 50, y + 4); ctx.shadowBlur = 0;
    }
}

function drawBall(ball, color) {
    // --- PEMBARUAN VISUAL BOLA & PUSAT VISUAL ---
    const displayRadius = Math.max(8, Math.min(60, ball.diameter * 120));
    
    // Titik y dikurangi radius agar permukaan Bawah bola pas di garis (tidak tenggelam)
    const visualY = ball.y - displayRadius; 

    // Bayangan (tetap di posisi tanah)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
    ctx.beginPath(); 
    ctx.ellipse(ball.x, groundY + 5, displayRadius * 0.8, displayRadius * 0.3, 0, 0, Math.PI * 2); 
    ctx.fill();

    // Warna bola
    const ballGradient = ctx.createRadialGradient(
        ball.x - displayRadius * 0.3, visualY - displayRadius * 0.3, 0, 
        ball.x, visualY, displayRadius
    );
    ballGradient.addColorStop(0, color); 
    ballGradient.addColorStop(1, '#000'); 
    
    ctx.fillStyle = ballGradient; 
    ctx.beginPath(); 
    ctx.arc(ball.x, visualY, displayRadius, 0, Math.PI * 2); 
    ctx.fill();
    
    // Pantulan cahaya
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; 
    ctx.beginPath(); 
    ctx.arc(ball.x - displayRadius * 0.3, visualY - displayRadius * 0.3, displayRadius * 0.25, 0, Math.PI * 2); 
    ctx.fill();
    
    // Efek motion blur mengikuti titik visualY baru
    if (ball.velocity > 5 && ball.isActive) {
        ctx.globalAlpha = 0.3; 
        ctx.fillStyle = color;
        for (let i = 1; i <= 3; i++) { 
            ctx.beginPath(); 
            ctx.arc(ball.x, visualY - i * (ball.velocity * 0.2), displayRadius, 0, Math.PI * 2); 
            ctx.fill(); 
        }
        ctx.globalAlpha = 1;
    }
}

function updateDisplays() { updateBallStats(leftBall, 'left'); updateBallStats(rightBall, 'right'); }

function updateBallStats(ball, side) {
    if (ball && (ball.isActive || ball.time > 0)) {
        document.getElementById(`current-height-${side}`).textContent = ball.height.toFixed(2);
        document.getElementById(`distance-${side}`).textContent = ball.distance.toFixed(2);
        document.getElementById(`speed-${side}`).textContent = ball.velocity.toFixed(2);
        document.getElementById(`time-${side}`).textContent = ball.time.toFixed(2);
        document.getElementById(`accel-${side}`).textContent = ball.acceleration.toFixed(2);
        const vTerm = ball.vTerminal === Infinity ? '∞' : ball.vTerminal.toFixed(2);
        document.getElementById(`v-terminal-${side}`).textContent = vTerm;
        if (!ball.isActive && ball.vFinal > 0) document.getElementById(`v-final-${side}`).textContent = ball.vFinal.toFixed(2);
    }
}

/* =========================================
   6. CHART.JS CONFIGURATION
   ========================================= */

function initCharts() {
    if (chart1) chart1.destroy(); if (chart2) chart2.destroy();
    const isMobile = window.innerWidth <= 768;
    Chart.defaults.color = '#ccc'; 
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'; 
    Chart.defaults.font.size = isMobile ? 8 : 11; 
    updateChartConfig(1); updateChartConfig(2);
}

function updateChartConfig(chartNum) {
    const graphType = chartNum === 1 ? currentGraph1 : currentGraph2;
    let config = getChartConfig(graphType);
    const chartCanvas = document.getElementById(`chart${chartNum}`);
    if (chartNum === 1) { if (chart1) chart1.destroy(); chart1 = new Chart(chartCanvas, config); } 
    else { if (chart2) chart2.destroy(); chart2 = new Chart(chartCanvas, config); }
}

function getChartConfig(graphType) {
    let xLabel, yLabel, xMax, yMax;
    switch(graphType) {
        case 'speed': xLabel = 'Waktu (s)'; yLabel = 'Kecepatan (m/s)'; xMax = chartBounds.time; yMax = chartBounds.speed; break;
        case 'accel': xLabel = 'Waktu (s)'; yLabel = 'Percepatan (m/s²)'; xMax = chartBounds.time; yMax = chartBounds.accel; break;
        case 'height': xLabel = 'Waktu (s)'; yLabel = 'Ketinggian (m)'; xMax = chartBounds.time; yMax = chartBounds.height; break;
        case 'heightspeed': xLabel = 'Kecepatan (m/s)'; yLabel = 'Ketinggian (m)'; xMax = chartBounds.speed; yMax = chartBounds.height; break;
    }
    const isMobile = window.innerWidth <= 768;
    return {
        type: 'line',
        data: {
            datasets: [
                { label: isMobile ? 'Kanan' : 'Kanan (Biru)', data: [], borderColor: '#00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.1)', borderWidth: isMobile ? 1.5 : 2, pointRadius: 0, tension: 0 },
                { label: isMobile ? 'Kiri' : 'Kiri (Merah)', data: [], borderColor: '#ff4757', backgroundColor: 'rgba(255, 71, 87, 0.1)', borderWidth: isMobile ? 1.5 : 2, pointRadius: 0, tension: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false, 
            scales: {
                x: { type: 'linear', title: { display: true, text: xLabel, color: '#aaa', font: { size: isMobile ? 9 : 12 }, padding: {top: isMobile ? 2 : 4, bottom: 0} }, min: 0, max: xMax, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: isMobile ? 8 : 11 } } },
                y: { title: { display: true, text: yLabel, color: '#aaa', font: { size: isMobile ? 9 : 12 }, padding: {bottom: isMobile ? 2 : 4} }, min: 0, max: yMax, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: isMobile ? 8 : 11 } } }
            },
            plugins: {
                legend: { position: isMobile ? 'right' : 'top', align: 'center', labels: { color: 'white', boxWidth: isMobile ? 10 : 40, boxHeight: isMobile ? 5 : 12, padding: isMobile ? 6 : 10, font: { size: isMobile ? 8 : 12 } } },
                zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }, pan: { enabled: true, mode: 'xy', modifierKey: null, threshold: 5 } }
            }
        }
    };
}

function zoomChart(chartNum, action) {
    const chart = chartNum === 1 ? chart1 : chart2; if (!chart) return;
    if (action === 'in') chart.zoom(1.1); else if (action === 'out') chart.zoom(0.9); else if (action === 'reset') chart.resetZoom();
}

function updateCharts() {
    if (!chart1 || !chart2) return;
    const getData = (ball, type) => {
        if (!ball) return [];
        switch(type) {
            case 'speed': return ball.historySpeed;
            case 'accel': return ball.historyAccel;
            case 'height': return ball.historyHeight;
            case 'heightspeed': return ball.historyHeightSpeed;
            default: return [];
        }
    };
    if (chart1) { chart1.data.datasets[1].data = getData(leftBall, currentGraph1); chart1.data.datasets[0].data = getData(rightBall, currentGraph1); chart1.update('none'); }
    if (chart2) { chart2.data.datasets[1].data = getData(leftBall, currentGraph2); chart2.data.datasets[0].data = getData(rightBall, currentGraph2); chart2.update('none'); }
}

/* =========================================
   7. FULLSCREEN LOGIC
   ========================================= */
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => { alert(`Gagal memasuki mode layar penuh: ${err.message}`); }); } 
    else { if (document.exitFullscreen) { document.exitFullscreen(); } }
});
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) { fullscreenBtn.textContent = '✖'; fullscreenBtn.title = 'Keluar Layar Penuh'; } 
    else { fullscreenBtn.textContent = '⛶'; fullscreenBtn.title = 'Layar Penuh'; }
});

/* =========================================
   8. INTERACTIVE TOUR / DEMO LOGIC
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const STEPS = [
        { target: 'sec-obj-left', title: 'Panel Objek Kiri (Merah)', desc: 'Ini adalah pengaturan untuk <strong>Objek Pertama</strong>. Pilih <strong>Material</strong> secara bebas atau atur massa manual.', pos: 'right' },
        { target: 'input-mass-left', title: '⚖️ Parameter Massa', desc: '<em>Massa</em> menentukan besarnya gaya berat benda. Pilih preset material seperti Besi untuk menghitung otomatis massa berdasarkan ukurannya.', pos: 'right' },
        { target: 'input-diam-left', title: '📏 Parameter Diameter', desc: 'Diameter menentukan ukuran benda. Jika memilih material Besi, saat diameter diperbesar, <strong>massa akan otomatis bertambah berat!</strong>', pos: 'right' },
        { target: 'input-h-left', title: '📐 Ketinggian Awal', desc: 'Geser <em>slider</em> atau ketik angka langsung untuk mengatur ketinggian awal jatuh (0–75 m).', pos: 'right' },
        { target: 'sec-obj-right', title: 'Panel Objek Kanan (Biru)', desc: 'Pengaturan serupa untuk <strong>Objek Kedua</strong>. Coba bandingkan Besi dengan Kayu Jati, lalu lihat siapa yang lebih dulu menyentuh tanah!', pos: 'right' },
        { target: 'sec-atm', title: '🌐 Pilih Kondisi Atmosfer', desc: '<strong>Vacuum</strong> = tidak ada hambatan udara, murni gravitasi. <strong>Udara</strong> = ada hambatan udara. Atur kondisi berbeda untuk tiap objek!', pos: 'right' },
        { target: 'controls-bar', title: '🎮 Tombol Kontrol Simulasi', desc: '<strong>▶ Play</strong> — mulai. <strong>⏸ Pause</strong> — jeda. <strong>↻ Reset</strong> — kembalikan ke awal. <strong>⛶ Fullscreen</strong> — layar penuh.', pos: 'top' },
        { target: 'sec-data-right', title: '📋 Panel Data Real-Time', desc: 'Menampilkan data fisika secara <em>live</em>: jarak tempuh, kecepatan, <strong>kecepatan terminal</strong>, waktu jatuh, dan percepatan.', pos: 'left' },
        { target: 'panel-graphs', title: '📈 Grafik Interaktif', desc: 'Gunakan tombol <strong>+ / −</strong> untuk zoom, dan <strong>⟲</strong> untuk reset tampilan grafik (v-t, a-t, h-t, h-v).', pos: 'left' }
    ];

    let currentStep = 0;
    let demoActive = false;
    const overlay = document.getElementById('demo-overlay'), spotlight = document.getElementById('demo-spotlight'), card = document.getElementById('demo-card');
    const badge = document.getElementById('demo-badge'), titleEl = document.getElementById('demo-title'), descEl = document.getElementById('demo-desc');
    const nextBtn = document.getElementById('demo-next'), skipBtn = document.getElementById('demo-skip'), progressEl = document.getElementById('demo-progress');
    const welcome = document.getElementById('demo-welcome'), btnStart = document.getElementById('btn-start-demo'), btnSkipAll = document.getElementById('btn-skip-all');

    if (!welcome || !btnStart) return;

    function buildDots() { progressEl.innerHTML = ''; STEPS.forEach((_, i) => { const d = document.createElement('div'); d.className = 'demo-dot' + (i < currentStep ? ' done' : i === currentStep ? ' active' : ''); progressEl.appendChild(d); }); }
    function spotlightTo(id) { const el = document.getElementById(id); if(!el) return; const r = el.getBoundingClientRect(), pad=8, vW=window.innerWidth, vH=window.innerHeight; spotlight.style.left=Math.max(0,r.left-pad)+'px'; spotlight.style.top=Math.max(0,Math.min(r.top-pad,vH-40))+'px'; spotlight.style.width=Math.min(r.width+pad*2,vW)+'px'; spotlight.style.height=Math.min(r.height+pad*2,vH)+'px'; }
    function positionCard(tId, pos) { const el = document.getElementById(tId); if(!el) return; const r=el.getBoundingClientRect(), cW=card.offsetWidth||300, cH=card.offsetHeight||200, pad=18, vW=window.innerWidth, vH=window.innerHeight; let l,t; const vis = r.top>=0&&r.top<vH&&r.left>=0&&r.left<vW; if(!vis){l=Math.max(10,(vW-cW)/2);t=Math.max(10,(vH-cH)/2);}else if(pos==='right'){l=Math.min(r.right+pad,vW-cW-10);t=Math.max(10,Math.min(r.top+r.height/2-cH/2,vH-cH-10));}else if(pos==='left'){l=Math.max(10,r.left-cW-pad);t=Math.max(10,Math.min(r.top+r.height/2-cH/2,vH-cH-10));}else if(pos==='top'){l=Math.max(10,Math.min(r.left+r.width/2-cW/2,vW-cW-10));t=Math.max(10,r.top-cH-pad);}else{l=Math.max(10,Math.min(r.left+r.width/2-cW/2,vW-cW-10));t=Math.min(vH-cH-10,r.bottom+pad);} if(l+cW>vW)l=Math.max(10,vW-cW-10); if(t+cH>vH)t=Math.max(10,vH-cH-10); card.style.left=l+'px'; card.style.top=t+'px'; }
    function showStep(idx) { if(idx>=STEPS.length){endDemo();return;} currentStep=idx; const s=STEPS[idx]; badge.textContent=`Langkah ${idx+1} / ${STEPS.length}`; titleEl.textContent=s.title; descEl.innerHTML=s.desc; nextBtn.textContent=idx===STEPS.length-1?'Selesai ✓':'Lanjut →'; buildDots(); const el=document.getElementById(s.target); if(el){ el.scrollIntoView({behavior:'auto',block:'nearest',inline:'nearest'}); requestAnimationFrame(()=>{requestAnimationFrame(()=>{spotlightTo(s.target);positionCard(s.target,s.pos);});}); }else{requestAnimationFrame(()=>{spotlightTo(s.target);positionCard(s.target,s.pos);});} }
    function startDemo() { welcome.classList.add('hidden'); setTimeout(()=>welcome.style.display='none',500); demoActive=true; overlay.classList.remove('hidden'); showStep(0); }
    function endDemo() { demoActive=false; overlay.classList.add('hidden'); const h=document.getElementById('hint-box'); if(h){h.textContent='🚀 Siap! Atur parameter & klik ▶ Play untuk mulai!'; h.style.borderColor='#22d3ee'; h.style.color='#22d3ee'; h.style.background='rgba(34,211,238,0.08)'; setTimeout(()=>{h.textContent='💡 Atur parameter lalu klik Play'; h.style.borderColor=''; h.style.color=''; h.style.background='';},3000); } }
    function skipAll() { welcome.classList.add('hidden'); setTimeout(()=>welcome.style.display='none',500); overlay.classList.add('hidden'); }
    
    btnStart.addEventListener('click', startDemo); btnSkipAll.addEventListener('click', skipAll); nextBtn.addEventListener('click', ()=>showStep(currentStep+1)); skipBtn.addEventListener('click', endDemo);
    let rT; window.addEventListener('resize', ()=>{if(!demoActive)return; clearTimeout(rT); rT=setTimeout(()=>{const s=STEPS[currentStep]; spotlightTo(s.target); positionCard(s.target,s.pos);},100);});
    document.addEventListener('keydown', e=>{if(!demoActive)return; if(e.key==='Escape')endDemo(); if(e.key==='Enter'||e.key==='ArrowRight')showStep(currentStep+1);});
});

// Start Engine
initStars();
initializeBalls();
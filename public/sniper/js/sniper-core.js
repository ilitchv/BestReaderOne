
// ==========================================
// SNIPER CORE v6.9 (System Base)
// ==========================================

// --- GLOBALS ---
window.CONFIG = {
    baseStake: 0.17, strategyType: 'MARTINGALE', strategyParam: 1.7,
    gapTrigger: 5, stopLoss: 12, numbersPlayed: 10,
    payouts: { p1: 55, p2: 15, p3: 10 }
};
const GLOBAL_ADMIN_ID = "sniper_global_master_v1";

// --- ENV CHECK ---
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
const API_URL = isLocal ? 'http://localhost:8080/api' : '/api';

const IS_USER_MODE = new URLSearchParams(window.location.search).get('mode') === 'user';

// --- UI HELPERS ---
const el = (id) => document.getElementById(id);
const ui = {};

window.initUI = () => {
    // Cache DOM Elements
    ui.table = el('historyBody'); ui.balance = el('totalBalance');
    ui.reelViewport = el('reelViewport'); ui.reelSpinner = el('reelSpinner'); ui.sonar = el('sonarEffect');
    ui.activeCount = el('activeCount'); ui.btn = el('btnGenerate');
    ui.btnDl = el('btnDownload'); ui.btnDel = el('btnDelete'); ui.btnEdit = el('btnEdit');
    ui.statusText = el('actionText'); ui.statusSub = el('actionSubtext'); ui.statusCard = el('actionCard');
    ui.lotterySel = el('lotterySelect'); ui.filters = el('filterContainer');

    // Stats
    ui.sGap = el('statAvgGap'); ui.sMax = el('statMaxGap'); ui.sCyc = el('statTotalCycles'); ui.sStep = el('statAvgSteps');
    ui.sWin = el('statWins'); ui.sLoss = el('statLosses'); ui.sRate = el('statWinRate');
    ui.sH1 = el('statHitsP1'); ui.sH2 = el('statHitsP2'); ui.sH3 = el('statHitsP3'); ui.sFreq = el('statFreqP1');
    ui.sPnL = el('statPnL'); ui.sGross = el('statGrossWin'); ui.sMDD = el('statMDD'); ui.sInv = el('statInvTotal'); ui.sROI = el('statROI');

    // Settings
    ui.iStake = el('confStake'); ui.iStrat = el('confStrategy'); ui.iParam = el('confParam'); ui.iGap = el('confGap'); ui.iSL = el('confSL');
    ui.lParam = el('paramLabel'); ui.cParam = el('paramContainer'); ui.confSum = el('configSummary');

    // Ticket
    ui.mStep = el('tStep'); ui.mTotal = el('tTotal'); ui.mTrack = el('tTrackName');
    ui.selectAll = el('selectAll');

    // Converter / Manual (Ref in Engine usually, but keeping global ref is fine)
    ui.convLottery = el('convLottery'); ui.convType = el('convType'); ui.convInput = el('convInput');
    ui.statP3M = el('statP3M'); ui.statP3E = el('statP3E'); ui.statW4M = el('statW4M'); ui.statW4E = el('statW4E');
    ui.statP3Mo = el('statP3Mo'); ui.statP3N = el('statP3N'); ui.statW4Mo = el('statW4Mo'); ui.statW4N = el('statW4N');
    ui.excelInput = el('excelInput'); ui.excelLottery = el('excelLottery');
    ui.manLottery = el('manLottery'); ui.manDate = el('manDate'); ui.manTime = el('manTime');
    ui.manP3 = el('manP3'); ui.manW4 = el('manW4');
    ui.manualModalTitle = el('manualModalTitle'); ui.btnManualSave = el('btnManualSave');
    ui.previewModal = el('previewModal'); ui.previewContent = el('previewContent'); ui.previewTitle = el('previewTitle');

    // Init Logic
    if (IS_USER_MODE) {
        document.body.classList.add('user-mode');
        loadUserSettings();
    }
};

function loadUserSettings() {
    const saved = localStorage.getItem('sniper_user_config');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(window.CONFIG, parsed);
            updateConfigUI();
        } catch (e) { console.error("Error loading user settings", e); }
    }
}

function updateConfigUI() {
    if (ui.confSum) ui.confSum.textContent = `CONF: GAP ${CONFIG.gapTrigger} | SL ${CONFIG.stopLoss} | ${CONFIG.strategyType}`;
}

// --- MATH & STRATEGY UTILS ---
window.FIBONACCI_SEQ = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

window.getNextStake = (step, bankroll) => {
    if (step <= 0) return 0;
    if (CONFIG.strategyType === 'MARTINGALE') return step === 1 ? CONFIG.baseStake : CONFIG.baseStake * Math.pow(CONFIG.strategyParam, step - 1);
    if (CONFIG.strategyType === 'FIBONACCI') return CONFIG.baseStake * window.FIBONACCI_SEQ[Math.min(step - 1, window.FIBONACCI_SEQ.length - 1)];
    return CONFIG.baseStake;
};

// --- EVENTS ---
window.dispatchTicketEvent = (track, step, totalAmount) => {
    const numbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
    const eventData = {
        event: 'sniperTrigger',
        timestamp: new Date().toISOString(),
        data: {
            track: track,
            step: step,
            total_amount: parseFloat(totalAmount),
            numbers: numbers,
            stake_per_number: parseFloat(totalAmount) / 100
        }
    };
    window.dispatchEvent(new CustomEvent('sniperTrigger', { detail: eventData }));
    window.parent.postMessage(eventData, '*');
    console.log("Creating Ticket Event:", eventData);
};

// --- MODAL MANAGEMENT ---
window.openSettings = () => { ui.iStake.value = CONFIG.baseStake; ui.iGap.value = CONFIG.gapTrigger; ui.iSL.value = CONFIG.stopLoss; el('settingsModal').classList.remove('hidden'); };
window.closeSettings = () => el('settingsModal').classList.add('hidden');
window.saveSettings = () => {
    CONFIG.baseStake = parseFloat(ui.iStake.value); CONFIG.gapTrigger = parseInt(ui.iGap.value);
    CONFIG.stopLoss = parseInt(ui.iSL.value); CONFIG.strategyType = ui.iStrat.value;
    CONFIG.strategyParam = parseFloat(ui.iParam.value);

    if (IS_USER_MODE) {
        localStorage.setItem('sniper_user_config', JSON.stringify(CONFIG));
    }
    updateConfigUI();
    closeSettings();
    if (window.runSimulation) window.runSimulation();
};

window.toggleStrategyParams = () => { const val = ui.iStrat.value; if (val === 'MARTINGALE') { ui.cParam.style.display = 'block'; ui.lParam.textContent = 'Multiplicador'; ui.iParam.value = 1.7; } else { ui.cParam.style.display = 'none'; } };

window.openTicketModal = () => el('ticketModal').classList.remove('hidden');
window.closeTicketModal = () => el('ticketModal').classList.add('hidden');

window.showConfirm = (msg, action) => { el('confirmMessage').innerText = msg; window.pendingAction = action; el('confirmModal').classList.remove('hidden'); };
window.closeConfirm = (c) => { el('confirmModal').classList.add('hidden'); if (c && window.pendingAction) window.pendingAction(); window.pendingAction = null; };

window.toggleAccordion = () => {
    const c = el('accContent'); const icon = el('accIcon');
    if (c.classList.contains('open')) { c.style.maxHeight = null; c.classList.remove('open'); icon.innerText = '▼'; }
    else { c.classList.add('open'); c.style.maxHeight = c.scrollHeight + 'px'; icon.innerText = '▲'; }
};

// --- CLOUD SYNC & DATA ---
window.syncToCloud = async (rows, isManual = false) => {
    try {
        const userId = GLOBAL_ADMIN_ID;
        const payload = {
            userId: userId,
            rows: rows.map(r => ({
                lottery: r.lottery, date: r.date, time: r.time, track: r.track, p3: r.p3, w4: r.w4
            }))
        };
        const res = await fetch(`${API_URL}/data/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log('☁️ Cloud Sync:', json);
        if (isManual) alert(`✅ ÉXITO: ${json.message || 'Sincronización completada'}`);
    } catch (e) {
        console.warn('⚠️ Cloud Sync failed (Offline?):', e);
        if (isManual) alert(`❌ ERROR: No se pudo conectar con el servidor.\n${e.message}`);
    }
};

window.manualCloudSync = () => {
    if (confirm('¿Subir toda la data actual a la Base de Datos (Cloud)?\nEsto sobrescribirá o actualizará los registros en tu cuenta.')) {
        window.syncToCloud(window.globalRawRows || [], true);
    }
};

window.loadFromCloud = async () => {
    try {
        const userId = GLOBAL_ADMIN_ID;
        const res = await fetch(`${API_URL}/data?userId=${userId}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const rows = await res.json();
        console.log('☁️ Loaded from Cloud:', rows.length);
        return rows;
    } catch (e) {
        console.warn('⚠️ Could not load from cloud:', e);
        return null;
    }
};

// --- DATA UTILS ---
window.loadLocalData = () => {
    try {
        const saved = localStorage.getItem('sniper_data_v5');
        if (saved) {
            window.globalRawRows = JSON.parse(saved);
            console.log(`📂 Loaded ${window.globalRawRows.length} rows from LocalStorage.`);
            // Run simulation if engine is ready
            if (window.runSimulation) window.runSimulation();
        } else {
            console.log("📂 No Local Data Found.");
        }
    } catch (e) {
        console.error("Error loading local data:", e);
    }
};

window.saveLocalData = () => {
    try {
        if (window.globalRawRows) {
            localStorage.setItem('sniper_data_v5', JSON.stringify(window.globalRawRows));
            window.syncToCloud(window.globalRawRows).catch(e => console.warn(e));
        }
    } catch (e) { console.warn("Local Storage Full/Error:", e); }
};

window.resetAllData = () => {
    if (!confirm("⚠️ ¿Estás seguro? Se borrarán TODOS los datos locales y la simulación.")) return;
    window.globalRawRows = [];
    localStorage.removeItem('sniper_data_v5');
    if (window.runSimulation) window.runSimulation();
    alert("Datos restablecidos.");
};

window.downloadCSV = () => {
    if (!window.globalRawRows || window.globalRawRows.length === 0) return alert("Sin datos para exportar");
    let csv = "Date,Time,P3,W4,Track,Lottery\n";
    window.globalRawRows.forEach(r => {
        csv += `${r.date},${r.time},${r.p3},${r.w4},${r.track},${r.lottery}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SniperData_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
};

// --- CONVERTER & MANUAL MODALS (Generic Controls) ---
window.openConverter = () => el('converterModal').classList.remove('hidden');
window.closeConverter = () => el('converterModal').classList.add('hidden');


// --- ADMIN MANAGER ---
window.openAdminDataModal = () => {
    el('adminDataModal').classList.remove('hidden');
    const today = new Date();
    el('admEnd').value = today.toISOString().split('T')[0];
    const past = new Date(); past.setMonth(today.getMonth() - 1);
    el('admStart').value = past.toISOString().split('T')[0];
    window.admSearch();
};
window.closeAdminDataModal = () => el('adminDataModal').classList.add('hidden');

let admCachedRows = [];

window.admSearch = async () => {
    const start = el('admStart').value;
    const end = el('admEnd').value;
    const lot = el('admLottery').value;
    const userId = GLOBAL_ADMIN_ID;
    const toggle = document.getElementById('admSourceToggle');
    const isOfficial = toggle ? toggle.checked : false;

    el('admStatus').textContent = isOfficial ? "Buscando Resultados Oficiales..." : "Buscando Tracks Sniper...";
    el('admTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-cyan-500 animate-pulse">Consultando MongoDB...</td></tr>';

    try {
        let url;
        if (isOfficial) {
            const searchParams = new URLSearchParams({ limit: '500', startDate: start, endDate: end });
            url = `${API_URL}/results?${searchParams.toString()}`;
        } else {
            const params = new URLSearchParams({ userId, startDate: start, endDate: end, lottery: lot || 'ALL' });
            url = `${API_URL}/data/search?${params}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        let data = await res.json();

        if (isOfficial && lot && lot !== 'ALL') { data = data.filter(r => r.lotteryName.toLowerCase().includes(lot.toLowerCase())); }

        admCachedRows = data;
        window.renderAdmTable(data, isOfficial);
        el('admStatus').textContent = `${data.length} registros encontrados.`;
    } catch (e) {
        el('admStatus').textContent = "Error: " + e.message;
        el('admTableBody').innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error: ${e.message}</td></tr>`;
    }
};

window.renderAdmTable = (rows, isOfficial) => {
    const tbody = el('admTableBody'); tbody.innerHTML = '';
    if (rows.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-600">No se encontraron resultados.</td></tr>'; return; }
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800 hover:bg-slate-800/50";
        if (isOfficial) {
            tr.innerHTML = `<td class="p-2 text-slate-400 font-mono text-[10px]">${new Date(r.drawDate).toLocaleDateString()}</td><td class="p-2 text-cyan-300 font-bold text-xs">${r.lotteryName}</td><td class="p-2 font-mono text-xs"><span class="text-white font-bold">${r.first || '--'}</span> | <span class="text-purple-400">${r.pick3 || '--'}</span> | <span class="text-orange-400">${r.pick4 || '--'}</span></td><td class="p-2 text-right gap-1 flex justify-end"><button class="text-slate-500 cursor-not-allowed text-[10px] border border-slate-700 px-1 rounded">LOCKED</button></td>`;
        } else {
            tr.innerHTML = `<td class="p-2 text-slate-400">${new Date(r.date).toLocaleDateString()} ${r.time}</td><td class="p-2 text-cyan-300 font-bold">${r.lottery}</td><td class="p-2"><span class="text-amber-400">${r.p3}</span> / <span class="text-purple-400">${r.w4}</span></td><td class="p-2 text-right gap-1 flex justify-end"><button onclick="admEdit('${r._id || r.id}')" class="text-cyan-500 hover:text-cyan-400 text-[10px] border border-cyan-900 px-1 rounded mr-1">EDIT</button><button onclick="admDelete('${r._id || r.id}')" class="text-red-500 hover:text-red-400 text-[10px] border border-red-900 px-1 rounded">DEL</button></td>`;
        }
        tbody.appendChild(tr);
    });
};

window.admDelete = async (id) => {
    if (!confirm("¿Eliminar este registro permanentemente de la Base de Datos?")) return;
    try {
        await fetch(`${API_URL}/data/${id}`, { method: 'DELETE' });
        admCachedRows = admCachedRows.filter(r => (r._id !== id && r.id !== id));
        window.renderAdmTable(admCachedRows);
    } catch (e) { alert("Error eliminando: " + e.message); }
};

window.admEdit = async (id) => {
    const row = admCachedRows.find(r => (r._id === id || r.id === id));
    if (!row) return;
    el('admEditId').value = id; el('admEditLottery').value = row.lottery;
    el('admEditDate').value = new Date(row.date).toISOString().split('T')[0];
    el('admEditTime').value = row.time; el('admEditP3').value = row.p3; el('admEditW4').value = row.w4;
    el('adminEditModal').classList.remove('hidden');
};
window.closeAdminEditModal = () => el('adminEditModal').classList.add('hidden');

window.saveAdminEdit = async () => {
    const id = el('admEditId').value;
    const body = { lottery: el('admEditLottery').value, date: el('admEditDate').value, time: el('admEditTime').value, p3: el('admEditP3').value, w4: el('admEditW4').value };
    if (!body.date || !body.p3 || !body.w4) return alert("Completa todos los campos");

    try {
        const res = await fetch(`${API_URL}/data/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            alert("✅ Registro actualizado.");
            const row = admCachedRows.find(r => (r._id === id || r.id === id));
            if (row) Object.assign(row, body);
            window.renderAdmTable(admCachedRows); window.closeAdminEditModal();
        } else { alert("❌ Error al actualizar"); }
    } catch (e) { alert("❌ Error de conexión"); }
};

// --- REEL 3D INTERACTION ---
let currentAngle = 0, cellAngle = 0, radius = 110, isDragging = false, startY = 0, startAngle = 0, currentVelocity = 0, animationFrameId;
// Logic will be bound in initUI

window.initReelEvents = () => {
    const vp = ui.reelViewport;
    if (!vp) return;
    vp.addEventListener('mousedown', startDrag); vp.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', moveDrag); window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('mouseup', endDrag); window.addEventListener('touchend', endDrag);
};

function startDrag(e) { if (!window.activeOpportunities || window.activeOpportunities.length < 2) return; isDragging = true; cancelAnimationFrame(animationFrameId); startY = e.touches ? e.touches[0].clientY : e.clientY; startAngle = currentAngle; currentVelocity = 0; ui.reelSpinner.style.transition = 'none'; }
function moveDrag(e) { if (!isDragging) return; e.preventDefault(); const y = e.touches ? e.touches[0].clientY : e.clientY; currentAngle = startAngle + ((y - startY) * 0.8); updateSpinnerTransform(); currentVelocity = (y - startY) * 0.1; }
function endDrag(e) { if (!isDragging) return; isDragging = false; applyInertia(); }
function applyInertia() { currentVelocity *= 0.95; currentAngle += currentVelocity; updateSpinnerTransform(); if (Math.abs(currentVelocity) > 0.1) animationFrameId = requestAnimationFrame(applyInertia); else snapToGrid(); }
function snapToGrid() {
    const index = Math.round(currentAngle / cellAngle);
    const targetAngle = index * cellAngle;
    ui.reelSpinner.style.transition = 'transform 0.4s cubic-bezier(0.17, 0.67, 0.14, 1.2)';
    currentAngle = targetAngle;
    updateSpinnerTransform();
    let normIndex = (-index) % window.activeOpportunities.length;
    if (normIndex < 0) normIndex += window.activeOpportunities.length;
    window.currentReelIndex = normIndex;
    window.updateActiveFaceStyle();
    window.updateActionCard(window.activeOpportunities[window.currentReelIndex]);
}
window.updateSpinnerTransform = () => { ui.reelSpinner.style.transform = `rotateX(${currentAngle}deg)`; };
window.triggerSpin = (d) => { if (!window.activeOpportunities || !window.activeOpportunities.length) return; const tIdx = Math.round(currentAngle / cellAngle) + (d * -1); ui.reelSpinner.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'; currentAngle = tIdx * cellAngle; window.updateSpinnerTransform(); setTimeout(() => { let nIdx = (-tIdx) % window.activeOpportunities.length; if (nIdx < 0) nIdx += window.activeOpportunities.length; window.currentReelIndex = nIdx; window.updateActiveFaceStyle(); window.updateActionCard(window.activeOpportunities[window.currentReelIndex]); }, 300); };
window.updateActiveFaceStyle = () => { document.querySelectorAll('.reel-face').forEach(f => f.classList.remove('active-face')); if (document.querySelectorAll('.reel-face')[window.currentReelIndex]) document.querySelectorAll('.reel-face')[window.currentReelIndex].classList.add('active-face'); };

window.currentReelIndex = 0; // Export

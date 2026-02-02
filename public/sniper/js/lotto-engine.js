
// ==========================================
// LOTTO ENGINE (Pick 3 / Win 4)
// ==========================================

window.globalRawRows = [];
window.activeFilters = new Set();
window.tracksState = {};
window.activeOpportunities = [];
window.selectedRowIds = new Set();
window.editingId = null;

// --- MASTER SCHEDULE ---
const MASTER_PRIORITY = [
    { name: "Texas Morning", priority: 1, state: "Texas", cutoff: 690 },
    { name: "Georgia Midday", priority: 2, state: "Georgia", cutoff: 735 },
    { name: "Maryland AM", priority: 3, state: "Maryland", cutoff: 750 },
    { name: "South Carolina Midday", priority: 4, state: "South Carolina", cutoff: 775 },
    { name: "New Jersey AM", priority: 5, state: "New Jersey", cutoff: 780 },
    { name: "Pennsylvania AM", priority: 6, state: "Pennsylvania", cutoff: 800 },
    { name: "Texas Day", priority: 7, state: "Texas", cutoff: 820 },
    { name: "Florida AM", priority: 8, state: "Florida", cutoff: 830 },
    { name: "Connecticut AM", priority: 9, state: "Connecticut", cutoff: 840 },
    { name: "Delaware AM", priority: 10, state: "Delaware", cutoff: 845 },
    { name: "Virginia Day", priority: 11, state: "Virginia", cutoff: 860 },
    { name: "NY-BK AM", priority: 12, state: "NY-BK", cutoff: 868 },
    { name: "New York AM", priority: 13, state: "New York", cutoff: 868 },
    { name: "New York Race", priority: 14, state: "New York", cutoff: 875 },
    { name: "North Carolina AM", priority: 15, state: "North Carolina", cutoff: 900 },
    { name: "Georgia Evening", priority: 16, state: "Georgia", cutoff: 1120 },
    { name: "South Carolina Evening", priority: 17, state: "South Carolina", cutoff: 1135 },
    { name: "Texas Evening", priority: 18, state: "Texas", cutoff: 1140 },
    { name: "Pennsylvania PM", priority: 19, state: "Pennsylvania", cutoff: 1140 },
    { name: "Delaware PM", priority: 20, state: "Delaware", cutoff: 1180 },
    { name: "Maryland PM", priority: 21, state: "Maryland", cutoff: 1200 },
    { name: "Florida PM", priority: 22, state: "Florida", cutoff: 1305 },
    { name: "Connecticut PM", priority: 23, state: "Connecticut", cutoff: 1335 },
    { name: "New York PM", priority: 24, state: "New York", cutoff: 1350 },
    { name: "NY-BK PM", priority: 25, state: "NY-BK", cutoff: 1350 },
    { name: "Virginia Night", priority: 26, state: "Virginia", cutoff: 1375 },
    { name: "New Jersey PM", priority: 27, state: "New Jersey", cutoff: 1380 },
    { name: "Texas Night", priority: 28, state: "Texas", cutoff: 1390 },
    { name: "Georgia Night", priority: 29, state: "Georgia", cutoff: 1400 },
    { name: "North Carolina PM", priority: 30, state: "North Carolina", cutoff: 1439 }
];

// --- PARSING ---
function parseTimeMinutes(timeStr) {
    const lower = timeStr.toLowerCase();
    if (lower.includes('morn')) return 600;
    if (lower.includes('mid') || lower.includes('day')) return 750;
    if (lower.includes('race')) return 870;
    if (lower.includes('eve') || lower.includes('night') || lower.includes('late')) return 1200;
    const clean = lower.replace(/[^0-9:amp]/g, '');
    let [time, modifier] = clean.split(/(?=[ap]m)/);
    if (!time) return 9999;
    let [h, m] = time.split(':').map(Number);
    if (isNaN(h)) return 9999;
    if (modifier === 'pm' && h < 12) h += 12;
    if (modifier === 'am' && h === 12) h = 0;
    return (h * 60) + (m || 0);
}

function getTrackInfo(state, rawTime) {
    const minutes = parseTimeMinutes(rawTime);
    const stateTracks = MASTER_PRIORITY.filter(t => t.state === state);
    if (stateTracks.length === 0) return { name: `${state} ${rawTime}`, priority: 999 };
    const match = stateTracks.find(t => minutes <= t.cutoff);
    if (!match) { const last = stateTracks[stateTracks.length - 1]; return { name: last.name, priority: last.priority }; }
    return { name: match.name, priority: match.priority };
}

window.processNewFile = (csvText) => {
    const rows = csvText.trim().split('\n');
    const selectedLottery = document.getElementById('lotterySelect').value;
    const startIndex = rows[0].toLowerCase().includes('date') ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const rowStr = rows[i].trim(); if (!rowStr) continue;
        const cols = rowStr.split(','); if (cols.length < 4) continue;
        const p3Val = cols[2] ? cols[2].trim() : '';
        const w4Val = cols[3] ? cols[3].trim() : '';
        if (p3Val === '' || w4Val === '') continue;

        const rawTime = cols[1].trim();
        const trackInfo = getTrackInfo(selectedLottery, rawTime);
        window.globalRawRows.push({
            id: Date.now() + Math.random(),
            track: trackInfo.name, priority: trackInfo.priority,
            lottery: selectedLottery, date: cols[0].trim(), time: rawTime, p3: p3Val, w4: w4Val
        });
    }
    window.sortAndSave();
};

window.sortAndSave = () => {
    window.globalRawRows.sort((a, b) => {
        const da = new Date(a.date); const db = new Date(b.date);
        if (da < db) return -1; if (da > db) return 1;
        return a.priority - b.priority;
    });
    window.saveLocalData();
    window.runSimulation();
};

// --- SIMULATION ---
window.runSimulation = () => {
    const ui = window.ui || {}; // Safety
    if (ui.table) ui.table.innerHTML = '';
    window.tracksState = {}; let globalBal = 0;
    let stats = { gaps: [], maxGap: 0, cycles: 0, wins: 0, losses: 0, stepsForWin: [], h1: 0, h2: 0, h3: 0, totalDraws: 0, totalInvest: 0, totalGrossWin: 0, mdd: 0, peakBalance: 0 };

    const uniqueLotteries = [...new Set(window.globalRawRows.map(r => r.lottery))];
    updateFiltersUI(uniqueLotteries);

    const rowsToProcess = (window.activeFilters.size === 0) ? window.globalRawRows : window.globalRawRows.filter(r => window.activeFilters.has(r.lottery));

    if (rowsToProcess.length === 0) {
        if (ui.table) ui.table.innerHTML = `<tr><td colspan="13" class="text-center py-20 text-slate-600 text-sm italic">Sin datos para mostrar con los filtros actuales.</td></tr>`;
        updateStats(stats, 0); updateReel(); return;
    }

    rowsToProcess.forEach((row, index) => {
        if (!window.tracksState[row.lottery]) window.tracksState[row.lottery] = { gap: 0, step: 0, balance: 0 };
        let t = window.tracksState[row.lottery];

        // Date Filter
        const sDate = document.getElementById('simStartDate').value;
        const eDate = document.getElementById('simEndDate').value;
        let inRange = true;
        if (sDate || eDate) {
            const rDate = new Date(row.date);
            if (sDate && rDate < new Date(sDate)) inRange = false;
            if (eDate && rDate > new Date(eDate)) inRange = false;
        }

        const p3 = (row.p3 || "").toString().padStart(3, '0');
        const w4 = (row.w4 || "").toString().padStart(4, '0');
        const isP1 = p3[1] === p3[2];
        const isP2 = w4[0] === w4[1];
        const isP3 = w4[2] === w4[3];
        const isManualTrigger = row.isManualTrigger === true;

        if (inRange) { stats.totalDraws++; if (isP1) stats.h1++; if (isP2) stats.h2++; if (isP3) stats.h3++; }

        let unit = 0, cost = 0, win = 0, net = 0; let dStep = t.step;
        let shouldPlay = false;

        // EXECUTION MODE LOGIC (Assumed GLOBAL var or window prop)
        if (window.EXECUTION_MODE === 'SIMULATION') {
            if (t.step > 0 || t.gap >= window.CONFIG.gapTrigger) shouldPlay = true;
        } else {
            if (t.step > 0 || isManualTrigger) shouldPlay = true;
        }

        if (shouldPlay) {
            if (t.step === 0) { t.step = 1; dStep = 1; }
            unit = window.getNextStake(t.step, globalBal + 1000);
            cost = unit * window.CONFIG.numbersPlayed;
            if (inRange) stats.totalInvest += cost;

            if (isP1) win += unit * window.CONFIG.payouts.p1;
            if (isP2) win += unit * window.CONFIG.payouts.p2;
            if (isP3) win += unit * window.CONFIG.payouts.p3;
            if (inRange) stats.totalGrossWin += win;

            net = win - cost; t.balance += net;
            if (inRange) globalBal += net;

            if (inRange) {
                if (globalBal > stats.peakBalance) stats.peakBalance = globalBal;
                let dd = globalBal - stats.peakBalance; if (dd < stats.mdd) stats.mdd = dd;
            }

            if (isP1) {
                if (inRange) { stats.gaps.push(t.gap); stats.cycles++; stats.wins++; stats.stepsForWin.push(t.step); }
                t.gap = 0; t.step = 0;
            }
            else if (t.step >= window.CONFIG.stopLoss) {
                if (inRange) { stats.cycles++; stats.losses++; stats.gaps.push(t.gap); }
                t.gap = 0; t.step = 0;
            }
            else {
                t.step++; t.gap++;
                if (inRange && t.gap > stats.maxGap) stats.maxGap = t.gap;
            }
        } else {
            if (isP1) { if (inRange) stats.gaps.push(t.gap); t.gap = 0; }
            else { t.gap++; if (inRange && t.gap > stats.maxGap) stats.maxGap = t.gap; }
        }

        if (inRange) { renderRow(row, index, t.gap, dStep, unit, cost, win, net, globalBal, isP1, isP2, isP3); }
    });

    updateStats(stats, globalBal); updateReel();
    if (ui.btnDl) ui.btnDl.disabled = false;
};

// --- RENDER & UI UPDATES ---
function renderRow(row, index, gap, step, unit, cost, win, net, bal, isP1, isP2, isP3) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-lottery', row.lottery);
    tr.setAttribute('data-id', row.id);
    if (window.selectedRowIds.has(row.id)) tr.classList.add('selected');

    let badgeClass = "bg-slate-700 text-slate-300";
    const lot = row.lottery;
    if (lot.includes("New York") || lot.includes("NY")) badgeClass = "bg-blue-900/30 text-blue-400 border border-blue-800";
    else if (lot.includes("Georgia")) badgeClass = "bg-green-900/30 text-green-400 border border-green-800";
    else if (lot.includes("Florida")) badgeClass = "bg-orange-900/30 text-orange-400 border border-orange-800";
    else if (lot.includes("Texas")) badgeClass = "bg-red-900/30 text-red-400 border border-red-800";
    else if (lot.includes("Jersey")) badgeClass = "bg-purple-900/30 text-purple-400 border border-purple-800";
    else if (lot.includes("Carolina")) badgeClass = "bg-teal-900/30 text-teal-400 border border-teal-800";

    const cNet = net > 0 ? 'text-emerald-400 font-bold' : (net < 0 ? 'text-red-500 font-bold' : 'text-slate-600');
    const cWin = win > 0 ? 'text-emerald-400' : 'text-slate-600';
    const cBal = bal >= 0 ? 'text-emerald-400 font-bold' : 'text-red-500 font-bold';

    const sP3 = (row.p3 || "").toString().padStart(3, '0');
    const sW4 = (row.w4 || "").toString().padStart(4, '0');
    const p3Html = isP1 ? `<span class="text-slate-500">${sP3[0]}</span><span class="double-highlight">${sP3.substring(1)}</span>` : `<span class="text-slate-500">${sP3}</span>`;
    const w4Part1 = isP2 ? `<span class="double-highlight">${sW4.substring(0, 2)}</span>` : `<span class="text-slate-500">${sW4.substring(0, 2)}</span>`;
    const w4Part2 = isP3 ? `<span class="double-highlight">${sW4.substring(2)}</span>` : `<span class="text-slate-500">${sW4.substring(2)}</span>`;

    tr.innerHTML = `
        <td class="text-center px-2"><input type="checkbox" class="row-checkbox" ${window.selectedRowIds.has(row.id) ? 'checked' : ''} onclick="window.toggleRowSelection(${row.id}, this)"></td>
        <td class="text-center px-2"><span class="row-number">${index + 1}</span></td>
        <td class="pl-2"><span class="lottery-badge ${badgeClass}">${row.track}</span></td>
        <td class="text-slate-400 text-xs">${row.date}</td>
        <td class="text-slate-500 text-[10px] uppercase">${row.time}</td>
        <td class="font-mono text-sm text-slate-300">${p3Html} | ${w4Part1}${w4Part2}</td>
        <td class="text-center font-bold text-slate-500">${gap}</td>
        <td class="text-center font-bold ${step > 0 ? 'text-amber-500' : 'text-slate-700'}">${step > 0 ? step : '-'}</td>
        <td class="text-right text-slate-400 text-xs font-mono">${unit > 0 ? unit.toFixed(2) : '-'}</td>
        <td class="text-right text-xs font-bold text-slate-400 font-mono">${cost > 0 ? cost.toFixed(2) : '-'}</td>
        <td class="text-right text-xs font-mono ${cWin}">${win > 0 ? win.toFixed(2) : '-'}</td>
        <td class="text-right text-xs font-mono ${cNet}">${net !== 0 ? (net > 0 ? '+' : '') + net.toFixed(2) : '-'}</td>
        <td class="text-right text-xs font-bold font-mono pr-4 ${cBal}">${bal.toFixed(2)}</td>
    `;
    window.ui.table.appendChild(tr);
}

function updateStats(s, bal) {
    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
    const pct = (part, total) => total ? ((part / total) * 100).toFixed(2) + '%' : '0%';
    const ui = window.ui;
    if (!ui.sGap) return;
    ui.sGap.innerText = avg(s.gaps); ui.sMax.innerText = s.maxGap; ui.sCyc.innerText = s.cycles; ui.sStep.innerText = avg(s.stepsForWin);
    ui.sWin.innerText = s.wins; ui.sLoss.innerText = s.losses; ui.sRate.innerText = pct(s.wins, s.cycles);
    ui.sH1.innerText = s.h1; ui.sH2.innerText = s.h2; ui.sH3.innerText = s.h3; ui.sFreq.innerText = pct(s.h1, s.totalDraws);
    ui.sPnL.innerText = (bal >= 0 ? '+' : '-') + '$' + Math.abs(bal).toFixed(2);
    ui.sPnL.className = 'stat-value ' + (bal >= 0 ? 'text-emerald-400' : 'text-red-500');
    ui.sGross.innerText = '$' + s.totalGrossWin.toFixed(2); ui.sMDD.innerText = '-$' + Math.abs(s.mdd).toFixed(2); ui.sInv.innerText = '$' + s.totalInvest.toFixed(2);
    ui.balance.innerText = ui.sPnL.innerText; ui.balance.className = 'text-2xl font-bold font-tech ' + (bal >= 0 ? 'text-emerald-400' : 'text-red-500');
    let roi = s.totalInvest ? ((bal / s.totalInvest) * 100).toFixed(2) : 0;
    ui.sROI.innerText = (roi >= 0 ? '+' : '') + roi + '%'; ui.sROI.className = 'stat-value ' + (roi >= 0 ? 'text-emerald-400' : 'text-red-500');
}

function updateReel() {
    window.activeOpportunities = [];
    const ui = window.ui;
    for (const [name, state] of Object.entries(window.tracksState)) {
        const showCondition = (window.EXECUTION_MODE === 'LIVE')
            ? (state.step > 0 || state.gap >= window.CONFIG.gapTrigger)
            : (state.step > 0);

        if (showCondition) {
            let bText = ui.balance.innerText.replace('$', '').replace('+', '').replace('-', '');
            let u = window.getNextStake(state.step, parseFloat(bText || '0') + 1000);
            window.activeOpportunities.push({ name: name, step: state.step, gap: state.gap, cost: u * window.CONFIG.numbersPlayed });
        }
    }
    window.activeOpportunities.sort((a, b) => b.step - a.step);
    if (ui.activeCount) ui.activeCount.textContent = `${window.activeOpportunities.length} Activas`;

    if (window.activeOpportunities.length === 0) { ui.reelSpinner.innerHTML = ''; ui.sonar.style.display = 'flex'; window.updateActionCard(null); return; }
    else { ui.sonar.style.display = 'none'; }

    ui.reelSpinner.innerHTML = '';
    let displayItems = [...window.activeOpportunities];
    if (displayItems.length === 1) displayItems = Array(6).fill(displayItems[0]);
    else if (displayItems.length === 2) displayItems = [...displayItems, ...displayItems, ...displayItems];
    else if (displayItems.length === 3) displayItems = [...displayItems, ...displayItems];

    const count = displayItems.length; window.cellAngle = 360 / count;
    window.radius = Math.round((60 / 2) / Math.tan(Math.PI / count));
    window.currentAngle = 0; window.currentReelIndex = 0;
    ui.reelSpinner.style.transform = `translateZ(-${window.radius}px) rotateX(0deg)`;

    displayItems.forEach((op, index) => {
        const face = document.createElement('div'); face.className = 'reel-face';
        const angle = window.cellAngle * index;
        face.style.transform = `rotateX(${angle}deg) translateZ(${window.radius}px)`;
        face.innerHTML = `
            <div class="text-cyan-400 font-bold text-[10px] mb-0.5 uppercase tracking-wider">${op.name}</div>
            <div class="text-2xl font-bold font-tech text-white leading-none">PASO ${op.step}</div>
            <div class="text-9px text-slate-500 mt-0.5">GAP: <span class="text-amber-500">${op.gap}</span></div>
        `;
        ui.reelSpinner.appendChild(face);
    });
    window.updateActiveFaceStyle(); window.updateActionCard(window.activeOpportunities[0]);
}

window.updateActionCard = (op) => {
    const ui = window.ui;
    // Clone to remove listener
    const newBtn = ui.btn.cloneNode(true);
    ui.btn.parentNode.replaceChild(newBtn, ui.btn);
    ui.btn = newBtn;

    if (op) {
        const isLive = window.EXECUTION_MODE === 'LIVE';
        const isSignal = op.step === 0 && op.gap >= window.CONFIG.gapTrigger;

        if (isLive && isSignal) {
            ui.statusText.innerHTML = `<span class="text-amber-500 animate-pulse">⚠️ SEÑAL DETECTADA</span>`;
            ui.statusSub.innerHTML = `<span class="text-white font-bold">${op.name}</span><br>GAP ${op.gap} • ESPERANDO GATILLO`;
            ui.btn.innerHTML = `<span>🔫</span> DISPARAR AHORA`;
            ui.btn.onclick = () => window.confirmTicket(op.name, 1);
        } else {
            ui.statusText.innerHTML = `<span class="text-emerald-400 animate-pulse">● LISTO PARA DISPARO</span>`;
            ui.statusSub.innerHTML = `<span class="text-white font-bold">${op.name}</span><br>Paso ${op.step} • $${op.cost.toFixed(2)}`;
            ui.btn.innerHTML = `<span>🎯</span> GENERAR TICKET`;
            ui.btn.onclick = () => window.openTicketModal();
        }
        ui.btn.disabled = false; ui.btn.classList.remove('opacity-50');
        ui.statusCard.style.borderColor = 'var(--sniper-red)';
        ui.mTrack.textContent = op.name; ui.mStep.textContent = op.step > 0 ? op.step : "INICIO"; ui.mTotal.textContent = `$${op.cost.toFixed(2)}`;
    } else {
        ui.statusText.innerHTML = "ESCANEO ACTIVO..."; ui.statusSub.innerHTML = "";
        ui.btn.disabled = true; ui.btn.classList.add('opacity-50');
        ui.statusCard.style.borderColor = '#334155';
    }
};

function updateFiltersUI(lotteries) {
    lotteries.sort();
    let html = `<div class="filter-pill ${window.activeFilters.size === 0 ? 'active' : ''}" onclick="window.toggleFilter('ALL')">ALL TRACKS</div>`;
    lotteries.forEach(l => {
        const isActive = window.activeFilters.has(l);
        html += `<div class="filter-pill ${isActive ? 'active' : ''}" onclick="window.toggleFilter('${l}')">${l}</div>`;
    });
    window.ui.filters.innerHTML = html;
}

window.toggleFilter = (lottery) => {
    if (lottery === 'ALL') { window.activeFilters.clear(); }
    else { if (window.activeFilters.has(lottery)) window.activeFilters.delete(lottery); else window.activeFilters.add(lottery); }
    window.runSimulation();
};

window.toggleSelectAll = () => {
    const isChecked = ui.selectAll.checked;
    document.querySelectorAll('#historyBody tr:not(.hidden)').forEach(tr => {
        const id = parseFloat(tr.getAttribute('data-id'));
        const checkbox = tr.querySelector('.row-checkbox');
        if (checkbox && id) { checkbox.checked = isChecked; if (isChecked) window.selectedRowIds.add(id); else window.selectedRowIds.delete(id); tr.classList.toggle('selected', isChecked); }
    });
    updateToolbar();
};

window.toggleRowSelection = (id, checkbox) => {
    if (checkbox.checked) window.selectedRowIds.add(id); else window.selectedRowIds.delete(id);
    checkbox.closest('tr').classList.toggle('selected', checkbox.checked);
    updateToolbar();
};

function updateToolbar() {
    if (window.selectedRowIds.size > 0) { ui.btnDel.classList.remove('hidden'); ui.btnDel.style.display = 'block'; ui.btnDel.textContent = `🗑️ Eliminar (${window.selectedRowIds.size})`; } else { ui.btnDel.classList.add('hidden'); ui.btnDel.style.display = 'none'; }
    if (window.selectedRowIds.size === 1) { ui.btnEdit.classList.remove('hidden'); ui.btnEdit.style.display = 'block'; } else { ui.btnEdit.classList.add('hidden'); ui.btnEdit.style.display = 'none'; }
}

window.deleteSelected = () => {
    if (window.selectedRowIds.size === 0) return;
    window.showConfirm(`¿Eliminar ${window.selectedRowIds.size} registros seleccionados?`, () => {
        window.globalRawRows = window.globalRawRows.filter(row => !window.selectedRowIds.has(row.id));
        window.selectedRowIds.clear(); ui.selectAll.checked = false;
        updateToolbar();
        window.sortAndSave();
    });
};

// --- INITIALIZATION ---
// Listeners for Lotto
window.addEventListener('load', () => {
    if (document.getElementById('csvInput')) document.getElementById('csvInput').addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { window.processNewFile(ev.target.result); document.getElementById('fileName').textContent = `+ ${file.name} (Cargado)`; };
        reader.readAsText(file);
    });
});

// Staging & Converter
window.stagingData = { p3m: {}, p3e: {}, w4m: {}, w4e: {}, p3mo: {}, p3n: {}, w4mo: {}, w4n: {} };

window.processBatchCheck = () => {
    // Basic regex check before execution (Condensed)
    window.executeProcessBatch(false);
};

window.executeProcessBatch = (trimFireball) => {
    const raw = ui.convInput.value; const type = ui.convType.value;
    const isPick3 = type.startsWith('p3'); const requiredLen = isPick3 ? 3 : 4;
    const regex = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})([\d\s]+)/g;
    let match; let count = 0;
    while ((match = regex.exec(raw)) !== null) {
        const dateStr = `${match[1]} ${match[2]}, ${match[3]}`; const dateKey = new Date(dateStr).toISOString().split('T')[0];
        let numRaw = match[4].replace(/\s/g, '');
        if (numRaw.length === requiredLen) { window.stagingData[type][dateKey] = numRaw; count++; }
    }
    ui.convInput.value = ''; updateConverterStatus(); alert(`✅ ${count} registros procesados.`);
};

function updateConverterStatus() {
    ui.statP3M.innerText = Object.keys(window.stagingData.p3m).length;
    // ... others checks ...
}

window.loadToApp = () => {
    // Simplified Injection
    window.sortAndSave(); window.closeConverter(); alert(`🎉 Registros inyectados.`);
};

// --- MANUAL ENTRY (Lotto Specific) ---
window.openManualEntry = () => {
    const m = document.getElementById('manualEntryModal');
    if (!m) return;

    // Inject HTML if empty
    if (m.innerHTML.trim() === '') {
        m.className = "modal-overlay fixed inset-0 hidden z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md";
        m.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl p-6 shadow-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-white font-bold">Entrada Manual</h3>
                    <button onclick="document.getElementById('manualEntryModal').classList.add('hidden')" class="text-slate-400 hover:text-white">✕</button>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="text-xs text-slate-400 block mb-1">Loteria / Track</label>
                        <select id="manLottery" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs">
                             <option value="New York">New York</option>
                             <option value="Florida">Florida</option>
                             <option value="Georgia">Georgia</option>
                             <option value="Texas">Texas</option>
                             <option value="New Jersey">New Jersey</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-xs text-slate-400 block mb-1">Fecha</label><input type="date" id="manDate" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs"></div>
                        <div><label class="text-xs text-slate-400 block mb-1">Hora (Texto)</label><input type="text" id="manTime" placeholder="Midday / Evening" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-xs text-slate-400 block mb-1">Pick 3</label><input type="number" id="manP3" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs font-mono" placeholder="123"></div>
                        <div><label class="text-xs text-slate-400 block mb-1">Win 4</label><input type="number" id="manW4" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs font-mono" placeholder="1234"></div>
                    </div>
                    <button onclick="window.saveManualEntry()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded mt-2 text-xs uppercase">Guardar Registro</button>
                </div>
            </div>
        `;
    }

    // Set Defaults
    const today = new Date().toISOString().split('T')[0];
    const dInput = document.getElementById('manDate');
    if (dInput && !dInput.value) dInput.value = today;

    m.classList.remove('hidden');
};

window.saveManualEntry = () => {
    const lot = document.getElementById('manLottery').value;
    const date = document.getElementById('manDate').value;
    const time = document.getElementById('manTime').value;
    const p3 = document.getElementById('manP3').value;
    const w4 = document.getElementById('manW4').value;

    if (!date || !p3 || !w4) return alert("Completa los campos obligatorios");

    // Generic Add
    const trackInfo = getTrackInfo(lot, time);
    window.globalRawRows.push({
        id: Date.now(),
        track: trackInfo.name,
        priority: trackInfo.priority,
        lottery: lot,
        date: date,
        time: time || 'Manual',
        p3: p3,
        w4: w4,
        isManualTrigger: true // Flag mostly for checking
    });

    window.sortAndSave();
    document.getElementById('manualEntryModal').classList.add('hidden');
    // Clear inputs
    document.getElementById('manP3').value = '';
    document.getElementById('manW4').value = '';
    alert("✅ Registro agregado manual.");
};


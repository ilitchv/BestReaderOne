
// ==========================================
// HORSE SNIPER ENGINE (NY Horses)
// ==========================================

window.HorseEngine = {
    name: "NY Horses",
    data: [],
    processedEvents: [],
    stats: {},

    // Default Params based on Python Script
    // Payout 9.0, Gap 4, Stop 6, Safety 3, BankDiv 750
    config: {
        multiplier: 2.0,
        payout: 9.0,
        maxSteps: 6,
        entryGap: 4,
        safetyResets: 3,
        bankrollDivisor: 750,
        startingBank: 3750
    },

    init: () => {
        console.log("🐴 Horse Engine Loaded");
        // Auto-Load Data if available
        HorseEngine.fetchDefaultData();
    },

    fetchDefaultData: () => {
        fetch('ny_horses_data.csv')
            .then(response => {
                if (!response.ok) throw new Error("No Default Data");
                return response.text();
            })
            .then(text => {
                console.log("🐴 Auto-Loaded Default Data");
                HorseEngine.parseCSV(text);
                // Also update filename UI if it exists
                const label = document.getElementById('fileName');
                if (label) label.textContent = "+ ny_horses_data.csv (Auto)";
            })
            .catch(err => {
                console.log("🐴 No default data found or error:", err);
            });
    },

    parseCSV: (text) => {
        const rows = text.trim().split('\n');
        const newData = [];
        // Expected Header: Date, R1, R2, R3, R4
        // Or similar. Python script handles: Date, R1..R4

        rows.forEach((line, idx) => {
            if (idx === 0 && line.toLowerCase().includes('date')) return; // Skip Header
            const cols = line.split(',').map(s => s.trim());
            if (cols.length < 2) return;

            // Format: Date, R1, R2, R3, R4
            // We need to flatten this into Events for the simulation
            // But we keep the Row structure for display?
            // The Python script flattens it into "Events".
            // Let's store the "Day Row" to show on table, but simulate event-by-event.

            const date = cols[0];
            const races = [];
            for (let i = 1; i <= 4; i++) {
                if (cols[i]) {
                    let val = cols[i].replace('.0', '');
                    if (val && !isNaN(val)) races.push(val);
                }
            }

            if (races.length > 0) {
                newData.push({
                    id: Date.now() + Math.random(),
                    date: date,
                    races: races // [R1, R2, R3, R4]
                });
            }
        });

        // Sort
        newData.sort((a, b) => new Date(a.date) - new Date(b.date));
        HorseEngine.data = newData;
        HorseEngine.run();
    },

    run: () => {
        const ui = window.ui;
        // 1. Setup Table Headers for Horses
        HorseEngine.renderHeader();

        // 2. Process Simulation
        let bankroll = HorseEngine.config.startingBank;
        let peak = bankroll;
        let gap = 0;
        let inSession = false;
        let step = 0;
        let sessionStake = 5.0;
        let coolingDown = false;
        let resetsSeen = 0;
        let stats = { wins: 0, losses: 0, stops: 0, totalInvest: 0, maxGap: 0, trades: [] };

        const uiRows = [];

        HorseEngine.data.forEach(day => {
            const dayWinners = [];
            const dayRes = { date: day.date, r1: null, results: [], profit: 0, notes: [] };

            // R1 Processing (Non-Opp)
            if (day.races.length > 0) {
                const r1 = day.races[0];
                dayWinners.push(r1);
                dayRes.r1 = r1;

                // Gap Update (R1 counts for Gap?)
                // Python: if is_gap_event: gap += 1. R1 is Gap Event.
                // R1 is never repeat (previous empty).
                if (!coolingDown && !inSession) {
                    gap++;
                }
            }

            // R2...R4 Processing (Opps)
            for (let i = 1; i < day.races.length; i++) {
                const winner = day.races[i];
                const prevs = [...dayWinners]; // Copy
                dayWinners.push(winner);

                const isRepeat = prevs.includes(winner);
                let raceLog = { race: i + 1, winner: winner, bet: 0, win: 0, net: 0, isHit: isRepeat, stepVal: 0 };

                // LOGIC
                if (coolingDown) {
                    raceLog.note = `COOL (${resetsSeen}/3)`;
                    if (isRepeat) {
                        resetsSeen++;
                        gap = 0;
                        raceLog.note += " RESET";
                        if (resetsSeen >= HorseEngine.config.safetyResets) {
                            coolingDown = false;
                            resetsSeen = 0;
                            raceLog.note += " -> ACTIVE";
                        }
                    } else {
                        gap++;
                    }
                } else {
                    // Active Logic
                    const shouldBet = inSession || (gap >= HorseEngine.config.entryGap);

                    if (shouldBet) {
                        if (!inSession) {
                            inSession = true;
                            step = 1;
                            // Calc Stake
                            let s = bankroll / HorseEngine.config.bankrollDivisor;
                            if (s < 2.0) s = 2.0;
                            sessionStake = parseFloat(s.toFixed(2));
                        }

                        const targets = prevs.length;
                        const cost = sessionStake * targets;
                        stats.totalInvest += cost;
                        bankroll -= cost;
                        raceLog.bet = cost;
                        raceLog.stepVal = step;

                        if (isRepeat) {
                            // WIN
                            const revenue = sessionStake * HorseEngine.config.payout;
                            bankroll += revenue;
                            raceLog.win = revenue;
                            raceLog.net = revenue - cost;
                            stats.wins++;

                            inSession = false;
                            step = 0;
                            gap = 0;
                            raceLog.note = "WIN";
                        } else {
                            // LOSS
                            raceLog.net = -cost;
                            stats.losses++;

                            if (step >= HorseEngine.config.maxSteps) {
                                // STOP LOSS
                                stats.stops++;
                                coolingDown = true;
                                resetsSeen = 0;
                                inSession = false;
                                step = 0;
                                raceLog.note = "STOP -> COOL";
                            } else {
                                step++;
                                sessionStake *= HorseEngine.config.multiplier;
                                gap++;
                            }
                        }
                    } else {
                        // Paper Trading / Gap Tracking
                        if (isRepeat) gap = 0; else gap++;
                    }
                }

                if (gap > stats.maxGap) stats.maxGap = gap;
                dayRes.results.push(raceLog);
                dayRes.profit += (raceLog.net || 0);
            }

            uiRows.push({ day: dayRes, bank: bankroll, gapSnapshot: gap });
        });

        // 3. Render Table
        HorseEngine.renderTable(uiRows);
        HorseEngine.updateStats(bankroll, stats);
    },

    renderHeader: () => {
        const thead = document.querySelector('.custom-table thead tr');
        if (!thead) return;
        thead.innerHTML = `
            <th class="w-8 text-center px-2">#</th>
            <th class="w-24 text-left pl-2">Date</th>
            <th class="w-12 text-center text-slate-500">R1</th>
            <th class="text-center">Race 2</th>
            <th class="text-center">Race 3</th>
            <th class="text-center">Race 4</th>
            <th class="w-24 text-right">Daily P&L</th>
            <th class="w-28 text-right pr-4">Balance</th>
        `;
    },

    renderTable: (rows) => {
        const tbody = document.getElementById('historyBody');
        tbody.innerHTML = '';

        rows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            const day = r.day;

            // Cells for R2, R3, R4
            let racesHtml = '';
            day.results.forEach(res => {
                let cellClass = "text-slate-600";
                let content = `<span class="text-xs">${res.winner}</span>`;

                if (res.bet > 0) {
                    if (res.win > 0) {
                        cellClass = "bg-emerald-900/20 text-emerald-400 font-bold border-emerald-900";
                        content += `<div class="text-[10px]">+$${res.net.toFixed(0)}</div>`;
                    } else {
                        cellClass = "bg-red-900/10 text-red-500 border-red-900";
                        content += `<div class="text-[10px]">-$${Math.abs(res.net).toFixed(0)}</div>`;
                    }
                } else if (res.note && res.note.includes('COOL')) {
                    cellClass = "text-blue-500 italic bg-blue-900/10";
                    content += `<div class="text-[9px]">${res.note}</div>`;
                }

                racesHtml += `<td class="text-center p-1 border-l border-slate-800 ${cellClass}">${content}</td>`;
            });

            // Fill empty races if day had fewer than 4 races total
            for (let i = day.results.length; i < 3; i++) {
                racesHtml += `<td class="text-center p-1 border-l border-slate-800 text-slate-700">-</td>`;
            }

            const profitClass = day.profit >= 0 ? (day.profit > 0 ? 'text-emerald-400' : 'text-slate-500') : 'text-red-500';

            tr.innerHTML = `
                <td class="text-center px-2 text-slate-600 text-xs">${idx + 1}</td>
                <td class="text-left pl-2 text-xs font-mono text-slate-300">${day.date}</td>
                <td class="text-center text-xs text-slate-500 font-bold">${day.r1 || '-'}</td>
                ${racesHtml}
                <td class="text-right font-mono text-xs font-bold ${profitClass}">${day.profit.toFixed(2)}</td>
                <td class="text-right font-mono text-xs font-bold text-white pr-4">${r.bank.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateStats: (finalBank, s) => {
        if (window.ui.balance) window.ui.balance.innerText = '$' + finalBank.toFixed(2);
        if (window.ui.sPnL) {
            const profit = finalBank - HorseEngine.config.startingBank;
            window.ui.sPnL.innerText = (profit > 0 ? '+' : '') + '$' + profit.toFixed(2);
            window.ui.sPnL.className = 'stat-value ' + (profit >= 0 ? 'text-emerald-400' : 'text-red-500');
        }
        // Update other pills
        if (window.ui.sWin) window.ui.sWin.innerText = s.wins;
        if (window.ui.sLoss) window.ui.sLoss.innerText = s.losses;
        if (window.ui.sMax) window.ui.sMax.innerText = s.maxGap;
        // Use sMDD field for Stops
        if (window.ui.sMDD) {
            window.ui.sMDD.innerText = `${s.stops} Stops`;
            window.ui.sMDD.previousElementSibling.innerText = "Safety Stops";
        }
    }
};

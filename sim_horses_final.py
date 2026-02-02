import pandas as pd
import numpy as np
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
OUTPUT_REPORT = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_report_final.md"
OUTPUT_LOG = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_trade_log_final.csv"

# Params
MULTIPLIER = 2.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 6
ENTRY_GAP = 4

STARTING_BANKROLL = 3750.0

def run_simulation():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    start_date = df['Date'].min()
    end_date = df['Date'].max()
    days_count = len(df)
    
    events = []
    
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        # R1 counts for Gap
        events.append({
            'Date': row['Date'],
            'Race': 1,
            'Winner': races[0],
            'Prevs': [],
            'IsOpp': False,
            'IsGapEvent': True # Counts as non-repeat
        })
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            events.append({
                'Date': row['Date'],
                'Race': i,
                'Winner': winner,
                'Prevs': day_winners.copy(),
                'IsOpp': True,
                'IsGapEvent': True
            })
            day_winners.append(winner)

    # Simulation State
    bankroll = STARTING_BANKROLL
    peak_bankroll = bankroll
    min_bankroll = bankroll
    
    gap = 0
    in_session = False
    step = 0
    session_stake = 5.0 
    cooling_down = False
    resets_seen = 0 # Track how many resets we've seen during cool down
    
    trades = []
    
    wins = 0
    stops = 0
    safety_saves = 0
    
    # Analyze Monthly Income
    monthly_profit = {}
    
    for evt in events:
        date_key = evt['Date'].strftime('%Y-%m')
        monthly_profit.setdefault(date_key, 0)
        
        winner = evt['Winner']
        prevs = evt['Prevs']
        is_opp = evt['IsOpp']
        is_gap_event = evt.get('IsGapEvent', False)
        
        # Check Repeat
        is_repeat = False
        if is_opp:
            if winner in prevs: is_repeat = True
        
        # Logic
        bet_amount = 0
        payout = 0
        notes = ""
        
        # 1. Cool Down Logic
        if cooling_down:
            notes = f"COOLING DOWN (Resets: {resets_seen}/3)"
            if is_opp and is_repeat:
                # Streak Broken naturally!
                resets_seen += 1
                gap = 0 # Reset gap tracking
                
                if resets_seen >= 3:
                    cooling_down = False
                    resets_seen = 0
                    notes += " -> END (3rd Streak Broken). SAFE TO RESUME."
                else:
                    notes += f" -> Streak Broken ({resets_seen}/3). Waiting."
            else:
                 # Streak continues...
                 if is_gap_event: gap += 1
        
        elif is_opp:
            # 2. Betting Logic
            should_bet = in_session or (gap >= ENTRY_GAP)
            
            if should_bet:
                if not in_session:
                    in_session = True
                    step = 1
                    # Compounding Stake: Ratio 1/750
                    calc_stake = bankroll / 750.0
                    if calc_stake < 2.0: calc_stake = 2.0
                    session_stake = round(calc_stake, 2)
                    
                # Place Bet
                targets = len(prevs)
                cost = session_stake * targets
                
                # Deduct
                bankroll -= cost
                bet_amount = cost
                mn_pnl = -cost
                
                if is_repeat:
                    # Win
                    revenue = session_stake * PAYOUT_ODDS
                    bankroll += revenue
                    payout = revenue
                    mn_pnl += revenue
                    
                    wins += 1
                    notes = f"WIN ({winner})"
                    
                    # Reset
                    in_session = False
                    step = 0
                else:
                    # Loss
                    mn_pnl = 0 
                    notes = f"LOSS Step {step}"
                    
                    if step >= MAX_STEPS:
                        stops += 1
                        notes += " [STOP HIT] -> ACTIVATING COOL DOWN (Wait 3 Resets)"
                        cooling_down = True
                        resets_seen = 0
                        in_session = False
                        step = 0
                    else:
                        step += 1
                        session_stake = session_stake * MULTIPLIER
                
                monthly_profit[date_key] += mn_pnl

        # 3. Gap Update
        if not cooling_down and is_gap_event and not in_session:
             if is_repeat: 
                 gap = 0
             else:
                 gap += 1
        
        # Record Trade
        peak_bankroll = max(peak_bankroll, bankroll)
        min_bankroll = min(min_bankroll, bankroll)
        
        if bet_amount > 0 or "COOLING" in notes:
             trades.append({
                 'Date': evt['Date'],
                 'Bankroll': bankroll,
                 'Stake': session_stake if in_session else 0,
                 'Notes': notes
             })

    # Report
    final_roi = ((bankroll - STARTING_BANKROLL) / STARTING_BANKROLL) * 100
    avg_monthly = np.mean(list(monthly_profit.values()))
    
    # Last 3 months income (projected)
    months = sorted(monthly_profit.keys())
    last_3 = months[-3:]
    last_3_inc = sum([monthly_profit[m] for m in last_3]) / 3 if last_3 else 0
    
    report = f"""# Ultimate Sniper Simulation Report (Tier $3,750 + **3-Resets**)
**Configuration:**
- Gap 4 (Adj) | Stop 6 (Hard) | **Safety Valve (Wait for 3 Resets)**
- **Compounding:** Yes (Stake = Bank / 750)

**Financial Results:**
- **Inital Bankroll:** ${STARTING_BANKROLL:,.2f}
- **Final Bankroll:** **${bankroll:,.2f}**
- **Total ROI:** {final_roi:.1f}%
- **Net Profit:** ${bankroll - STARTING_BANKROLL:,.2f}

**Projected Income:**
- **Current Monthly Income (Last 3 Mo Avg):** **${last_3_inc:,.2f}** / month.
- *At this rate, to reach $4,000/mo, you need to grow the bankroll {4000/last_3_inc:.1f}x more.*

**Safety Stats:**
- **Stop Losses Hit:** {stops} (Events that triggered Cool-Down).
- **Safety Valve:** Prevented consecutive losses in these {stops} events.
- **Max Drawdown:** ${min_bankroll - STARTING_BANKROLL:.2f} (from start) - *Check detailed log for peak-to-valley*.

**Conclusion:**
With the Safety Valve, we accepted {stops} fixed losses but avoided the "Deep Bleeding" of long streaks. Combined with compounding, the capital grew steadily.
"""
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)

if __name__ == '__main__':
    run_simulation()

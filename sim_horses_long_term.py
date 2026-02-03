import pandas as pd
import numpy as np
import os
import copy

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
OUTPUT_REPORT = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_report_long_term.md"

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
    
    # Base Events
    base_events = []
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        base_events.append({
            'Date': row['Date'],
            'Race': 1,
            'Winner': races[0],
            'Prevs': [],
            'IsOpp': False,
            'IsGapEvent': True
        })
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            base_events.append({
                'Date': row['Date'],
                'Race': i,
                'Winner': winner,
                'Prevs': day_winners.copy(),
                'IsOpp': True,
                'IsGapEvent': True
            })
            day_winners.append(winner)

    # Loop Data for 5 Years
    # Current duration: ~530 days.
    # 5 Years = ~1825 days.
    # Need ~3.5 loops. Let's do 4 loops (~5.8 years).
    
    range_delta = df['Date'].max() - df['Date'].min() + pd.Timedelta(days=1)
    long_events = []
    
    for loop in range(4):
        time_shift = range_delta * loop
        for evt in base_events:
            new_evt = evt.copy()
            new_evt['Date'] = evt['Date'] + time_shift
            long_events.append(new_evt)
            
    print(f"Projecting over {len(long_events)} race events (~{4*1.4:.1f} years)...")

    # Simulation State
    bankroll = STARTING_BANKROLL
    
    gap = 0
    in_session = False
    step = 0
    session_stake = 2.0
    cooling_down = False
    
    wins = 0
    stops = 0
    
    # Financials
    year_milestones = {}
    start_year = long_events[0]['Date'].year
    
    for evt in long_events:
        # Tracking Year End
        curr_year = evt['Date'].year
        if curr_year not in year_milestones:
            year_milestones[curr_year] = bankroll
        else:
            # Update to latest
            year_milestones[curr_year] = bankroll

        winner = evt['Winner']
        prevs = evt['Prevs']
        is_opp = evt['IsOpp']
        is_gap_event = evt.get('IsGapEvent', False)
        
        is_repeat = False
        if is_opp:
            if winner in prevs: is_repeat = True
        
        # 1. Cool Down
        if cooling_down:
            if is_opp and is_repeat:
                cooling_down = False
                gap = 0
            else:
                 if is_gap_event: gap += 1
        
        elif is_opp:
            # 2. Betting
            should_bet = in_session or (gap >= ENTRY_GAP)
            
            if should_bet:
                if not in_session:
                    in_session = True
                    step = 1
                    # Aggressive Compounding: S = Bank / 750
                    calc_stake = bankroll / 750.0
                    if calc_stake < 2.0: calc_stake = 2.0
                    session_stake = round(calc_stake, 2)
                    
                cost = session_stake * len(prevs)
                bankroll -= cost
                
                if is_repeat:
                    revenue = session_stake * PAYOUT_ODDS
                    bankroll += revenue
                    wins += 1
                    in_session = False
                    step = 0
                else:
                    if step >= MAX_STEPS:
                        stops += 1
                        cooling_down = True
                        in_session = False
                        step = 0
                    else:
                        step += 1
                        session_stake = session_stake * MULTIPLIER

        # 3. Gap Update
        if not cooling_down and is_gap_event and not in_session:
             if is_repeat: gap = 0
             else: gap += 1

    # Report
    years_passed = (long_events[-1]['Date'] - long_events[0]['Date']).days / 365.25
    roi = ((bankroll - STARTING_BANKROLL) / STARTING_BANKROLL) * 100
    
    report = f"""# 5-Year Strategic Projection (Aggressive)

**Configuration:** Stacked Database (~{years_passed:.1f} Years) | Start: ${STARTING_BANKROLL:,.0f} | Ratio: 1/750

**Milestones by Year:**
"""
    for y in sorted(year_milestones.keys()):
        yr_bal = year_milestones[y]
        report += f"- **Year {y}:** ${yr_bal:,.2f}\n"

    report += f"""
**Final Result (Year 5+):**
- **Final Equity:** **${bankroll:,.2f}**
- **Total Growth:** {bankroll/STARTING_BANKROLL:.1f}x
- **Stops Hit:** {stops} (Safety Valve Events)

*Disclaimer: This projection assumes market patterns repeat exactly in cycles. Real markets vary.*
"""
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)

if __name__ == '__main__':
    run_simulation()

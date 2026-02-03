import pandas as pd
import numpy as np
import math
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
OUTPUT_LOG = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_trade_log_master.csv"
OUTPUT_REPORT = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_report_master.md"

MULTIPLIER = 2.0
BASE_STAKE = 2.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 6
ENTRY_GAP = 4

def run_simulation():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    start_date_data = df['Date'].min()
    end_date_data = df['Date'].max()
    days_count = len(df)
    
    events = []
    
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit():
                 races.append(val)
            elif val and val != 'nan':
                 pass
        
        if not races: continue
        
        # R1 is NOT a betting opportunity (IsOpp=False)
        # BUT it counts for Gap calculation (IsGapEvent=True)
        events.append({
            'Date': row['Date'],
            'RaceIdx': 1,
            'Winner': races[0],
            'PreviousWinners': [],
            'IsOpp': False,
            'IsGapEvent': True # R1 counts as a 'Non-Repeat' in the sequence
        })
        
        day_winners = [races[0]]
        
        for i, winner in enumerate(races[1:], start=2):
            events.append({
                'Date': row['Date'],
                'RaceIdx': i,
                'Winner': winner,
                'PreviousWinners': day_winners.copy(),
                'IsOpp': True, # We can bet
                'IsGapEvent': True # Counts for gap
            })
            day_winners.append(winner)

    current_gap = 0
    in_session = False
    current_step = 0
    session_stake = BASE_STAKE 
    
    trades = []
    equity = 0.0
    max_equity = 0.0
    min_equity = 0.0
    
    entries_count = 0
    winning_cycles = 0
    loss_cycles = 0
    steps_to_win = []
    consecutive_stops = 0
    max_consecutive_stops = 0

    for evt in events:
        date = evt['Date']
        winner = evt['Winner']
        prevs = evt['PreviousWinners']
        is_opp = evt['IsOpp']
        race_idx = evt['RaceIdx']
        is_gap_event = evt.get('IsGapEvent', False)
        
        bet_amount = 0
        payout = 0
        notes = ""
        cycle_result = None
        
        # --- Trading Logic ---
        if is_opp:
            is_repeat = (winner in prevs)
            
            should_bet = False
            if in_session:
                should_bet = True
            else:
                if current_gap >= ENTRY_GAP:
                    should_bet = True
            
            if should_bet:
                if not in_session:
                    in_session = True
                    current_step = 1
                    session_stake = BASE_STAKE
                
                targets = prevs
                num_bets = len(targets)
                if num_bets > 0:
                    cost = num_bets * session_stake
                    bet_amount = cost
                    equity -= cost
                    
                    if is_repeat:
                        # WIN
                        revenue = PAYOUT_ODDS * session_stake
                        payout = revenue
                        equity += revenue
                        notes = f"WIN on {winner} (Stp {current_step})"
                        
                        entries_count += 1
                        winning_cycles += 1
                        steps_to_win.append(current_step)
                        consecutive_stops = 0
                        cycle_result = 'WIN'
                        
                        in_session = False
                        current_step = 0
                        session_stake = BASE_STAKE
                    else:
                        # LOSS step
                        notes = f"LOSS (Stp {current_step})"
                        if current_step >= MAX_STEPS:
                            notes += " [STOP LOSS]"
                            loss_cycles += 1
                            consecutive_stops += 1
                            max_consecutive_stops = max(max_consecutive_stops, consecutive_stops)
                            cycle_result = 'STOP'
                            entries_count += 1
                            
                            in_session = False
                            current_step = 0
                            session_stake = BASE_STAKE
                        else:
                            session_stake = session_stake * MULTIPLIER
                            current_step += 1
        else:
             # Non-Opp event (R1).
             # It cannot be a repeat of daily winners (list empty).
             # So it is effectively a "Non-Repeat".
             is_repeat = False 

        # --- Gap Update Logic ---
        # Runs for ALL events that are part of the sequence (R1 included)
        if is_gap_event:
            if is_repeat:
                current_gap = 0
            else:
                current_gap += 1
        
        max_equity = max(max_equity, equity)
        min_equity = min(min_equity, equity)
        
        if bet_amount > 0 or notes:
            trades.append({
                'Date': date,
                'Race': race_idx,
                'Gap': current_gap, # Post-update gap? No, usually PRE-bet gap matters for decision. 
                                    # But here visual log shows result gap.
                                    # The 'Gap' column usually shows the count of misses leading up to this result?
                                    # Or the state AFTER this result?
                                    # Let's show the gap AFTER this race result.
                'Step': current_step if in_session else 0,
                'Stake': session_stake,
                'Cost': bet_amount,
                'Payout': payout,
                'PnL': payout - bet_amount,
                'Equity': equity,
                'Notes': notes
            })

    # Stats
    trades_df = pd.DataFrame(trades)
    if not trades_df.empty:
        trades_df.to_csv(OUTPUT_LOG, index=False)
        gross_profit = trades_df[trades_df['PnL'] > 0]['PnL'].sum()
        gross_loss = abs(trades_df[trades_df['PnL'] < 0]['PnL'].sum())
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 999.0
        win_rate = (winning_cycles / entries_count * 100) if entries_count > 0 else 0
    else:
        gross_profit=0; gross_loss=0; profit_factor=0; win_rate=0;
    
    report = f"""# Simulation Report - Master Strategy (Adjusted Logic)

**Executive Summary:**
Period: **{start_date_data.strftime('%Y-%m-%d')}** to **{end_date_data.strftime('%Y-%m-%d')}** ({days_count} days).
Logic Update: **Race 1 counts towards Gap**. (Gap = Consecutive races without repeat).

**Parameters:**
- **Stake**: ${BASE_STAKE} (Mult {MULTIPLIER}x)
- **Wait Gap**: {ENTRY_GAP} races.
- **Stop Loss**: {MAX_STEPS} Steps.

**Key Performance Indicators (KPIs):**
- **Net Profit**: **${equity:.2f}**
- **Profit Factor**: {profit_factor:.2f}
- **Win Rate**: {win_rate:.1f}% ({winning_cycles}/{entries_count})
- **Max Drawdown**: ${min_equity:.2f}
- **Peak Equity**: ${max_equity:.2f}

**Risk Metrics:**
- Stop Losses Hit: {loss_cycles}
- Max Consecutive Stops: {max_consecutive_stops}
- Avg Steps to Win: {np.mean(steps_to_win) if steps_to_win else 0:.1f}
"""
    with open(OUTPUT_REPORT, 'w') as f:
        f.write(report)
    
    print("Adjusted Simulation Complete.")
    print(report)

if __name__ == '__main__':
    run_simulation()

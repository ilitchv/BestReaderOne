import pandas as pd
import numpy as np
import math
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
OUTPUT_LOG = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_trade_log_sniper.csv"
OUTPUT_REPORT = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_report_sniper.md"

WINDOW_DAYS = 60
MULTIPLIER = 1.7
BASE_STAKE = 1.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 5
MIN_RACE_BET = 3 # Sniper Rule: Only bet from Race 3 onwards

def calculate_p90(gap_history):
    if not gap_history:
        return 0
    sorted_gaps = sorted(gap_history)
    n = len(sorted_gaps)
    if n == 0: return 0
    rank = math.ceil(0.90 * n)
    return sorted_gaps[rank - 1]

def run_simulation():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
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
        
        events.append({
            'Date': row['Date'],
            'RaceIdx': 1,
            'Winner': races[0],
            'PreviousWinners': [],
            'IsOpp': False
        })
        
        day_winners = [races[0]]
        
        for i, winner in enumerate(races[1:], start=2):
            events.append({
                'Date': row['Date'],
                'RaceIdx': i,
                'Winner': winner,
                'PreviousWinners': day_winners.copy(),
                'IsOpp': True
            })
            day_winners.append(winner)

    current_gap = 0
    completed_gaps = []
    
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
    skipped_wins = 0
    steps_to_win = []
    races_performance = {2: {'wins':0, 'total':0}, 3: {'wins':0, 'total':0}, 4: {'wins':0, 'total':0}}
    consecutive_stops = 0
    max_consecutive_stops = 0
    
    unique_dates = df['Date'].unique()
    start_date = unique_dates[min(len(unique_dates)-1, WINDOW_DAYS)]
    
    for evt in events:
        date = evt['Date']
        winner = evt['Winner']
        prevs = evt['PreviousWinners']
        is_opp = evt['IsOpp']
        race_idx = evt['RaceIdx']
        
        is_repeat = (winner in prevs)
        
        gap_sizes = [g[0] for g in completed_gaps]
        limit_p90 = calculate_p90(gap_sizes) if len(completed_gaps) > 10 else 999 
        
        status = 'WAIT'
        if date >= start_date:
            if current_gap >= limit_p90:
                status = 'READY'
        
        bet_amount = 0
        payout = 0
        notes = ""
        cycle_result = None
        
        can_bet = (race_idx >= MIN_RACE_BET)

        if is_opp:
            if in_session:
                if can_bet:
                    # Continue Session
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
                            if race_idx in races_performance: races_performance[race_idx]['wins'] += 1
                            consecutive_stops = 0
                            cycle_result = 'WIN'
                            
                            in_session = False
                            current_step = 0
                            session_stake = BASE_STAKE
                        else:
                            # LOSS
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
                    
                    if race_idx in races_performance: races_performance[race_idx]['total'] += 1
                else:
                    # Cannot bet (Race < 3), but in session
                    if is_repeat:
                        # Missed Win - Reset Session
                        in_session = False
                        current_step = 0
                        session_stake = BASE_STAKE
                        skipped_wins += 1
                        notes = "Skipped Win (Race < 3) - Session Reset"
                        # We don't count as Win or Loss, just reset
                    else:
                        # No repeat, hold position
                        pass

            else:
                # Not in session
                if can_bet and status == 'READY':
                    # Enter
                    in_session = True
                    current_step = 1
                    session_stake = BASE_STAKE
                    
                    targets = prevs
                    num_bets = len(targets)
                    cost = num_bets * session_stake
                    bet_amount = cost
                    equity -= cost
                    
                    if race_idx in races_performance: races_performance[race_idx]['total'] += 1
                    
                    if is_repeat:
                        revenue = PAYOUT_ODDS * session_stake
                        payout = revenue
                        equity += revenue
                        notes = f"WIN Entry on {winner}"
                        
                        winning_cycles += 1
                        steps_to_win.append(1)
                        if race_idx in races_performance: races_performance[race_idx]['wins'] += 1
                        consecutive_stops = 0
                        cycle_result = 'WIN'
                        entries_count += 1
                        
                        in_session = False
                        current_step = 0
                        session_stake = BASE_STAKE
                    else:
                        notes = f"LOSS Entry"
                        session_stake = session_stake * MULTIPLIER
                        current_step += 1
                else:
                    # Cannot enter or not ready
                    if status == 'READY' and not can_bet and is_repeat:
                         # We WOULD have entered but Race < 3
                         # Gap closes. We effectively skipped a winning cycle start.
                         skipped_wins += 1
        
        # Update Gaps
        if is_opp:
            if is_repeat:
                completed_gaps.append((current_gap, date, races))
                current_gap = 0
            else:
                current_gap += 1
        
        max_equity = max(max_equity, equity)
        min_equity = min(min_equity, equity)
        
        if bet_amount > 0 or notes:
            trades.append({
                'Date': date,
                'Race': race_idx,
                'Gap': current_gap,
                'Step': current_step if in_session else (0),
                'Stake': session_stake,
                'Cost': bet_amount,
                'Payout': payout,
                'PnL': payout - bet_amount,
                'Equity': equity,
                'Notes': notes
            })

    # Stats
    trades_df = pd.DataFrame(trades)
    trades_df.to_csv(OUTPUT_LOG, index=False)
    
    gross_profit = trades_df[trades_df['PnL'] > 0]['PnL'].sum()
    gross_loss = abs(trades_df[trades_df['PnL'] < 0]['PnL'].sum())
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 999.0
    
    completed_gaps.sort(key=lambda x: x[0], reverse=True)
    top_10 = completed_gaps[:10]
    top_10_md = "| Date | Gap Size | Races |\n|---|---|---|\n"
    for g in top_10:
        top_10_md += f"| {g[1].strftime('%Y-%m-%d')} | {g[0]} | {'-'.join(g[2])} |\n"

    report = f"""# Simulation Report - Sniper Mode (Race 3+)

**Parameters:**
- Stake: ${BASE_STAKE} (Multiplier {MULTIPLIER}x)
- Stop Loss: {MAX_STEPS} Steps
- Min Race: {MIN_RACE_BET} (Ignored R1, R2)
- P90 Window: All History

**Financial Results:**
- **Net Profit**: ${equity:.2f}
- Profit Factor: {profit_factor:.2f}
- Max Drawdown: ${min_equity:.2f}
- Peak Equity: ${max_equity:.2f}

**Cycle Performance:**
- Total Cycles Entered: {entries_count}
- Winning Cycles: {winning_cycles}
- **Stop Losses Hit**: {loss_cycles}
- Skipped Wins (R2 hits): {skipped_wins}
- Avg Steps to Win: {np.mean(steps_to_win) if steps_to_win else 0:.1f}

**Top 10 Longest Gaps:**
{top_10_md}

**Performance by Race (Betting candidates):**
- Race 3 Win Rate: {(races_performance[3]['wins']/races_performance[3]['total']*100) if races_performance[3]['total'] else 0:.1f}%
- Race 4 Win Rate: {(races_performance[4]['wins']/races_performance[4]['total']*100) if races_performance[4]['total'] else 0:.1f}%

Generated from {len(df)} days of data.
"""
    
    with open(OUTPUT_REPORT, 'w') as f:
        f.write(report)
    
    print("Sniper Simulation Complete.")
    print(report)

if __name__ == '__main__':
    run_simulation()

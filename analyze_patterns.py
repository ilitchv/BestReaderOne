import pandas as pd
import numpy as np

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
MULTIPLIER = 1.7
BASE_STAKE = 1.0
PAYOUT_ODDS = 9.0

def analyze_patterns():
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    events = []
    
    # Reconstruct event stream
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit():
                 races.append(val)
        
        if not races: continue
        
        day_winners = [races[0]] 
        
        for i, winner in enumerate(races[1:], start=2):
            is_repeat = (winner in day_winners)
            events.append({
                'Date': row['Date'],
                'Race': i,
                'IsRepeat': is_repeat
            })
            day_winners.append(winner)

    gaps = []
    current_gap = 0
    
    for evt in events:
        if evt['IsRepeat']:
            if current_gap > 0: 
                gaps.append(current_gap)
            else:
                 gaps.append(0)
            current_gap = 0
        else:
            current_gap += 1
            
    print("\n--- Profitability Analysis (Stop 5 vs Stop 6) ---")
    print("Gap | SL5 Win% | SL5 Net Profit | SL6 Win% | SL6 Net Profit")
    
    # Cost structures
    # Stop 5 costs: 1 + 1.7 + 2.89 + 4.91 + 8.35 = ~18.85
    # Stop 6 costs: ~18.85 + 14.2 = ~33.05
    
    def calculate_pnl(max_steps):
        net_profit = 0
        wins = 0
        total = 0
        
        for g_size in gaps:
            if g_size >= entry_gap:
                required_steps = (g_size - entry_gap) + 1
                
                # Simulation of cost/revenue
                cost = 0
                revenue = 0
                stake = BASE_STAKE
                
                if required_steps <= max_steps:
                    # Win
                    wins += 1
                    
                    # Cost logic
                    current_cost = 0
                    current_stake = BASE_STAKE
                    for _ in range(required_steps):
                        current_cost += current_stake
                        current_stake *= MULTIPLIER
                    
                    # Revenue (from last winning bet)
                    # The loop increments stake AFTER adding cost. 
                    # So the winning stake was: current_stake / MULTIPLIER
                    winning_stake = current_stake / MULTIPLIER
                    revenue = winning_stake * PAYOUT_ODDS
                    
                    net_profit += (revenue - current_cost)
                else:
                    # Loss (Stop Hit)
                    current_cost = 0
                    current_stake = BASE_STAKE
                    for _ in range(max_steps):
                        current_cost += current_stake
                        current_stake *= MULTIPLIER
                        
                    net_profit -= current_cost # Revenue is 0
                total += 1
        
        return (wins/total*100 if total else 0), net_profit

    for entry_gap in range(0, 16): 
        win5, pnl5 = calculate_pnl(5)
        win6, pnl6 = calculate_pnl(6)
        print(f"Wait {entry_gap:2d} | {win5:5.1f}% | ${pnl5:8.2f} | {win6:5.1f}% | ${pnl6:8.2f}")

if __name__ == '__main__':
    analyze_patterns()

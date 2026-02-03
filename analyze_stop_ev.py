import pandas as pd
import numpy as np
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
BASE_STAKE = 1.0 # Unit for calculation
MULTIPLIER = 2.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 6

def analyze_ev():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    # 1. Extract Streak Lengths (Gaps)
    outcomes = []
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        # R1 is Gap Event (outcome 0)
        outcomes.append(0)
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            is_rep = (winner in day_winners)
            outcomes.append(1 if is_rep else 0)
            day_winners.append(winner)
            
    streaks = []
    current = 0
    for res in outcomes:
        if res == 0:
            current += 1
        else:
            if current > 0: streaks.append(current)
            current = 0
    if current > 0: streaks.append(current)
    streaks = np.array(streaks)
    
    # 2. Define Cycle Boundaries
    # Entry: Gap 4
    # Cycle 1 ends at: Gap 4 + 6 = 10. (Stop 1 hit if Gap >= 10)
    # Cycle 2 ends at: Gap 10 + 6 = 16. (Stop 2 hit if Gap >= 16)
    # Cycle 3 ends at: Gap 16 + 6 = 22. (Stop 3 hit if Gap >= 22)
    # Cycle 4 ends at: Gap 22 + 6 = 28. (Stop 4 hit if Gap >= 28)
    
    stops = [10, 16, 22, 28, 34]
    
    print("--- EV Analysis of Consecutive Cycles ---")
    
    # Calculate Cycle Economics (approximate)
    # Cost: Sum of Stakes.
    # We assume 'Cost' roughly equals 'Stake' for the EV calc (simplified view of Risk).
    # Actual cost depends on targets. Let's assume Avg Targets = 2.5 for conservative estimate.
    AVG_TARGETS = 2.5
    
    stakes = [BASE_STAKE * (MULTIPLIER**i) for i in range(MAX_STEPS)]
    total_stake_units = sum(stakes)
    cycle_risk_cost = total_stake_units * AVG_TARGETS
    
    # Average Win Reward
    # If we win at Step k, Reward = (Stake_k * 9) - Cost_so_far.
    # We need Weighted Average Reward based on win distribution within a cycle.
    # But simplified: Just looking at "Win vs Loss" probability first.
    
    print(f"Cycle Risk Cost (approx): ${cycle_risk_cost:.2f} (Safe Estimate)")
    
    for i in range(len(stops)-1):
        start_gap = stops[i]
        end_gap = stops[i+1]
        
        # Count streaks that reached the START of this cycle (survived previous stop)
        reached_start = np.sum(streaks >= start_gap)
        
        # Count streaks that reached the END of this cycle (failed this cycle too)
        reached_end = np.sum(streaks >= end_gap)
        
        # Wins in this cycle
        wins = reached_start - reached_end
        
        if reached_start == 0:
            print(f"\nCycle {i+2} (After Stop {i+1}): No Data")
            continue
            
        win_prob = wins / reached_start
        loss_prob = reached_end / reached_start
        
        print(f"\nCycle {i+2} (Attempting Recovery after Stop {i+1} / Gap {start_gap})")
        print(f"  Streaks Entering: {reached_start}")
        print(f"  Streaks Failing (Stop {i+2}): {reached_end}")
        print(f"  Win Probability: {win_prob*100:.1f}%")
        print(f"  Loss Probability: {loss_prob*100:.1f}%")
        
        # EV Calculation
        # We need Avg Win Value.
        # Let's pivot: What is the Break Even Win Rate?
        # If we risk 1 unit to win X?
        # Here we risk ~160 units (Cycle Cost).
        # Average Win Net Profit in Master Sim was ~ $1682 / 138 wins = $12 per win?
        # NO. That's Net divided by wins.
        # Average "Payout - Cost" per winning cycle is high.
        # Let's calculate Avg Potential Profit for a cycle.
        # Profit = (Payout - Used_Cost).
        # Avg Step to win is ~3.
        # Stake at step 3 is 4 units. Payout 36. Cost so far (1+2+4)*2.5 = 17.5. Net ~18.5.
        # If we win at step 6: Stake 32. Payout 288. Cost 63*2.5 = 157. Net ~130.
        # The reward scales up!
        
        # Let's say Avg Reward is conservatively $50 (mix of early and late wins).
        avg_reward = 50.0 # Conservative guess
        
        ev = (win_prob * avg_reward) - (loss_prob * cycle_risk_cost)
        
        print(f"  Est. EV (Risk ${cycle_risk_cost:.0f} vs Reward $50): ${ev:.2f}")
        
        if ev < 0:
            print("  >>> CRITICAL: EV IS NEGATIVE. STOP HERE. <<<")
        else:
            print("  >>> GREEN LIGHT: Positive EV. Continue playing. <<<")

if __name__ == '__main__':
    analyze_ev()

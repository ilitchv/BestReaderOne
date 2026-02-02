import pandas as pd
import numpy as np
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def analyze_clustering():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    # 1. Build Gap Sequence
    gaps = [] # List of (gap_length, date_of_break)
    
    # We need a continuous stream of events to track gap resets
    curr_gap = 0
    
    # Track "Gap Breaks"
    # A gap breaks when we see a repeat (Gap becomes 0).
    # We record the value it reached BEFORE breaking.
    
    long_streaks_indices = [] # Index in the 'breaks' list
    all_breaks = [] # list of gap values that broke
    
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        # R1: IsGapEvent. Counts to gap. Cannot break gap (IsRepeat=False).
        curr_gap += 1
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            is_repeat = (winner in day_winners)
            
            if is_repeat:
                # Gap Broke!
                all_breaks.append({'gap': curr_gap, 'date': row['Date']})
                if curr_gap >= 10:
                    long_streaks_indices.append(len(all_breaks)-1)
                curr_gap = 0
            else:
                curr_gap += 1
            
            day_winners.append(winner)

    # 2. Analyze Distance to Next Monster
    print(f"Total Cycles (Gap Resets): {len(all_breaks)}")
    print(f"Monster Streaks (Gap >= 10): {len(long_streaks_indices)}")
    
    distances = []
    
    for idx in long_streaks_indices:
        # Find next monster
        # Look ahead in all_breaks
        next_monster_dist = -1
        for future_idx in range(idx + 1, len(all_breaks)):
            if all_breaks[future_idx]['gap'] >= 10:
                # Found next one
                next_monster_dist = future_idx - idx
                distances.append(next_monster_dist)
                break
    
    if not distances:
        print("Not enough data to analyze clustering.")
        return

    distances = np.array(distances)
    avg_dist = distances.mean()
    median_dist = np.median(distances)
    min_dist = distances.min()
    p25 = np.percentile(distances, 25)
    
    print(f"\n--- Volatility Clustering Analysis ---")
    print(f"Avg cycles between Monsters: {avg_dist:.1f}")
    print(f"Median cycles between Monsters: {median_dist:.1f}")
    print(f"Min cycles (Back-to-Back?): {min_dist}")
    print(f"25th Percentile: {p25}")
    
    # Interpretation
    # A "Cycle" is a gap reset.
    # Our strategy waits 4 races (Gap 4) to enter.
    # If the next monster is 1 cycle away, it means:
    # Streak breaks -> Gap 0 -> Gap grows to 10 immediately -> Stop Loss again.
    
    immediate_recurrence = np.sum(distances <= 3) # Monsters happening within 3 resets
    risk_pct = (immediate_recurrence / len(distances)) * 100
    
    print(f"\nRisk of 'Aftershock' (Monster returning within 3 cycles): {risk_pct:.1f}% ({immediate_recurrence}/{len(distances)})")
    
    if risk_pct > 20:
        print("CONCLUSION: HIGH CLUSTERING. Recommended to wait 1-2 full cycles after a Stop.")
    else:
        print("CONCLUSION: LOW CLUSTERING. The market resets to random. Safe to re-enter immediately.")

if __name__ == '__main__':
    analyze_clustering()

import pandas as pd
import numpy as np
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def analyze_streaks():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    # Flatten checks
    outcomes = [] # 1 if Repeat, 0 if No Repeat
    
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        # Race 1: Is it a repeat of previous? Daily prevs are empty.
        # But we treat R1 as a "Non-Repeat" event for Gap counting.
        # So Outcome=0.
        outcomes.append(0)
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            is_rep = (winner in day_winners)
            outcomes.append(1 if is_rep else 0)
            day_winners.append(winner)
            
    # Calculate Gaps (Lengths of consecutive 0s)
    streaks = []
    current = 0
    for res in outcomes:
        if res == 0:
            current += 1
        else:
            if current > 0:
                streaks.append(current)
            current = 0
    if current > 0: streaks.append(current)
    
    streaks = np.array(streaks)
    
    print(f"Total Sequences Analyzed: {len(streaks)}")
    print(f"Max Streak Length: {streaks.max()}")
    
    # Analysis Points
    # Strategy: Wait 4, Stop 6.
    # Entry Point: Gap 4.
    # 1st Stop Loss Point: Gap 10 (4 + 6).
    # 2nd Stop Loss Point: Gap 16/17 approx (10 + 6 more bets).
    
    count_reach_4 = np.sum(streaks >= 4)
    count_reach_10 = np.sum(streaks >= 10)
    count_reach_17 = np.sum(streaks >= 17)
    count_reach_23 = np.sum(streaks >= 23)
    
    print(f"\n--- Streak Survival Analysis ---")
    print(f"Reached Gap 4 (Entry): {count_reach_4}")
    print(f"Reached Gap 10 (Stop 1): {count_reach_10}")
    print(f"Reached Gap 17 (Stop 2): {count_reach_17}")
    print(f"Reached Gap 23 (Stop 3): {count_reach_23}")
    
    # Conditional Probabilities
    # If we are at Gap 10 (Just hit Stop 1), what are odds we reach 17 (Stop 2)?
    prob_stop2_given_stop1 = (count_reach_17 / count_reach_10) * 100 if count_reach_10 else 0
    print(f"\nRisk of Consecutive Stops:")
    print(f"If Stop 1 hit (Gap 10), chance of Stop 2 (Gap 17+): {prob_stop2_given_stop1:.1f}%")
    print(f"  -> {100-prob_stop2_given_stop1:.1f}% chance streak ends before Stop 2 (Recovery Win).")
    
    prob_stop3_given_stop2 = (count_reach_23 / count_reach_17) * 100 if count_reach_17 else 0
    print(f"If Stop 2 hit (Gap 17), chance of Stop 3 (Gap 23+): {prob_stop3_given_stop2:.1f}%")

    # Evaluation of "Cool Down" Rule
    # "If Stop 1 hit, wait X races".
    # If we wait: We skip the next outcomes.
    # If the streak breaks at 12, and we waited 5 (skipping 11-15), we missed the win at 12?
    # Yes.
    # If we wait, we only benefit if the streak was GOING to be >= 10+Wait.
    
    print(f"\n--- Deep Dive on Critical Zone (Gap 10 to 17) ---")
    # Count where streaks ended between 10 and 16
    ends_in_zone = np.sum((streaks >= 10) & (streaks < 17))
    continues_past = np.sum(streaks >= 17)
    
    print(f"Streaks ending between Gap 10-16 (Recovery Zone): {ends_in_zone}")
    print(f"Streaks continuing past Gap 16 (Danger Zone): {continues_past}")
    
    if ends_in_zone > continues_past:
        print("\nCONCLUSION: Do NOT Pause after Stop 1.")
        print("More streaks end quickly (Recovery) than continue to a second stop.")
        print("Pausing would cause you to miss the recovery win more often than it saves you from a second stop.")
    else:
        print("\nCONCLUSION: PAUSE Recommended.")
        print("Once a streak hits 10, it is likely to keep going.")

if __name__ == '__main__':
    analyze_streaks()

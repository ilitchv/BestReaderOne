import pandas as pd
import ast

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def analyze():
    df = pd.read_csv(INPUT_CSV)
    
    # Re-construct events logic briefly to get targets
    r2_targets = []
    r3_targets = []
    r4_targets = []
    
    for _, row in df.iterrows():
        # Get races
        races = []
        for c in ['R1','R2','R3','R4']:
            val = str(row[c]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
            
        if len(races) < 4: continue # Focus on full days for fair comparison
        
        # R2 targets = [R1]
        t2 = {races[0]}
        r2_targets.append(len(t2))
        
        # R3 targets = [R1, R2]
        t3 = {races[0], races[1]}
        r3_targets.append(len(t3))
        
        # R4 targets = [R1, R2, R3]
        t4 = {races[0], races[1], races[2]}
        r4_targets.append(len(t4))

    print("Average Targets (Numbers available to bet on):")
    print(f"Race 2: {sum(r2_targets)/len(r2_targets):.2f}")
    print(f"Race 3: {sum(r3_targets)/len(r3_targets):.2f}")
    print(f"Race 4: {sum(r4_targets)/len(r4_targets):.2f}")
    
    # Probability Factor
    # If R2 has 1 target -> ~10% chance
    # If R4 has 2.4 targets -> ~24% chance
    # This confirms if mere volume of targets explains the improved win rate.

if __name__ == '__main__':
    analyze()

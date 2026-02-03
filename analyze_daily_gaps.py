import pandas as pd
import numpy as np

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def analyze_daily_gaps():
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    unique_dates = df['Date'].unique()
    
    daily_results = []
    
    for dt in unique_dates:
        day_rows = df[df['Date'] == dt]
        day_has_repeat = False
        
        # Reconstruct day logic
        # We need to iterate rows for that day? Usually 1 row per day.
        for idx, row in day_rows.iterrows():
            races = []
            for r_col in ['R1', 'R2', 'R3', 'R4']:
                val = str(row[r_col]).strip()
                if val.endswith('.0'): val = val[:-2]
                if val and val.isdigit(): races.append(val)
            
            if not races: continue
            
            day_winners = [races[0]]
            for winner in races[1:]:
                if winner in day_winners:
                    day_has_repeat = True
                day_winners.append(winner)
        
        daily_results.append({
            'Date': dt,
            'HasRepeat': day_has_repeat
        })
        
    # Analyze Consecutive Days without Repeat
    day_gaps = []
    current_day_gap = 0
    
    for res in daily_results:
        if res['HasRepeat']:
            if current_day_gap > 0:
                day_gaps.append(current_day_gap)
            else:
                day_gaps.append(0) # Immediate repeat day
            current_day_gap = 0
        else:
            current_day_gap += 1
            
    # Stats
    total_days = len(daily_results)
    days_with_repeat = sum(1 for r in daily_results if r['HasRepeat'])
    repeat_rate = (days_with_repeat / total_days) * 100
    
    avg_gap = np.mean(day_gaps) if day_gaps else 0
    max_gap = np.max(day_gaps) if day_gaps else 0
    p90_gap = np.percentile(day_gaps, 90) if day_gaps else 0
    
    print(f"Total Days Analyzed: {total_days}")
    print(f"Days WITH Repetition: {days_with_repeat} ({repeat_rate:.1f}%)")
    print(f"Days WITHOUT Repetition: {total_days - days_with_repeat}")
    
    print(f"\n--- Gap Analysis (Consecutive Days without ANY repeat) ---")
    print(f"Average Gap: {avg_gap:.2f} Days")
    print(f"Max Gap Seen: {max_gap} Days")
    print(f"P90 Gap: {p90_gap:.1f} Days")
    
    print("\nGap Distribution (How long do cold streaks last?):")
    gap_counts = {}
    for g in day_gaps:
        gap_counts[g] = gap_counts.get(g, 0) + 1
        
    for g in sorted(gap_counts.keys()):
        print(f"Gap {g} Days: {gap_counts[g]} occurrences")

if __name__ == '__main__':
    analyze_daily_gaps()

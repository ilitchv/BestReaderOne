import pandas as pd
import datetime

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def check_data():
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    start_date = df['Date'].min()
    end_date = df['Date'].max()
    
    # Generate full range
    full_range = pd.date_range(start=start_date, end=end_date)
    existing_dates = set(df['Date'].dt.date)
    
    missing = []
    for d in full_range:
        if d.date() not in existing_dates:
            missing.append(d.date())
            
    print(f"Data Range: {start_date.date()} to {end_date.date()}")
    print(f"Total Days in Range: {len(full_range)}")
    print(f"Days with Data: {len(existing_dates)}")
    print(f"Missing Days: {len(missing)}")
    
    print("\nMissing Dates Analysis:")
    # Group by month or year to see patterns
    from collections import Counter
    missing_months = Counter()
    
    # Print first 20 missing
    if missing:
        print("First 10 Missing:", [str(d) for d in missing[:10]])
    
    # Check for specific holidays
    holidays = [datetime.date(d.year, 12, 25) for d in  full_range] + [datetime.date(d.year, 1, 1) for d in full_range]
    
    explanation = []
    unknown = []
    
    for d in missing:
        if d in holidays:
            explanation.append(f"{d} (Holiday)")
        else:
            unknown.append(d)
            
    print(f"\nexplained by Holidays (Xmas/Jan1): {len(explanation)}")
    print(f"Unexplained Missing Days: {len(unknown)}")
    
    if len(unknown) > 0:
        print("Sample Unexplained:", [str(d) for d in unknown[:10]])
        # Check weekdays
        weekdays = Counter([d.weekday() for d in unknown])
        # 0=Mon, 6=Sun
        print("Weekday distribution of missing days (0=Mon, 6=Sun):", weekdays)

if __name__ == '__main__':
    check_data()

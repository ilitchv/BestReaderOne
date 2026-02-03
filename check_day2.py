import pandas as pd

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def check_day_2():
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    # Get Aug 12 2024
    day2 = df[df['Date'] == '2024-08-12']
    
    if not day2.empty:
        row = day2.iloc[0]
        print(f"Date: {row['Date'].strftime('%Y-%m-%d')}")
        print(f"R1: {row['R1']}")
        print(f"R2: {row['R2']}")
        print(f"R3: {row['R3']}")
        print(f"R4: {row['R4']}")
    else:
        print("Date not found")

if __name__ == '__main__':
    check_day_2()

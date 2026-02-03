import pandas as pd

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def get_oldest():
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    first_row = df.iloc[0]
    
    print(f"Oldest Date: {first_row['Date'].strftime('%Y-%m-%d')}")
    print(f"R1: {first_row['R1']}")
    print(f"R2: {first_row['R2']}")
    print(f"R3: {first_row['R3']}")
    print(f"R4: {first_row['R4']}")
    print(f"Raw: {first_row['Raw']}")

if __name__ == '__main__':
    get_oldest()

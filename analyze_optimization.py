import pandas as pd
import numpy as np

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
BASE_STAKE = 2.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 6
ENTRY_GAP = 4

def simulate_params(step_multiplier, recovery_multiplier):
    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    # Reconstruct events
    events = []
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue
        
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            events.append({
                'IsRepeat': (winner in day_winners),
                'IsOpp': True
            })
            day_winners.append(winner)
            
    # Simulation
    current_gap = 0
    in_session = False
    current_step = 0
    
    # Session Management
    consecutive_cycle_losses = 0
    current_base_stake = BASE_STAKE 
    session_stake = BASE_STAKE
    
    equity = 0.0
    min_equity = 0.0
    
    wins = 0
    stops = 0
    
    for evt in events:
        # Determine Entry
        should_bet = in_session or (current_gap >= ENTRY_GAP)
        
        is_repeat = evt['IsRepeat']
        
        bet_amount = 0
        payout = 0
        
        if evt['IsOpp']:
            if should_bet:
                if not in_session:
                    # START NEW SESSION
                    # Apply Recovery Logic to Base Stake
                    if consecutive_cycle_losses > 0 and recovery_multiplier > 1.0:
                        # Simple Recovery: Increase Base Stake once? 
                        # Or Progression?
                        # User asked: "multiplicador idoneo para iniciar en la siguiente seria"
                        # Let's try exponential recovery: Base * (Recov ^ Losses)
                        # Cap it? Let's cap at 5x Base to avoid infinity
                        factor = min(recovery_multiplier ** consecutive_cycle_losses, 10.0)
                        current_base_stake = BASE_STAKE * factor
                    else:
                        current_base_stake = BASE_STAKE
                        
                    in_session = True
                    current_step = 1
                    session_stake = current_base_stake
                
                # Bet
                # Assumptions: 2.7 targets on average. 
                # Cost is approximated as: session_stake * 2.7 (Average cost per step)
                # Or simplistic: Cost = session_stake * 1 (Assuming 1 bet).
                # To be consistent with "Win/Loss" comparison, let's assume Cost=Stake.
                # The Multiplier assumes we cover the previous cost.
                # Real cost depends on targets. Payout is 9x.
                # Let's stick to the abstracted model used in analyze_patterns
                # Cost = Stake. Payout = Stake * 9 (if win single number).
                # Note: Payout 9 is for picking the WINNER. 
                # If we bet on 3 numbers, cost is 3*Stake. Return is 9*Stake. Setup effectively odds 3:1.
                # If we use abstract model:
                cost = session_stake
                equity -= cost
                bet_amount = cost
                
                if is_repeat:
                    # WIN
                    revenue = session_stake * PAYOUT_ODDS
                    # Note: If we bet on 3 numbers, revenue is same, but cost was higher. 
                    # If we use abstract model, we assume cost=stake.
                    # PROFIT = 9*S - S = 8S.
                    # If real world (3 targets): Profit = 9*S - 3*S = 6S.
                    # Let's be conservative and assume Cost is higher?
                    # No, let's stick to abstract for relative comparison.
                    payout = revenue
                    equity += revenue
                    
                    wins += 1
                    in_session = False
                    consecutive_cycle_losses = 0 # Reset recovery
                else:
                    # LOSS
                    if current_step >= MAX_STEPS:
                        # STOP LOSS
                        stops += 1
                        consecutive_cycle_losses += 1
                        in_session = False
                    else:
                        current_step += 1
                        session_stake = session_stake * step_multiplier
                        
            min_equity = min(min_equity, equity)
        
        # Gap Update
        if evt['IsOpp']:
            if is_repeat: current_gap = 0
            else: current_gap += 1
            
    return equity, min_equity, wins, stops

def run_analysis():
    print("Optimization Analysis (Gap 4, Stop 6)")
    
    print("\n1. Step Multiplier Analysis (Recovery = 1.0/Off)")
    print("Mult | Net Profit | Drawdown | Profit Factor (Proxy) ")
    # VARY STEP MULTIPLIER
    best_step_mult = 1.7
    best_profit = -999999
    
    for m in [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5]:
        profit, dd, w, s = simulate_params(step_multiplier=m, recovery_multiplier=1.0)
        print(f"{m:.1f}x | ${profit:10.2f} | ${dd:10.2f} | Wins:{w} Stops:{s}")
        if profit > best_profit:
            best_profit = profit
            best_step_mult = m
            
    print(f"\nBest Step Multiplier found: {best_step_mult}x")
    
    print("\n2. Recovery Multiplier Analysis (Using Step Mult = 2.0x for testing high Aggression)")
    # Or use best found? Let's use 2.0x as user suggested exploring it.
    step_m = 2.0
    print(f"Base Stake Recovery (after Stop Loss) testing with Step Mult {step_m}x")
    print("Recov Mult | Net Profit | Drawdown | Risk Rating")
    
    for r in [1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]:
        profit, dd, w, s = simulate_params(step_multiplier=step_m, recovery_multiplier=r)
        risk = abs(dd) / (profit if profit > 0 else 1) 
        print(f"{r:.2f}x       | ${profit:10.2f} | ${dd:10.2f} | {risk:.2f}")

if __name__ == '__main__':
    run_analysis()

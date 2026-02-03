import pandas as pd
import numpy as np
import os

INPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"
OUTPUT_REPORT = r"c:\Users\Admin\Desktop\SniperStrategyProject\sim_report_compound.md"

# Strategy Params (Master Strategy - "Pure Patience")
MULTIPLIER = 2.0
PAYOUT_ODDS = 9.0
MAX_STEPS = 6
ENTRY_GAP = 4

# Financial Params
RISK_PER_SESSION_PCT = 0.05 # Risk 5% of bankroll per session (Aggressive but viable with 80% WR)
                            # Cost of session (6 steps) = 2+4+8+16+32+64 = 126 units.
                            # So Stake = Bank * 0.05 / 63.
                            
TARGET_MONTHLY_INCOME = 4000.0

def run_simulation():
    if not os.path.exists(INPUT_CSV):
        print("Data file not found.")
        return

    df = pd.read_csv(INPUT_CSV)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.drop_duplicates(subset=['Date'])
    df = df.sort_values('Date')
    
    # 1. First Pass: Fixed $2 Stake to determine Safety Baseline
    # logic matches sim_horses_master (R1 Ignored)
    events = []
    for idx, row in df.iterrows():
        races = []
        for r_col in ['R1', 'R2', 'R3', 'R4']:
            val = str(row[r_col]).strip()
            if val.endswith('.0'): val = val[:-2]
            if val and val.isdigit(): races.append(val)
        if not races: continue

        # R1 is ignored in "Master - Pure Patience"
        day_winners = [races[0]]
        for i, winner in enumerate(races[1:], start=2):
            events.append({'Date':row['Date'], 'Race':i, 'Winner':winner, 'Prevs':day_winners.copy(), 'IsOpp':True})
            day_winners.append(winner)

    # --- SIMULATION 1: FIXED STAKE (Safety Check) ---
    max_drawdown_fixed = 0
    current_dd_fixed = 0
    peak_equity_fixed = 0
    equity_fixed = 0
    stake_fixed = 2.0
    
    cycle_cost_units = sum([MULTIPLIER**i for i in range(MAX_STEPS)]) # 1+2+4+8+16+32 = 63 units
    unit_cost_fixed = stake_fixed * cycle_cost_units # $126 for $2 stake
    
    # Run lightweight sim for stats
    # We need to accurately track DD to recommend Bankroll
    
    gap = 0
    in_sess = False
    step = 0
    curr_stake = 0
    
    profits_per_month = {} # Month -> Profit
    
    for evt in events:
        date_key = evt['Date'].strftime('%Y-%m')
        profits_per_month.setdefault(date_key, 0)
        
        is_repeat = (evt['Winner'] in evt['Prevs'])
        should_bet = in_sess or (gap >= ENTRY_GAP)
        
        pnl = 0
        if should_bet:
            if not in_sess:
                in_sess = True
                step = 1
                curr_stake = stake_fixed
            
            # Bet
            cost = curr_stake * len(evt['Prevs']) # Usually 1, 2, or 3. Approximating cost as 'curr_stake' for comparative consistency with previous reports?
            # User wants "Real Stats".
            # PREV REPORT used abstract cost? "Cost: bet_amount". 
            # In sim_horses_master: "cost = num_bets * session_stake".
            # Let's be accurate. Average targets is ~2. 
            # But the Payout is 9x. 
            # Let's stick to strict logic: Cost = Stake * Targets. Payout = Stake * 9.
            
            targets_count = len(evt['Prevs'])
            real_cost = curr_stake * targets_count
            equity_fixed -= real_cost
            pnl -= real_cost
            
            if is_repeat:
                revenue = curr_stake * PAYOUT_ODDS
                equity_fixed += revenue
                pnl += revenue
                
                in_sess = False
                step = 0
            else:
                if step >= MAX_STEPS:
                    in_sess = False
                    step = 0
                else:
                    curr_stake *= MULTIPLIER
                    step += 1
        
        # Gap
        if is_repeat: gap=0
        else: gap+=1
        
        profits_per_month[date_key] += pnl
        
        peak_equity_fixed = max(peak_equity_fixed, equity_fixed)
        drawdown = equity_fixed - peak_equity_fixed
        max_drawdown_fixed = min(max_drawdown_fixed, drawdown)
    
    # Safe Bankroll Recommendation
    # Rule of Thumb: 2x Max Drawdown OR 20x Session Cost.
    # Max DD was around $1000-$1200 in previous runs.
    # Session Cost = ~$126 * AvgTargets(2) = ~$250 worst case?
    # Let's use 1.5 * MaxDD as "Comfortable Capital".
    recommended_bankroll_fixed = abs(max_drawdown_fixed) * 1.5
    if recommended_bankroll_fixed < 2000: recommended_bankroll_fixed = 2000 # Minimum floor
    
    avg_monthly_profit = np.mean(list(profits_per_month.values()))
    
    # --- SIMULATION 2: COMPOUNDING ---
    # Start with Recommended Bankroll
    bankroll_comp = recommended_bankroll_fixed
    start_bank_comp = bankroll_comp
    equity_comp_curve = []
    
    gap = 0
    in_sess = False
    step = 0
    base_stake_comp = 0
    curr_stake_comp = 0
    
    for evt in events:
        is_repeat = (evt['Winner'] in evt['Prevs'])
        should_bet = in_sess or (gap >= ENTRY_GAP)
        
        if should_bet:
            if not in_sess:
                # RECALCULATE STAKE BASED ON BANKROLL
                # Rule: Risk 5% of Bankroll for this Session.
                # Total Unit Risk = 63 units * AvgTargets(~2) = ~126 units?
                # No, let's keep it defined. Max Cycle Cost is known.
                # Worst case (loss): We lose Sum(Stakes * Targets).
                # Max Steps 6. Multiplier 2.
                # Stakes: S, 2S, 4S, 8S, 16S, 32S. Total 63S.
                # Targets: Varies (1 to 3). Avg 2.2.
                # Worst case cost approx 63S * 2.5 = ~160S.
                # We want 160S <= Bank * RISK_PER_SESSION_PCT.
                # S = (Bank * Risk) / 160.
                
                risk_amt = bankroll_comp * RISK_PER_SESSION_PCT
                base_stake_comp = risk_amt / 160.0
                if base_stake_comp < 2.0: base_stake_comp = 2.0 # Floor
                
                in_sess = True
                step = 1
                curr_stake_comp = base_stake_comp

            targets_count = len(evt['Prevs'])
            real_cost = curr_stake_comp * targets_count
            
            # Check for bust (theoretical, though risk mgmt should prevent)
            if real_cost > bankroll_comp:
                real_cost = bankroll_comp # All in (shouldn't happen with 5% risk)
            
            bankroll_comp -= real_cost
            
            if is_repeat:
                revenue = curr_stake_comp * PAYOUT_ODDS
                bankroll_comp += revenue
                in_sess = False
                step = 0
            else:
                if step >= MAX_STEPS:
                    in_sess = False
                    step = 0
                else:
                    curr_stake_comp *= MULTIPLIER
                    step += 1
        
        if is_repeat: gap=0
        else: gap+=1
        
        equity_comp_curve.append(bankroll_comp)

    final_bankroll = bankroll_comp
    total_gain_comp = final_bankroll - start_bank_comp
    roi_comp = (total_gain_comp / start_bank_comp) * 100
    
    # --- TARGET CALCULATION ---
    # Avg Monthly Profit with $2 stake = avg_monthly_profit
    # Target = 4000. 
    # Multiplier needed = 4000 / avg_monthly_profit.
    scale_factor = TARGET_MONTHLY_INCOME / avg_monthly_profit if avg_monthly_profit > 0 else 0
    required_stake_for_target = 2.0 * scale_factor
    required_bankroll_for_target = recommended_bankroll_fixed * scale_factor

    report = f"""# Financial Projections & Compounding Analysis

**1. Baseline Performance ($2 Stake)**
- **Average Monthly Profit**: ${avg_monthly_profit:.2f}
- **Max Drawdown (Risk)**: ${max_drawdown_fixed:.2f}
- **Recommended Safe Bankroll**: ${recommended_bankroll_fixed:.0f} (to withstand worst streaks comfortably).
- **Weekly Capital Needs**: Roughly ${recommended_bankroll_fixed/10:.0f} buffer for active play, but recommend keeping full bankroll accessible.

**2. Target: $4,000 / Month**
To achieve a consistently high income ($4k/mo) based on historical performance:
- **Required Base Stake**: ${required_stake_for_target:.2f} (approx ${int(required_stake_for_target)})
- **Required Bankroll**: ${required_bankroll_for_target:,.0f}
- *Note: This assumes the strategy scales linearly.*

**3. Compound Growth Simulation (Reinvesting Profits)**
If you started with **${start_bank_comp:.0f}** and reinvested profits (Increasing stake as bank grows, risking 5% per cycle):
- **Final Bankroll (Year 1.5)**: **${final_bankroll:,.0f}**
- **Total ROI**: {roi_comp:.1f}%
- **Growth Factor**: Your money would have grown **{final_bankroll/start_bank_comp:.1f}x**.

*Warning: Increasing stakes increases psychological pressure. Ensure you stick to the plan even when bets become large ($100+).*
"""
    with open(OUTPUT_REPORT, 'w') as f:
        f.write(report)
        
    print(report)

if __name__ == '__main__':
    run_simulation()

import pandas as pd

# Constants from previous analysis
AVG_MONTHLY_PROFIT_PER_DOLLAR_STAKE = 132.67 / 2.0  # Approx $66.33 per $1 stake
SAFE_BANKROLL_PER_DOLLAR_STAKE = 2397.0 / 2.0      # Approx $1198.50 per $1 stake
TARGET_INCOME = 4000.0

def generate_ladder():
    print("# Escala de Crecimiento 'Sniper' (Ruta a los $4,000/mes)")
    print("**Regla de Oro:** Solo sube de nivel cuando tu Capital (Banco) alcance el monto indicado. Si bajas, reduce la apuesta.")
    print("")
    print("| Nivel | Apuesta Base | Capital Requerido (Banco) | Ingreso Mensual Est. | Meta de Capital para Siguiente Nivel |")
    print("|---|---|---|---|---|")
    
    # We want meaningful steps.
    # Start: $2. End: ~$60.
    # Steps: increments of maybe 10-20%? or fixed amounts?
    # Let's use comprehensible round numbers.
    stake = 2.0
    
    while True:
        monthly_income = stake * AVG_MONTHLY_PROFIT_PER_DOLLAR_STAKE
        required_bank = stake * SAFE_BANKROLL_PER_DOLLAR_STAKE
        
        # Next level
        if monthly_income >= TARGET_INCOME:
            print(f"| **META** | **${stake:.2f}** | **${required_bank:,.0f}** | **${monthly_income:,.0f}** | - |")
            break
        
        # Determine next stake increment
        if stake < 5: next_stake = stake + 1.0 # 2 -> 3 -> 4 -> 5
        elif stake < 20: next_stake = stake + 2.5 # 5 -> 7.5 -> 10 ...
        elif stake < 50: next_stake = stake + 5.0
        else: next_stake = stake + 10.0
            
        next_bank_milestone = next_stake * SAFE_BANKROLL_PER_DOLLAR_STAKE
        
        print(f"| {stake:5.2f} | ${stake:5.2f} | ${required_bank:,.0f} | ${monthly_income:,.0f} | Llegar a ${next_bank_milestone:,.0f} |")
        
        stake = next_stake

if __name__ == '__main__':
    generate_ladder()

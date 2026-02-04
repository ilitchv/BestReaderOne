import { GameOutcome, SpinResult, SystemSettings, UserProfile } from './types';

/**
 * WHEEL SEGMENT CONFIGURATION
 * 8 Segments total. 0 is Top. 45 degrees each.
 */
const SEGMENTS = [
    { index: 0, label: "FREE TICKET", type: 'WIN', value: 1.00, angleStart: 0, angleEnd: 45 },
    { index: 1, label: "BAD LUCK", type: 'LOSS', value: 0.00, angleStart: 45, angleEnd: 90 },
    { index: 2, label: "15% OFF", type: 'WIN', value: 0.15, angleStart: 90, angleEnd: 135 },
    { index: 3, label: "TRY AGAIN", type: 'LOSS', value: 0.00, angleStart: 135, angleEnd: 180 },
    { index: 4, label: "50% OFF", type: 'WIN', value: 0.50, angleStart: 180, angleEnd: 225 },
    { index: 5, label: "ALMOST", type: 'LOSS', value: 0.00, angleStart: 225, angleEnd: 270 },
    { index: 6, label: "NO PRIZE", type: 'LOSS', value: 0.00, angleStart: 270, angleEnd: 315 },
    { index: 7, label: "SAD DAY", type: 'LOSS', value: 0.00, angleStart: 315, angleEnd: 360 },
];

export class CasinoEngine {

    private static isProcessing = false;

    public static async calculateWinOutcome(
        billAmount: number,
        settings: SystemSettings,
        user?: UserProfile
    ): Promise<{ result: SpinResult; newSettings: SystemSettings }> {

        if (this.isProcessing) {
            throw new Error("Transaction collision detected.");
        }
        this.isProcessing = true;

        const nextSettings = { ...settings };

        // 1. Accumulation
        const surcharge = billAmount * settings.surchargePercent;
        nextSettings.globalPool += surcharge;

        // 2. Determine Outcome based on Odds & Solvency
        const roll = Math.random(); // 0.0 to 1.0

        // Thresholds
        const thresholdJackpot = settings.oddsJackpot;
        const thresholdTier2 = thresholdJackpot + settings.oddsTier2;
        const thresholdTier3 = thresholdTier2 + settings.oddsTier3;

        let selectedSegmentIndex = 1; // Default to Loss
        let outcome = GameOutcome.LOSS;
        let finalPayout = 0;
        let isLoyaltyRescue = false;

        // -- LOYALTY OVERRIDE (Simplified) --
        let effectiveRoll = roll;
        if (user && user.consecutiveLosses >= 5) {
            isLoyaltyRescue = true;
            // Force a win of at least Tier 3 if available
            effectiveRoll = 0.0; // Force Jackpot attempt range
        }

        // -- CHECK WIN CONDITIONS --
        // Priority: Jackpot -> 50% -> 15% -> Loss

        // Attempt Jackpot (100% Off) - Segment 0
        if (effectiveRoll < thresholdJackpot) {
            if (nextSettings.globalPool > billAmount) {
                selectedSegmentIndex = 0;
                outcome = GameOutcome.WIN;
                finalPayout = billAmount;
            } else {
                // Insufficient funds for Jackpot, downgrade check
                outcome = GameOutcome.NEAR_MISS; // Will land close
            }
        }
        // Attempt Tier 2 (50% Off) - Segment 4
        else if (effectiveRoll < thresholdTier2) {
            const payout = billAmount * 0.50;
            if (nextSettings.globalPool > payout) {
                selectedSegmentIndex = 4;
                outcome = GameOutcome.WIN;
                finalPayout = payout;
            }
        }
        // Attempt Tier 3 (15% Off) - Segment 2
        else if (effectiveRoll < thresholdTier3) {
            const payout = billAmount * 0.15;
            if (nextSettings.globalPool > payout) {
                selectedSegmentIndex = 2;
                outcome = GameOutcome.WIN;
                finalPayout = payout;
            }
        }

        // If still loss, pick random loss segment (1, 3, 5, 6, 7)
        if (outcome !== GameOutcome.WIN) {
            const lossIndices = [1, 3, 5, 6, 7];
            selectedSegmentIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];

            // Visual Near Miss override logic
            if (outcome === GameOutcome.NEAR_MISS) {
                // Force it to land on index 1 (Bad Luck) or 7 (Sad Day) which are next to Jackpot (0)
                selectedSegmentIndex = Math.random() > 0.5 ? 1 : 7;
            }
        }

        // 3. Update Settings if Win
        if (outcome === GameOutcome.WIN) {
            nextSettings.globalPool -= finalPayout;
            // Decay logic (simplified for multi-tier: decay proportional to win size)
            const winRatio = finalPayout / billAmount; // 1.0, 0.5 or 0.15
            nextSettings.currentRTP = Math.max(
                settings.minRTP,
                settings.currentRTP - (settings.decayRate * winRatio)
            );
        }

        // 4. Calculate Angle
        // In CSS rotation, 0deg is usually top.
        // To land on Segment X, we need to rotate the wheel such that Segment X is at top.
        // Total Rotation = (Full Spins) - (SegmentCenterAngle)
        const segment = SEGMENTS.find(s => s.index === selectedSegmentIndex)!;
        const segmentCenter = (segment.angleStart + segment.angleEnd) / 2;

        // Add 5 full spins (1800 deg) + adjustment to land clearly
        // We invert the angle because the wheel spins clockwise, so we subtract the target index angle
        const randomOffset = (Math.random() * 20) - 10; // +/- 10 degrees variance
        const targetAngle = (360 * 5) - segmentCenter + randomOffset;

        this.isProcessing = false;

        return {
            result: {
                outcome,
                billAmount,
                surchargeAmount: surcharge,
                finalPayout,
                isLoyaltyRescue,
                stopAngle: targetAngle,
                prizeLabel: segment.label
            },
            newSettings: nextSettings
        };
    }
}

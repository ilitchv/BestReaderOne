const ledgerService = require('./ledgerService');
const User = require('../models/User');

const SYSTEM_SETTINGS = {
    surchargePercent: 0.10,
    oddsJackpot: 0.02,
    oddsTier2: 0.08,
    oddsTier3: 0.15,
    minRTP: 0.60
};

// 8 Segments
const SEGMENTS = [
    { index: 0, label: "FREE TICKET", type: 'WIN', value: 1.00 },
    { index: 1, label: "BAD LUCK", type: 'LOSS', value: 0.00 },
    { index: 2, label: "15% OFF", type: 'WIN', value: 0.15 },
    { index: 3, label: "TRY AGAIN", type: 'LOSS', value: 0.00 },
    { index: 4, label: "50% OFF", type: 'WIN', value: 0.50 },
    { index: 5, label: "ALMOST", type: 'LOSS', value: 0.00 },
    { index: 6, label: "NO PRIZE", type: 'LOSS', value: 0.00 },
    { index: 7, label: "SAD DAY", type: 'LOSS', value: 0.00 },
];

exports.spinWheel = async (userId, billAmount) => {
    // 1. Validation
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const surcharge = billAmount * SYSTEM_SETTINGS.surchargePercent;

    // 2. Charge User (Throws if undefined balance, but we assume allow negative for now? No, stick to ledger rules)
    // Actually ledgerService.addToLedger allows overdraw? We should check.
    // For now, we assume user must have balance.
    if (user.balance < surcharge) {
        throw new Error("Insufficient funds for surcharge");
    }

    // DEDUCT SURCHARGE
    const betBlock = await ledgerService.addToLedger({
        action: 'CASINO_BET',
        userId: userId,
        amount: -surcharge, // Negative for deduction
        description: `Roulette Entry Fee (Ticket: $${billAmount})`,
        referenceId: `SPIN-${Date.now()}`
    });

    // 3. Game Logic
    const roll = Math.random();
    let outcome = 'LOSS';
    let finalPayout = 0;
    let selectedSegmentIndex = 1;

    // Thresholds
    const thresholdJackpot = SYSTEM_SETTINGS.oddsJackpot;
    const thresholdTier2 = thresholdJackpot + SYSTEM_SETTINGS.oddsTier2;
    const thresholdTier3 = thresholdTier2 + SYSTEM_SETTINGS.oddsTier3;

    if (roll < thresholdJackpot) {
        outcome = 'WIN';
        finalPayout = billAmount;
        selectedSegmentIndex = 0;
    } else if (roll < thresholdTier2) {
        outcome = 'WIN';
        finalPayout = billAmount * 0.50;
        selectedSegmentIndex = 4;
    } else if (roll < thresholdTier3) {
        outcome = 'WIN';
        finalPayout = billAmount * 0.15;
        selectedSegmentIndex = 2;
    } else {
        // Loss
        const lossIndices = [1, 3, 5, 6, 7];
        selectedSegmentIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
    }

    // 4. Payout
    let winBlock = null;
    if (outcome === 'WIN') {
        winBlock = await ledgerService.addToLedger({
            action: 'CASINO_WIN',
            userId: userId,
            amount: finalPayout,
            description: `Roulette Win: ${SEGMENTS[selectedSegmentIndex].label}`,
            referenceId: `WIN-${Date.now()}`
        });
    }

    // Calculate Angle
    // Target Angle logic same as client
    const segment = SEGMENTS.find(s => s.index === selectedSegmentIndex);
    const segmentCenter = (selectedSegmentIndex * 45 + 22.5); // Center of segment
    const randomOffset = (Math.random() * 20) - 10;
    const stopAngle = (360 * 5) - segmentCenter + randomOffset;

    return {
        result: {
            outcome,
            billAmount,
            surchargeAmount: surcharge,
            finalPayout,
            stopAngle,
            prizeLabel: segment.label,
            isLoyaltyRescue: false
        },
        newBalance: winBlock ? winBlock.balanceAfter : betBlock.balanceAfter
    };
};

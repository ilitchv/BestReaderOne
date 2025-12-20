const bitcoin = require('bitcoinjs-lib');
const { BIP32Factory } = require('bip32');
const tinysecp = require('tiny-secp256k1');

const bip32 = BIP32Factory(tinysecp);
const network = bitcoin.networks.bitcoin;

// User Data
const XPUB = "xpub6D8EjyQNGa1po8Rvq9auk4teHiKpyVk6toreEvAqH1XLN3355az2UDBspruckmwK1b4pVg7aDED9bjmLtaixi52LPhcuDjXa62UkrY6HrRb";
const USER_ADDRESSES = [
    "bc1qhnlnemg2dytwg8xzkrwsqfvjd3ln7du5k5wuk7", // BitPay
    "bc1qekqr7aq2x55f7h924hwslnhgaxn372sd0p9tgu", // CashApp
    "bc1qlxh4aaqxel23pnn275amc9vr44pczghz6cte9y", // Exodus Desktop
    "bc1qg4rx06kk24gg7fh084ywahtutlud3dkvehlje8"  // Exodus Mobile
];

function deriveAddresses() {
    console.log("🔍 Forensic Wallet Analysis Started...");
    console.log(`🔑 Analyzing XPUB: ${XPUB.substring(0, 20)}...`);

    let matched = false;
    const derivedList = [];

    // Strategy 1: Treat as standard xpub (P2PKH - Legacy) -> 1...
    // Strategy 2: Treat as Native Segwit (P2WPKH) -> bc1q... (Common in modern wallets like Exodus/Ledger)

    try {
        const node = bip32.fromBase58(XPUB, network);

        console.log("\n--- Checking Address Derivations (First 50) ---");

        for (let i = 0; i < 50; i++) {
            // Derive child at index i (0/i for external chain)
            const child = node.derive(0).derive(i);

            // 1. Native Segwit (Bech32) - Most likely for 'bc1q' addresses
            const { address: segwitAddr } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network });

            // 2. Legacy (Base58)
            const { address: legacyAddr } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network });

            derivedList.push(segwitAddr);
            derivedList.push(legacyAddr);

            // Check Matches
            for (const userAddr of USER_ADDRESSES) {
                if (userAddr === segwitAddr || userAddr === legacyAddr) {
                    console.log(`\n🚨 MATCH FOUND! 🚨`);
                    console.log(`User Address: ${userAddr}`);
                    console.log(`Derived Index: ${i}`);
                    console.log(`Type: ${userAddr === segwitAddr ? "Native Segwit (Bech32)" : "Legacy"}`);

                    if (userAddr === USER_ADDRESSES[0]) console.log("👉 WALLET: BitPay");
                    if (userAddr === USER_ADDRESSES[1]) console.log("👉 WALLET: CashApp");
                    if (userAddr === USER_ADDRESSES[2]) console.log("👉 WALLET: Exodus Desktop");
                    if (userAddr === USER_ADDRESSES[3]) console.log("👉 WALLET: Exodus Mobile");

                    matched = true;
                }
            }
        }

        if (!matched) {
            console.log("\n❌ NO MATCH FOUND in first 50 addresses.");
            console.log("Analysis Result: The provided xpub does NOT belong to any of the 4 wallets provided.");
            console.log("Conclusion: This xpub belongs to a different, unknown wallet.");
        }

    } catch (e) {
        console.error("Error analyzing xpub:", e.message);
    }
}

deriveAddresses();

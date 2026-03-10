
const now = new Date();
const todayISO = now.toISOString();
const todayStr = todayISO.split('T')[0];
const localDate = now.toDateString();
const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

console.log("System Time (now):", now.toString());
console.log("Timezone Offset:", now.getTimezoneOffset(), "minutes");
console.log("ISO String (UTC):", todayISO);
console.log("Today String (UTC-derived):", todayStr);
console.log("Local ISO String (Self-Corrected):", localISO);

const testDate = "2026-03-09";
console.log(`Comparison: '${testDate}' < '${todayStr}' is`, testDate < todayStr);
console.log(`Comparison: '${testDate}' < '${localISO}' is`, testDate < localISO);

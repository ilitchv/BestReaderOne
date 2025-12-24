const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

db.serialize(() => {
    console.log("\n--- UNIQUE LOTTERY IDs (Limit 50) ---");
    db.all("SELECT DISTINCT lotteryId FROM results ORDER BY lotteryId ASC LIMIT 100", [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        rows.forEach(row => {
            console.log(row.lotteryId);
        });
    });

    console.log("\n--- SAMPLE RESULT FOR 'usa/ct/Day' ---");
    db.all("SELECT * FROM results WHERE lotteryId LIKE '%ct%' LIMIT 5", [], (err, rows) => {
        rows.forEach(r => console.log(r.lotteryId, r.numbers, r.date));
    });

    console.log("\n--- SAMPLE RESULT FOR 'New York' (Legacy Check) ---");
    db.all("SELECT * FROM results WHERE lotteryId LIKE '%New York%' LIMIT 5", [], (err, rows) => {
        rows.forEach(r => console.log(r.lotteryId, r.numbers, r.date));
    });
});

db.close();

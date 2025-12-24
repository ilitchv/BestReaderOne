@c:\Users\Admin\Desktop\SniperStrategyProject\MEMORY_BANK.md

CONTEXT:
We have successfully fixed the "User Not Found" error when creating manual credits. The backend now receives the request and logs "Audit Logged" in the console. 
HOWEVER, the Admin Dashboard > "Audit" and "Ledger" tabs remain empty ("No logs found").

OBJECTIVE:
Diagnose and Fix the "Ghost Data" issue where the backend claims to log the audit (`AuditLog.create`), but the frontend fails to display it.

HYPOTHESES TO INVESTIGATE:
1. Is the `AuditLog` actually saving to MongoDB? (Check DB directly or add debug logs to GET endpoint).
2. Is the Frontend `loadAuditLog` function calling the correct API? (Network Tab check).
3. Is `AdminDashboard.tsx` still relying on `localDbService` for rendering, ignoring the API data?

TASK:
Debugging the Frontend-Backend Data Connection for Audit Logs.
Refer to Section 8 of MEMORY_BANK.md for the detailed action plan.


## 15. Independent Lottery APIs (Confidential & Critical)

### 15.1 Top Pick Lotto (`tplotto.com`)
*   **Type:** HTTP POST (Hidden API)
*   **Endpoint:** `https://tplotto.com/procedure_load_numbers_public`
*   **Payload:** `date=YYYY-MM-DD` (e.g., `date=2026-01-07`)
*   **Response:** JSON object where `.answer` contains an HTML string of the results table.
*   **Parsing Strategy:** Requires `cheerio` to parse the HTML within the JSON response.
*   **Notes:** Standard `curl` works. No complex headers required, but a standard User-Agent is recommended.

### 15.2 Instant Cash (`instantcash.bet`)
*   **Type:** WebSocket (Secure WSS)
*   **Endpoint:** `wss://instantcash.bet/ws/gamingLTSDrawHandler`
*   **Connection Logic:** 
    *   Requires a timestamp parameter: `?v={Date.now()}`.
    *   Data is pushed immediately upon connection (Snapshot) and then updates are pushed in real-time.
    *   **Keep-Alive:** The connection must be maintained or re-established to receive updates.
*   **Data Format:** JSON stream containing draw results and game states.

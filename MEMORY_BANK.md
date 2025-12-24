# Beast Reader Lotto - Cline Memory Bank

## 1. Visión General del Proyecto

**Beast Reader Lotto** es un ecosistema web para la gestión y análisis de loterías. La cara pública es una **landing page futurista** que sirve como un portal de marketing y un dashboard de resultados de lotería. Para los usuarios, ofrece una suite de herramientas avanzadas, principalmente un **Playground** para simular jugadas, accesible a través de una superposición (overlay) de pantalla completa.

## 2. Arquitectura del Sitio

El proyecto está estructurado como una **Aplicación de Página Única (SPA) con un patrón de superposición modal**.

1.  **`index.tsx` (Controlador Principal):** Es el punto de entrada. Gestiona qué vista está activa (la Landing Page o el Playground) usando el estado de React.
2.  **`LandingPage.tsx` (Vista por Defecto):** Es la cara pública del sitio. Su objetivo es atraer usuarios con un diseño profesional y actuar como un dashboard de resultados de lotería en vivo. Contiene el botón principal para acceder a la herramienta.
3.  **`PlaygroundApp.tsx` (La Herramienta Principal):** Es el motor de la plataforma. Se renderiza como una superposición (overlay) de pantalla completa cuando el usuario hace clic en el botón de acceso. Contiene toda la lógica para crear, gestionar y generar tickets.

Este enfoque evita la navegación entre páginas y mantiene toda la experiencia en una sola aplicación rápida y fluida.

## 3. Características Principales (Features)

### 3.1 Implementadas

- **Gestión de Jugadas:**
  - Añadir/eliminar jugadas manualmente (límite de 200).
  - Tabla de jugadas con campos para: Número de Apuesta, Monto "Straight", "Box" y "Combo".
  - **Límites de Apuesta:** Validación de montos máximos por modalidad de juego.
  - Selección múltiple de jugadas para acciones en lote.
  - Detección automática del **Modo de Juego**.
  - **Flujo de Entrada por Teclado Optimizado:** Sistema completo de navegación por teclado para una entrada manual ultra-rápida.

- **Selección de Sorteos (Tracks) y Fechas:**
  - Paneles de selección con contadores regresivos y deshabilitación de sorteos cerrados.

- **Herramientas de Entrada Rápida:**
  - **Asistente "Quick Wizard":** Para generación masiva de jugadas.
  - **Escaneo de Tickets con IA (OCR):** Usa Gemini para extraer jugadas de una imagen.
  - **Asistente de Apuestas con IA (Chatbot):** Permite entrada multimodal (voz, texto, imagen).

- **Cálculos y Generación de Ticket:**
  - Cálculos de totales en tiempo real.
  - Generación de un ticket final profesional con número único y QR, con salidas optimizadas para descarga (PNG) y para compartir (PDF).
  - **Identificadores de Terminal/Cajero:** Genera y muestra IDs persistentes en el ticket para seguimiento.

- **Persistencia de Estado:**
  - El estado del playground se guarda en `localStorage`.

### 3.2 Planificadas

- **Dashboard de Resultados en Vivo (en `LandingPage.tsx`):** Mostrará los últimos números ganadores de las principales loterías.
- **Generador de Números Estratégicos:** Una herramienta premium que utilizará análisis estadístico de datos históricos para sugerir jugadas.
- **Integración de Pagos con Shopify:**
    - Flujo de pago seguro que redirige al usuario al checkout de Shopify.
    - La generación final del ticket ocurrirá solo después de la confirmación de pago vía webhook.

## 4. Stack Tecnológico y Decisiones Clave

- **Frontend:** React con TypeScript.
- **Estilos:** Tailwind CSS con una configuración personalizada para temas (claro/oscuro) y estilos "neón".
- **IA / OCR:** `@google/genai` (Gemini API, modelo `gemini-2.5-flash`).
- **Persistencia:** `localStorage` para el estado del playground.

## 5. Guía de Estilo y UI/UX

- **Tema Dual:** Soporta modo claro y oscuro.
- **Estética "Neón" / Futurista:** Uso de colores vibrantes, gradientes y efectos de "glassmorphism".
- **Feedback al Usuario:** Uso de modales para confirmaciones, errores y flujos de trabajo complejos. Animaciones para indicar estados de carga.

## 6. Lecciones Aprendidas y Arquitectura de Despliegue (Critical)
- **Monorepo Implícito:** Vercel trata la carpeta `backend/` como parte del todo. **NUNCA** crear `package.json` dentro de `backend/` si no es un monorepo real. Provoca conflictos de versión ("Doppelgänger Dependency").
- **Mongoose Serverless:**
  1. `bufferCommands: false` es obligatorio.
  2. `await connectDB()` debe invocarse **dentro** de cada handler, no solo al inicio del archivo.
  3. Los Schemas deben tener `bufferCommands: false` explícito.
- **Limpieza de Cache:** En scripts de build, usar `rm -rf backend/node_modules` para evitar residuos zombies en Vercel.

## 7. Estado Actual: Semi-Auto Payouts (Fix Implementado - Verificación Pendiente)

### 7.1 Objetivo
Resolver el error 500 (`duplicate-destination`) en el botón "Auto Pay" del Admin Dashboard > Withdrawals. Este error ocurría cuando se intentaba pagar a una billetera que ya tenía un payout activo en BTCPay Server, y el backend fallaba al intentar recuperar ese payout existente.

### 7.2 Solución Implementada (`services/paymentService.js`)
Se ha mejorado la lógica de **Idempotencia** en la función `createPayout`.
*   **Antes:** La recuperación era débil y solo buscaba estados específicos o fallaba silenciosamente.
*   **Ahora:** Al capturar el error `duplicate-destination`, el sistema:
    1.  Consulta la API de BTCPay (`/payouts`) para obtener todos los payouts recientes.
    2.  Filtra en el cliente buscando una coincidencia exacta de `destination` Y que tenga uno de los estados activos: `'New'`, `'AwaitingApproval'`, o `'AwaitingPayment'`.
    3.  Si lo encuentra, devuelve el objeto payout formateado correctamente con `isSemiAuto: true` y el `signingLink`.
    4.  Esto permite que el frontend muestre el modal de "Signing Link" en lugar de un error 500.

### 7.3 Estado de Verificación
*   **Implementación:** ✅ Código aplicado en `services/paymentService.js`.
*   **Reinicio:** ✅ Servidores backend y frontend reiniciados.
*   **Prueba de Usuario:** ⚠️ Pendiente. El usuario detuvo la verificación automática.
*   **Próximo Paso Crítico:** El usuario debe ir al Dashboard, pestaña Withdrawals, y clicar "Auto Pay" en una solicitud problemática para confirmar que ahora aparece el modal de firma en lugar del error.

### 7.4 Pasos para el Siguiente Chat
1.  **Verificación Manual:** Navegar a `http://localhost:3000/admin`.
2.  **Prueba:** Clicar "Auto Pay" en una solicitud de retiro repetida.
3.  **Resultado Esperado:** Modal "Payout Staged!" con botón para firmar en BTCPay.
## Lessons Learned

### BTCPay Server Payout Recovery (Idempotency)
*   **Problem:** Retrying a payout for the same destination fails with "duplicate-destination" or "already used", but recovering the existing payout failed initially because we weren't checking all possible states.
*   **Solution:**
    *   **Comprehensive State Check:** When a duplicate is detected, query BTCPay for **all** states (`AwaitingPayment`, `AwaitingApproval`, `New`, `Processing`, `Completed`, `Cancelled`).
    *   **Scope & Permissions:** Ensure API configuration (`config`) is defined in a scope accessible to `catch` blocks for recovery logic.
    *   **Robust Links:** Use the general Payouts Dashboard URL (`/stores/{id}/payouts`) for the "Signing Link" instead of a specific ID link. Specific IDs can cause 404s if the format differs (e.g., On-Chain vs. Lightning), whereas the dashboard always loads and allows the user to find the staged payout.
    *   **Debug Dumping:** Writing a JSON dump of the API response (`_debug_payout_list.json`) was crucial to diagnosing that the API was returning an empty list due to credential scope issues.

### BTCPay Deposit Polling (Localhost Fix)
*   **Problem:** Webhooks do not work on `localhost` development environments because BTCPay Server cannot send HTTP requests to a private network address. This caused deposits to remain "Pending" in the app even after being completed in BTCPay.
*   **Solution:**
    *   **Frontend Polling:** Implemented a polling interval in `DepositModal.tsx` that calls `/api/payment/claim` every 5 seconds while the modal is open in "Waiting" state.
    *   **Backend Idempotency:** Updated `/api/payment/claim` to check `BeastLedger` for existing `referenceId` (e.g., `CLAIM-{invoiceId}`) before processing. This ensures that even if the polling calls the endpoint multiple times, the user is only credited once.
    *   **Result:** A robust deposit flow that works in both local (polling-driven) and production (webhook-driven) environments.

## Current State
*   **Server Status:** Verified running on port 8080.
*   **Auto Pay:** Fully functional with idempotency. Recovered payouts show "PENDING_SIGNATURE" and the modal correctly links to the BTCPay Dashboard.
*   **Deposits:** Fully functional on Localhost via Polling. Balance updates are instant and idempotent.

## 8. State Update: Critical Ledger Display Mismatch (2025-12-21)

### 8.1 Solved Issues
- **Shopify Deposit 500 Error:** Fixed by correcting the `.env` file credentials via a Node script. Validated with `testShopify.js`.
- **Ledger Date Bugs:** Fixed empty ledger tables by correcting date filtering logic.

### 8.2 Active CRITICAL Bug: Leftover "Pedro Martinez"
**Symptom:** 
When `user@demo.com` ("Demo Player", ID `693f...`) makes a deposit, the **Admin Dashboard > Ledger** displays the user correctly as ID `693f...` in the backend/audit logs, but the **NAME** rendered in the table is **"Pedro Martinez"**.

**Diagnosis:**
1. **Backend Integrity:** Confirmed via `debugUsers.js` (curl) that the API `/api/admin/users` returns:
   - ID `693f...` = "Demo Player"
   - ID `6941...` = "Pedro Martinez"
   This proves the backend data is CORRECT.
2. **Frontend Mismatch:** The `AdminDashboard.tsx` component is mapping ID `693f...` to "Pedro Martinez". This suggests the Frontend State (`users` array) is either:
   - Stale (not refreshing from API).
   - Polluted (merging with legacy LocalStorage data that has hardcoded "Pedro").
   - Bugged (Using `localDbService.getUsers()` which might return hardcoded mock data for IDs).

**Attempts:**
- Added `loadUsersFromDb()` to the `useEffect` on tab switch (`activeTab === 'ledger'`).
- **Result:** User reports the issue PERSISTS.

### 8.3 Action Plan for Next Session
1. **Investigate `localDbService.ts`:** Check if it's overwriting or "seeding" Pedro Martinez with the wrong ID or if `AdminDashboard` is merging it incorrectly.
   - Force API Priority: Modify `AdminDashboard.tsx` to strictly use API data for user lookup, potentially ignoring `localDbService` completely for the Ledger view.
3. **Check Browser LocalStorage:** The user's browser might have a very old `beast_users_db` blob that needs to be nuked. Add a "Clear Cache" button or logic to the Dashboard.

## 9. State Update: BTCPay Self-Hosted Migration (2025-12-21)

### 9.1 Motivation
To enable "Hot Wallet" functionality for **Automated Payouts**, which is restricted on the public BTCPay demo server.

### 9.2 New Architecture
*   **Infrastructure:** Hostinger VPS (Ubuntu 24.04).
*   **BTCPay Instance:** Self-Hosted Docker deployment (`pay.beastreaderone.com`).
*   **Node Configuration:** Pruned Node (saving storage, ~10GB).
*   **Wallet:** Hot Wallet enabled with private seed on server.

### 9.3 Configuration Status
*   **Store:** "BeastReaderOne" created on self-hosted instance.
*   **API Connection:**
    *   Backend connected via new API Key.
    *   `.env` updated with new `BTCPAY_URL`, `BTCPAY_STORE_ID`, `BTCPAY_API_KEY`, and `BTCPAY_WEBHOOK_SECRET`.
*   **Payouts:**
    *   **Auto Pay:** Verified working. The backend correctly stages payouts on the new server, and the frontend displays the signing modal.
    *   **Instant Processing:** "Process approved payouts instantly" enabled in Store Settings.
*   **Deposits (Webhooks):**
    *   **Production:** Webhooks configured to hit `/api/webhooks/btcpay` (will work once deployed).
    *   **Localhost:** Webhooks **cannot** reach localhost directly. Local development relies on **Frontend Polling** (TicketModal) or manual triggering for simulation.

## 10. State Update: Critical Fixes & PayPal Integration (2025-12-21)

### 10.1 PayPal Integration (Completed)
*   **Backend:** Implemented `paypalService.js` for OAuth2, Order Creation (`/create-order`), and Capture (`/capture-order`) using the REST API.
*   **Security:** Server-Side integration ensures credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`) are never exposed to the client. Frontend only receives the Client ID for the SDK.
*   **UI:** Added PayPal buttons to `DepositModal` and integrated a fallback payment option directly within the `TicketModal` when funds are insufficient.
*   **Ledger:** Transactions are recorded automatically in `BeastLedger`.

### 10.2 Critical Bug Fix: Silent Ticket Charge
*   **Problem:** Generating a second ticket caused a UI freeze (invisible modal due to `animate-fade-in` bug) but allowed multiple "Silent Charges" via the "Confirm" button which remained active and clickable (despite being invisible).
*   **Solution:**
    *   **Disabled Button:** The "Confirmar y Pagar" button now has `disabled={isSaving}` to strictly prevent double-clicks/double-charges.
    *   **Z-Index & Visibility:** Removed the buggy animation and enforced `z-index: 100` to guarantee the modal is always visible on top of other elements.
    *   **Robust Reset:** Implemented `handleCloseTicketModal` in `PlaygroundApp` to explicitly clear payment flags and status while **preserving user plays**, allowing for rapid ticket regeneration without data loss.

### 10.3 Critical Fix: Invalid Track Selection
*   **Problem:** Users could generate tickets selecting only "Venezuela" or "Pulito" (indicators) without a valid lottery track, resulting in dead tickets that could never win.
*   **Solution:** Implemented loose-but-strict validation in `handleGenerateTicket`. It now requires at least one "Real" lottery track (e.g., New York, Florida) to be present. If only indicators are selected, it blocks generation and shows a descriptive error.

## 11. State Update: Data Persistence Failure (2025-12-21)

### 11.1 Problem
Tickets are not being saved to Sales, Ledger, or Audit, despite the process appearing to complete on the frontend. This is a critical data loss issue.

### 11.2 Diagnosis (Root Cause)
1.  **Transactional Block:** The Ledger acts as a strict gatekeeper. It rejects transactions with "User not found" because the `userId` sent from the frontend is missing or invalid. When the Ledger rejects the charge, the entire save process (Ticket + Audit) is aborted.
2.  **Structural Integrity:** The `Ticket` schema in MongoDB is missing the `userId` field entirely. Even if tickets were saved, they would be "orphaned" (unclaimable).

### 11.3 Remediation Plan (To be executed in next session)
1.  **Database:** Update `Ticket` schema to include `userId` (indexed).
## 12. State Update: Track Restoration & Logic Fixes (2025-12-23)

### 12.1 Pulito & Venezuela Restoration
*   **Problem:** The "Pulito" and "Venezuela" tracks were removed or broken. The "Pulito" track specifically lost its unique UI for selecting positions (1-4).
*   **Solution:**
    *   **UI Restoration:** Restored the logic in `TrackButton.tsx` to render the internal position buttons (1, 2, 3, 4) when `special/pulito` is selected.
    *   **Logic Restoration:** Updated `TrackSelector.tsx` to correctly handle mutual exclusivity (selecting one deselects the other) and enabled the correct disabled states.

### 12.2 Critical Bug Fix: Ticket Calculation
*   **Problem:** "Pulito" and "Venezuela" were being treated as standard lottery tracks in the multiplier calculation. If a user selected "New York" + "Pulito", the system calculated `2 tracks * wager`, doubling the cost.
*   **Correction:** Updated `PlaygroundApp.tsx` logic to explicitly exclude `special/pulito` and `special/venezuela` from the `effectiveTrackCount`. They are now correctly treated as **Game Mode Indicators**.
    *   **Result:** 1 Play + NY + Pulito = $1.00 (Correct).

### 12.3 Smart Default Selection
*   **feature:** The app now intelligently selects the default track based on the time of day when opened.
*   **Logic:**
    *   **Before 2:14 PM:** Defaults to `usa/ny/Midday`.
    *   **After 2:14 PM:** Defaults to `usa/ny/Evening`.
*   **Implementation:** Updated initialization logic in `PlaygroundApp.tsx` and `TrackSelector.tsx` to use the standardized IDs.

### 12.4 Real-Time Game Mode Switching
*   **Feature:** 2-digit plays ("Pick 2") now reactively switch game modes.
*   **Logic:**
    *   Enter "55" -> Shows "Pick 2".
    *   Select **Venezuela** -> Automatically updates play to "Venezuela".
    *   Select **Pulito** -> Automatically updates play to "Pulito" (prompting for position).
    *   Deselect -> Reverts to "Pick 2".
*   **Fix:** Updated `utils/helpers.ts` -> `determineGameMode` to recognize `special/pulito` and `special/venezuela` IDs, enabling the existing reactive effect in `PlaygroundApp`.

### Lessons Learned

## 13. Future Plan: Payment System Upgrade (Scheduled Post-Dec 23)

### 13.1 Objective
To resolve the "Silent Insufficient Funds" error and implement a user-centric Payment Selection flow.

### 13.2 Key Issues to Resolve
1.  **Silent Failure:** App ignores Backend 402 Error (Payment Required) because it expects 400.
2.  **Implicit UX:** Users are forced to try charging Ledger before seeing other options.

### 13.3 Implementation Blueprint
A rigorous plan has been created and saved as **`payment_upgrade_plan.md`**.
*   **Artifact Path:** `C:\Users\Admin\.gemini\antigravity\brain\3c86c843-6f4b-4843-8a32-da797cf4ebb0\payment_upgrade_plan.md`

### 13.4 Instructions for Next Session
When starting the new chat to execute this upgrade, use the following prompt:
> "Execute the Payment System Upgrade Plan documented in `payment_upgrade_plan.md` located in the artifacts folder. This involves fixing the 402 Error handling in `PlaygroundApp.tsx` and refactoring `TicketModal.tsx` to add the 'Checkout Mode' payment selector."

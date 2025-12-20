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
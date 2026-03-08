
# Active Context

## Estado Actual: v5.3.0 - Referral System Activated

**✅ ÉXITO QUIRÚRGICO:** Se completó la implementación del Sistema de Referidos Real (v2.0).
**Estado:** Estable. El sistema ahora soporta crecimiento orgánico seguro mediante enlaces de invitación y aprobación administrativa.

### 🏆 Logros Consolidados (Funcionando)
1.  **Referral System v2.0:**
    *   **Enlace de Poder:** `ReferralLinkModal` genera links únicos para reclutamiento.
    *   **Registro Público:** `RegistrationModal` permite auto-registro con `sponsorId` bloqueado.
    *   **Iron Gate (Seguridad):** Los nuevos usuarios nacen con estado `pending`.
    *   **Admin Inbox:** Pestaña 'Requests' en AdminDashboard para Aprobar/Rechazar solicitudes.
    *   **Tree of Truth:** Visualización dinámica de la red real en 'My Network' (Usuario) y 'Network' (Admin Global).

2.  **Admin Power-Up (v5.2+):**
    *   **Plays View:** Columna Player, Lógica de Estados (No Match).
    *   **Audit Hub:** Centro de auditoría centralizado.

3.  **Voice Agent Persistence & WSS Server:**
    *   **VPS Backend Shift:** Movido el motor de WebSockets (`server.js`) a un VPS para sortear las limitaciones severas de Vercel.
    *   **Proxy Stealth:** Integración del tráfico del Agente dentro de la red Docker de BTCPay Server para heredar sus certificados Let's Encrypt (`api.beastreaderone.com`).
    *   **Anti-Stuttering:** Implementación de Jitter Buffer (100ms) para un flujo de audio cristalino en redes móviles.

### 📅 Plan de Ejecución

#### FASE 3.6: Auto Pay Diagnosis & Pivot (COMPLETED/IN-PROGRESS)
**Objetivo:** Diagnóstico profundo del error 500 en retiros automáticos.
**Hallazgos Críticos (Knowledge Bank):**
1.  **BTCPay Demo Server Limitation:** El servidor público `mainnet.demo` **PROHÍBE** las Hot Wallets. No se pueden importar semillas por seguridad. Esto hace imposible el "Full Auto Pay" (firma servidor) en esta infraestructura.
2.  **Circular Economy:** El usuario descubrió que sus pruebas eran circulares (BitPay App -> BTCPay -> BitPay App). Se confirmó forensemente que la xPub de BTCPay pertenecía a su propia wallet de BitPay.
3.  **Solución "Semi-Auto":** Dado el límite del servidor, pivotamos a un flujo híbrido:
    *   **Backend:** Crea y Aprueba el pago (Staging).
    *   **Humano:** Firma la transacción final desde su App (Security Air-Gap).

#### FASE 4: Beast Ledger (Siguiente Prioridad - INMEDIATA)
**Objetivo:** Seguridad Financiera y Trazabilidad Inmutable.
1.  **Crypto Hashing:** Implementar generación de SHA-256 para cada transacción.
2.  **Parent Hash:** Encadenar transacciones (el cambio de una jugada hereda el hash del depósito).
3.  **Audit Ledger:** Visualización técnica para el Admin.

#### FASE 5: Herramientas de Estrategia
1.  **Lucky Numbers:** Generador basado en probabilidad.
2.  **Analysis:** Gráficas de calor.

#### FASE 6: Sistema de Compensación (Planificación Pendiente)
*   **Integración:** Conectar el Árbol de Jerarquía con un motor de comisiones.

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI.
2.  **Security First:** Ningún usuario puede crear a otro directamente (evita robo de identidad). Todo paso crítico requiere aprobación o hash.
3.  **Infrastructure Awareness:** Distinguir claramente entre capacidades de "Demo Server" vs "Private Server". El código debe ser resiliente a ambas configuraciones.

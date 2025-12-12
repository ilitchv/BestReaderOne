
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

### 📅 Plan de Ejecución

#### FASE 4: Beast Ledger (Siguiente Prioridad - INMEDIATA)
**Objetivo:** Seguridad Financiera y Trazabilidad Inmutable.
1.  **Crypto Hashing:** Implementar generación de SHA-256 para cada transacción.
2.  **Parent Hash:** Encadenar transacciones (el cambio de una jugada hereda el hash del depósito).
3.  **Audit Ledger:** Visualización técnica para el Admin.

#### FASE 5: Herramientas de Estrategia
1.  **Lucky Numbers:** Generador basado en probabilidad.
2.  **Analysis:** Gráficas de calor.

#### FASE 6: Sistema de Compensación (Planificación Pendiente)
*   **Integración:** Conectar el Árbol de Jerarquía con un motor de comisiones (detalles del plan de compensación pendientes de entrega por el usuario).

### 🔒 Core Architectural Decisions
1.  **Surgical Edits Only:** Prohibido reescribir archivos enteros de UI.
2.  **Security First:** Ningún usuario puede crear a otro directamente (evita robo de identidad). Todo paso crítico requiere aprobación o hash.

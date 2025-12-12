
# Working Agreement & Lessons Learned

Este documento es nuestra fuente de verdad sobre cómo colaboramos. Su propósito es evitar repetir errores y asegurar una comunicación y un flujo de trabajo eficientes.

## Mis Compromisos como IA

1.  **Flujo de Trabajo Estricto (Planificar -> Aprobar -> Actuar):**
    -   Planificar detalladamente.
    -   Esperar aprobación.
    -   Actuar quirúrgicamente.
2.  **Integridad de Archivos:** Verificaré que el código generado no elimine funcionalidades o layouts existentes inadvertidamente.

## Lecciones Aprendidas (Lessons Learned)

-   **Lección #13 (Lógica de Negocio):** **Tracks vs Modos.**
    -   **Contexto:** Jugadas en "Venezuela" o "Pulito" se quedaban en "PENDING" infinitamente.
    -   **Causa:** El sistema esperaba resultados para un track llamado "Venezuela", pero "Venezuela" es un modo de juego aplicado a un track real (ej. New York).
    -   **Solución:** Excluir explícitamente los IDs de modos de juego de la lista de `tracks` al iterar para verificar ganadores.

-   **Lección #12 (CRÍTICA - AdminDashboard Success):** **Edición Quirúrgica Validada.**
    -   **Validación:** La edición de `AdminDashboard.tsx` para mejorar la tabla de jugadas fue exitosa al modificar solo las líneas necesarias dentro de la función `flattenedPlays` y el JSX de la tabla, sin tocar el resto del archivo.
    -   **Regla:** Para archivos grandes de UI, usar *siempre* inserción/reemplazo parcial o solicitar el archivo completo actual antes de editar.

-   **Lección #11 (CRÍTICA):** **Riesgo de Reescritura Completa.**
    -   **Regla:** Nunca reescribir `PlaygroundApp.tsx` o `AdminDashboard.tsx` basándose en memoria.

-   **Lección #10 (UX/AI):** La Latencia es el Enemigo. Solución: Procesamiento por Lotes.

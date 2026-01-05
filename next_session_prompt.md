# Contexto para la Próxima Sesión: Corrección de Modales de Historial

Hola, necesito tu ayuda para finalizar dos **correcciones específicas** en los modales de historial de mi aplicación de lotería. Aquí tienes el contexto detallado de cada problema y lo que necesito que hagas:

## 1. Problema Crítico: Crash en el "Ultimate Dashboard" (`ResultsPage.tsx`)
**La Situación**:
Cuando intento abrir el historial de un resultado en el *Ultimate Dashboard*, la aplicación se rompe (pantalla de error) con el siguiente mensaje:
`TypeError: Cannot read properties of undefined (reading 'includes')`

**La Causa Técnica**:
En el archivo `components/ResultsPage.tsx`, dentro del `History Modal`, hay una línea intentando formatear la fecha así:
`res.date.includes('T') ? ...`

El problema es que la data que viene del API a veces no trae la propiedad `date` (a veces llega como `drawDate` o simplemente no existe en objetos antiguos), por lo que `res.date` es `undefined` y al intentar hacer `.includes()` explota.

**Tu Tarea**:
1.  Ve al archivo `components/ResultsPage.tsx`.
2.  Busca la sección donde se renderiza la lista del historial.
3.  Implementa una **lógica robusta** para mostrar la fecha. No asumas que `date` existe.
    *   Usa un fallback: `const rawDate = res.date || res.drawDate || fallbackString`.
    *   Asegúrate de mostrar **SOLO LA FECHA** (Ej: "Tue, Dec 23"), no la hora. Actualmente muestra la hora y eso no nos sirve.

---

## 2. Problema Visual: Estilo de Bolos en "Homepage Dashboard" (`ResultsDashboard.tsx`)
**La Situación**:
En el *Homepage Dashboard*, cuando abro el historial, los números (bolos) ya no se superponen (eso está arreglado), pero se ven **muy simples (blancos planos)** y necesito que se parezcan más a los resultados principales de las tarjetas.

**Tu Tarea**:
1.  Ve al archivo `components/ResultsDashboard.tsx`.
2.  En el renderizado de los bolos del historial:
    *   **Separación**: Asegúrate de que haya espacio entre ellos (usa `gap-2` o `gap-3`).
    *   **Color "Pick 3"**: Aquí hubo una confusión. Lo que quiero es que si la lotería es **Pick 3**, los **TRES PRIMEROS BOLOS** (indices 0, 1 y 2) tengan ese color "azul claro" (tipo Santo Domingo) para diferenciarlos claramente de los 4 dígitos de Pick 4 (que son blancos).
        *   Es decir: Pick 3 -> 3 bolos azules. Pick 4 -> 4 bolos blancos.
    *   Actualmente todos se ven blancos y quiero esa distinción visual clara.

Por favor, revisa estos dos archivos y aplica estas correcciones robustas.

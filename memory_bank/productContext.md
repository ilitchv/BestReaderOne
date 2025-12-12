
# Product Context: Beast Reader Lotto

## Problema a Resolver

Los métodos tradicionales para tomar y gestionar apuestas de lotería son manuales, lentos y propensos a errores. Los banqueros necesitan velocidad ("Rapid Fire") y precisión, cosas que el lápiz y papel no ofrecen.

## Solución Propuesta

**Beast Reader Lotto** es una plataforma digital centralizada que automatiza el proceso de apuestas con un enfoque en la velocidad extrema, la ergonomía y la inteligencia artificial.

### Diferenciadores Clave (Capabilities)

1.  **Productividad "Power User":**
    -   Diseñado para ser usado sin mouse. Flujos de teclado optimizados (Enter Loops, Tab Cycles) permiten digitar cientos de jugadas en minutos.
    -   **Wizard Híbrido:** Herramientas para generar tanto jugadas estratégicas (Run Downs 0-9) como barridos matemáticos (Secuencias), con memoria de configuración (Candados).

2.  **Lectura de Intención Visual (Visual Intent Reading):**
    -   A diferencia de un OCR estándar, nuestro sistema entiende la *estructura visual* del ticket (ej: Run Downs verticales) y la *jerga de banca* (ej: "25" = 25 centavos), traduciendo la intención humana a datos estructurados.

3.  **Inteligencia de Contexto:**
    -   El sistema sabe dónde estás. Si eliges un número de Palé pero estás en "New York", automáticamente lo etiqueta como USA, evitando errores de digitación comunes.
    -   Validación de límites en tiempo real para protección de riesgo.

4.  **Interfaz Multimodal & Fluida:**
    -   **Voz:** Entiende Español, Inglés y Creole.
    -   **Imagen:** Escanea tickets físicos complejos.
    -   **Visual:** Interfaz "Galactic" con feedback sonoro satisfactorio para confirmar cada acción.

5.  **Salida Profesional:**
    -   Genera tickets digitales (PNG/PDF) con QR único y diseño de alta fidelidad.

El objetivo es que el usuario sienta que tiene una **terminal profesional de alta velocidad** en su bolsillo.

## Reglas de Negocio Específicas

### Distinción Track vs Modo de Juego
Es crucial diferenciar entre una Lotería (Track) y un Modificador (Mode) para la visualización correcta en el ticket.

-   **TRACKS (Loterías Reales):** Deben aparecer explícitamente en el ticket.
    -   New York, Florida, Georgia, etc.
    -   **New York Horses:** Es un track legítimo (Carreras). Soporta apuestas numéricas (Pick 3, Win 4) y Single Action. **NO** soporta la modalidad "Venezuela".
-   **MODES (Modificadores):** Son "meta-tracks" que alteran la lógica de juego, no el sorteo en sí. **NO** deben aparecer en la lista de tracks del ticket.
    -   **Venezuela:** Modifica el pago (paga por posiciones derivadas 1ra/2da/3ra).
    -   **Pulito:** Modifica la posición específica de la apuesta (Pos 1-4).

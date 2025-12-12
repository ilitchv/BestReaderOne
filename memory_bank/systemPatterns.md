
# System Patterns: Beast Reader Lotto

## Arquitectura de Aplicación de Página Única (SPA) con Superposición (Overlay)

La aplicación utiliza un patrón de SPA con una superposición (overlay) para gestionar las vistas principales, evitando la complejidad y los problemas de la navegación tradicional entre páginas en este entorno.

1.  **Componente Raíz (`index.tsx`):** Controlador principal del estado.
2.  **Vista Base (`LandingPage.tsx`):** Cara pública y dashboard.
3.  **Vista Superpuesta (`PlaygroundApp.tsx`):** Herramienta principal (Modal a pantalla completa).

## Patrones de Experiencia de Usuario (UX Patterns)

### 1. El "Gran Bucle" de Navegación (The Grand Loop)
Para permitir una operación 100% por teclado en el formulario principal.
-   **Flujo:** Calendario -> Tracks -> Acciones -> Tabla de Jugadas.
-   **Cierre:** Al presionar `TAB` en el último campo de la última jugada, el foco salta programáticamente de vuelta al botón del Calendario, permitiendo ciclos infinitos de revisión y edición sin tocar el mouse.

### 2. Trampa de Foco (Focus Trap) - Modales
Garantiza que cuando un modal (Wizard, OCR) está abierto, la navegación por teclado (`TAB`) no se "escape" a la página de fondo.
-   **Implementación:** Intercepción del evento `keydown`. Si el foco está en el último elemento y se presiona `TAB`, se envía al primero. Viceversa con `Shift+TAB`.

### 3. Entrada "Rapid Fire" (Wizard)
Diseñado para banqueros que digitan a alta velocidad.
-   **Bucle Corto:** En el Wizard, la tecla `ENTER` crea un bucle cerrado exclusivo entre el campo `Bet Number` y el botón `ADD`. Esto permite ingresar `123 -> Enter -> Enter -> 456 -> Enter -> Enter` indefinidamente.
-   **Separación de Fases:** La configuración de montos (Wagers) se separa del flujo de entrada de números mediante navegación explícita.

### 4. Visualización Inversa (LIFO Display / FIFO Submit)
-   **Display:** En el Wizard, las jugadas nuevas aparecen arriba (LIFO) para que el usuario verifique visualmente lo que acaba de escribir sin hacer scroll.
-   **Submit:** Al enviar al formulario principal, el orden se invierte (FIFO) para mantener la cronología lógica (1, 2, 3...).

### 5. Procesamiento por Lotes Visual (Visual Batch Processing)
El patrón definitivo para entrada manual manuscrita ("Magic Slate").
-   **Problema:** El OCR local es rápido pero impreciso. La IA es precisa pero lenta por cada petición.
-   **Solución:**
    1.  **Snapshots:** El usuario captura imágenes instantáneas de lo que escribe.
    2.  **Stitching (Costura):** El sistema une todas las imágenes verticalmente en una sola "tira larga".
    3.  **Single-Shot AI:** Se envía una sola imagen compuesta a la IA.
    4.  **Resultado:** Latencia cero durante la escritura, precisión máxima en el procesamiento final.

## Patrones de Inteligencia de Entrada (Input Intelligence)

### 1. Ingeniería de Prompt Visual (Vision Prompting)
Para superar las limitaciones del OCR tradicional en tickets manuscritos desordenados, utilizamos instrucciones de "Intención Visual" en el prompt de Gemini (`services/geminiService.ts`).
-   **Detección Vertical:** Instruimos a la IA para buscar relaciones espaciales (arriba/abajo) que indican rangos (`000` sobre `999`) y fusionarlos en un solo token (`000-999`) antes de procesarlos.

### 2. Expansión de Secuencias (Bet Expansion Utility)
Toda entrada de texto (Chatbot, OCR, Wizard) pasa por un normalizador (`utils/helpers.ts -> expandBetSequence`) antes de entrar a la tabla.
-   **Patrón Run Down:** Convierte rangos ("12X", "120-129", "000-999") en arrays de jugadas individuales.
-   **Lógica Híbrida:** Distingue entre rotación posicional (0-9 para Run Downs clásicos) y rangos matemáticos secuenciales.

### 3. Heurística de "Sentido Común" (Common Sense Heuristic)
Para la interpretación de montos monetarios escritos a mano o dictados.
-   **Regla:** Si un número es entero y `>= 10` (ej. "25", "75"), se asume automáticamente que son **centavos** ($0.25, $0.75), desacoplándose de los límites oficiales de la banca.

### 4. Detección de Contexto (Context-Aware Logic)
El `WizardModal` y las herramientas de entrada no son estáticas; reaccionan al estado global.
-   **Asignación de Modo:** Al generar un número, el sistema consulta los `selectedTracks`. Si hay un track de USA seleccionado, fuerza el modo "Palé" (USA) sobre "Pale-RD", priorizando la lógica de negocio sobre la selección manual del usuario.

## Gestión del Estado y Persistencia

-   **Persistencia Local (`localStorage`):** Guarda el borrador del ticket actual y las preferencias de bloqueo (Candados) del Wizard.

## Patrón de Despliegue: Monolito Contenerizado (Plan "Bala de Plata")

-   **Contenedor Único:** `Dockerfile` define entorno Node.js.
-   **Build Nuclear:** `npm run build` se ejecuta explícitamente antes de `node server.js` en el comando de inicio.
-   **Servidor Híbrido:** Express sirve API `/api/*` y archivos estáticos `/dist` (con headers de no-caché para `index.html`).

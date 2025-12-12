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
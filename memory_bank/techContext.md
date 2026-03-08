
# Tech Context: Beast Reader Lotto

## Frontend

- **Frameworks y Lenguajes:**
    - React: v19.2.0 (a través de aistudiocdn)
    - TypeScript
    - HTML5 / CSS3
- **Estilos:**
    - Tailwind CSS (vía CDN)
- **APIs y Librerías Externas:**
    - @google/genai: v1.29.0 (SDK de Gemini)
    - Web Speech API (Nativa del navegador)
    - html2canvas: v1.4.1
    - qrcode.js: v1.0.0
    - lucide (Iconos vía CDN)

## Backend

- **Entorno de Ejecución:**
    - Node.js (v20+ recomendado)
- **Framework de Servidor:**
    - Express.js
- **Base de Datos:**
    - MongoDB (a través del servicio en la nube MongoDB Atlas)
- **ODM (Object Data Modeling):**
    - Mongoose (para interactuar con MongoDB)
- **Middleware:**
    - `cors` (para permitir peticiones desde el frontend)
    - `dotenv` (para gestionar variables de entorno)

## Infraestructura y Despliegue (Plan Bala de Plata)

-   **Frontend:** Vercel (Serverless Functions y Hosting Estático).
-   **Voice Agent Backend:** Desplegado en un VPS dedicado (Hostinger) usando `pm2` para soportar conexiones persistentes WebSocket (`wss://`). El tráfico se enruta a través de un micro-proxy TCP (`socat`) conectado a la red interna Docker de BTCPay Server, lo que permite la asignación automática de certificados SSL Let's Encrypt para `api.beastreaderone.com`.

## Entorno de Desarrollo y Build

- **Frontend:** La aplicación se desarrolla y ejecuta en un entorno que provee las dependencias a través de un `importmap` en `index.html`.
- **Backend:** Es un proyecto Node.js estándar, gestionado con `package.json`. Se ejecuta con el comando `node server.js`.
- **API Key:** La clave de la API de Gemini se obtiene de `process.env.API_KEY` en el frontend, asumida como configurada en el entorno de ejecución. La URI de la base de datos se gestiona a través de un archivo `.env` en el backend.

## Lecciones de Despliegue (Vercel)

- **Plataforma:** Vercel (Migrado desde Cloud Run conceptualmente).
- **Configuración:**
    - `vercel.json` maneja rewrites para SPA y API.
    - `api/index.js` delega a `server.js` (Root) como Serverless Function.
    - **Importante:** Todos los archivos (especialmente `package.json` y `package-lock.json`) deben estar trackeados en Git para que los builds automáticos funcionen.
- **Dependencias:**
    - Conflicto detectado entre `react@19` y `lucide-react` (requiere React 16-18). Solución: Downgrade a `react@18.2.0`.
- **Variables de Entorno:**
    - `MONGODB_URI` debe configurarse manualmente en Vercel Project Settings (no se sube en `.env`).
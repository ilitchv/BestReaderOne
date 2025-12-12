
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

-   **Containerización:** **Docker**. Se utiliza un `Dockerfile` multi-etapa (o simplificado) para construir la aplicación.
-   **Plataforma Nube:** **Google Cloud Run**.
-   **Estrategia:** La aplicación se construye dentro del contenedor. El servidor Express sirve tanto la API como los archivos estáticos del frontend compilado.
-   **Puerto:** El contenedor expone el puerto `8080` (estándar de Cloud Run).

## Entorno de Desarrollo y Build

- **Frontend:** La aplicación se desarrolla y ejecuta en un entorno que provee las dependencias a través de un `importmap` en `index.html`.
- **Backend:** Es un proyecto Node.js estándar, gestionado con `package.json`. Se ejecuta con el comando `node server.js`.
- **API Key:** La clave de la API de Gemini se obtiene de `process.env.API_KEY` en el frontend, asumida como configurada en el entorno de ejecución. La URI de la base de datos se gestiona a través de un archivo `.env` en el backend.
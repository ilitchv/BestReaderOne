# Guía de Migración a VPS Hostinger (Ubuntu 24.04)

Esta guía te permitirá mover tu proyecto `SniperStrategy` desde tu PC local a tu servidor VPS, asegurando que los scrapers corran 24/7.

## Requisitos Previos
*   Acceso a la terminal de tu PC (PowerShell).
*   La IP de tu VPS (Visible en Hostinger): `168.231.71.31` (Según tu captura).
*   La contraseña `root` de tu VPS.

---

## Paso 1: Preparar el VPS (Instalación de Dependencias)

Conéctate a tu VPS (usa PowerShell en tu PC):
```powershell
ssh root@168.231.71.31
# Escribe "yes" si te pregunta por fingerprint.
# Ingresa tu contraseña de root cuando la pida (no se verán los asteriscos).
```

Una vez dentro del VPS, copia y pega estos bloques de comandos para preparar todo:

### 1.1 Actualizar e Instalar Node.js (v22)
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 22 (Repo oficial)
curl -fsSL https://deb.nodesource.com/setup_22.x | -E bash -
apt install -y nodejs

# Verificar instalación
node -v 
# Debería decir v22.x.x
```

### 1.2 Instalar PM2 (Gestor de Procesos)
PM2 mantendrá tu aplicación viva por siempre.
```bash
npm install -g pm2
```

### 1.3 Instalar Librerías para Chrome Headless (Crucial para Instant Cash)
Ubuntu Server viene "pelado" y no tiene las librerías gráficas que Puppeteer necesita. Instálalas así:
```bash
apt install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

---

## Paso 2: Preparar y Subir tu Código

### 2.1 En TU PC LOCAL (PowerShell)
Navega a la carpeta de tu proyecto y crea un archivo comprimido (excluyendo cosas pesadas e innecesarias):

```powershell
# Asegúrate de estar en la carpeta del proyecto
cd c:\Users\Admin\Desktop\SniperStrategyProject

# Comprimir todo EXCEPTO node_modules y .git (para que suba rápido)
Compress-Archive -Path * -DestinationPath beast-reader-deploy.zip -Force
```
*Nota: Si el comando falla por archivos en uso, ciérralos o ignora errores menores.*

### 2.2 Subir el Archivo al VPS
Usa `scp` (Secure Copy) para mandar el archivo:
```powershell
scp beast-reader-deploy.zip root@168.231.71.31:/root/
```

---

## Paso 3: Desplegar en el VPS

Vuelve a tu terminal SSH del VPS (donde estás conectado como root).

```bash
# Crear carpeta para la app
mkdir -p /var/www/beast-reader
cd /var/www/beast-reader

# Mover el zip y descomprimir (Instala unzip si falta: apt install unzip)
mv /root/beast-reader-deploy.zip .
apt install -y unzip
unzip beast-reader-deploy.zip
rm beast-reader-deploy.zip

# Instalar dependencias del proyecto
npm install
# Esto tardará un poco, está bajando Puppeteer y todo.
```

---

## Paso 4: Configuración Final y Ejecución

### 4.1 Variables de Entorno
Crea tu archivo `.env` en el servidor con tus credenciales reales (Mongo, etc).
```bash
nano .env
```
*   Pega el contenido de tu `.env` local.
*   Presiona `Ctrl+X`, luego `Y`, y `Enter` para guardar.

### 4.2 Iniciar con PM2
```bash
# Iniciar el servidor
pm2 start server.js --name "beast-backend"

# Ver que esté corriendo
pm2 status
pm2 logs beast-backend
```

### 4.3 (Opcional) Hacer que inicie con Windows/Reinicio
```bash
pm2 save
pm2 startup
# Copia y pega el comando que te muestre la salida de pm2 startup
```

---

## Resumen de Comandos Útiles (Futuro)

*   **Ver logs en vivo**: `pm2 logs beast-backend`
*   **Reiniciar servidor**: `pm2 restart beast-backend`
*   **Detener servidor**: `pm2 stop beast-backend`

¡Listo! Una vez hagas esto, puedes apagar tu PC y el VPS seguirá recolectando datos de Instant Cash y Top Pick sin interrupciones.

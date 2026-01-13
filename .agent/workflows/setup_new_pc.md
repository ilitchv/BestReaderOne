---
description: How to set up the project on a new computer (Secondary PC)
---

# Setup Guide for Secondary PC

This guide is for when you switch to the other computer.

## Prerequisites
1.  **Node.js** installed.
2.  **Git** installed.
3.  **The `.env` file** (Manually transferred from the main PC).

## Step-by-Step Instructions

### 1. Get the Code
Open your terminal in the folder where you want the project.

```powershell
# Clone the repository (if first time)
git clone https://github.com/ilitchv/BestReaderOne.git .

# OR Pull latest changes (if already cloned)
git pull origin main
```

### 2. Install Dependencies
This installs all the libraries (regenerates `node_modules`).

```powershell
npm install
```

### 3. Configure Secrets (CRITICAL)
*   **Action**: Copy the `.env` file you brought from the other PC into this folder.
*   **Verify**: Ensure it contains the `MONGODB_URI` pointing to Atlas (`mongodb+srv://...`).

### 4. Build the Frontend
Compile the React code for production.

```powershell
npm run build
```

### 5. Start the Server
Run the application.

```powershell
node server.js
```

## Agent Instructions
When you are on the new PC, just tell me: **"Execute the New PC Setup workflow"**.
I will then run the commands for you (except the `.env` copy, which you must do).

 <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Login - Beast Reader</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Poppins:wght@400;700&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link href="styles.css" rel="stylesheet">
    <style>
        /* Centrar el formulario de login */
        .login-container {
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #121212; /* Fondo oscuro completo */
        }

        /* Estilos adicionales para el formulario */
        .login-card {
            background-color: #1e1e1e;
            border: 1px solid var(--color-neon-cian);
            border-radius: 15px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
            padding: 30px;
            width: 100%;
            max-width: 400px;
            transition: transform 0.3s ease;
        }

        .login-card.shake {
            animation: shake 0.5s;
        }

        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            50% { transform: translateX(10px); }
            75% { transform: translateX(-10px); }
            100% { transform: translateX(0); }
        }

        .login-title {
            margin-bottom: 20px;
            color: var(--color-neon-cian);
            text-align: center;
            text-shadow: 0 0 10px var(--color-neon-cian);
            font-size: 2rem;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
        }

        .form-label {
            color: var(--color-texto);
            font-size: 1.1rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
        }

        .form-control, .form-select {
            background-color: #0a0a0a;
            color: var(--color-texto);
            border: 1px solid var(--color-neon-cian);
            font-size: 1rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 400;
        }

        .form-control::placeholder {
            color: var(--color-placeholder);
        }

        .btn-login {
            background-color: var(--color-neon-verde);
            color: #000;
            box-shadow: 0 0 10px var(--color-neon-verde), 0 0 20px var(--color-neon-verde);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            font-size: 1.1rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
        }

        .btn-login:hover {
            transform: scale(1.05);
            box-shadow: 0 0 20px var(--color-neon-verde), 0 0 30px var(--color-neon-verde);
        }

        .error-message {
            color: #ff0044;
            margin-top: 10px;
            text-align: center;
            display: none;
            font-size: 1rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
        }

        /* Estilos para el enlace de recuperación de contraseña */
        .forgot-password {
            margin-top: 15px;
            text-align: center;
        }

        .forgot-password a {
            color: var(--color-neon-cian);
            text-decoration: none;
            font-size: 0.95rem;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
        }

        .forgot-password a:hover {
            text-decoration: underline;
        }

        /* Contenedor para el campo de contraseña con el ícono de mostrar/ocultar */
        .password-container {
            position: relative;
        }

        .toggle-password {
            position: absolute;
            top: 50%;
            right: 15px;
            transform: translateY(-50%);
            cursor: pointer;
            color: var(--color-neon-cian);
            font-size: 1.2rem;
        }

        /* Ajustes para dispositivos móviles */
        @media (max-width: 576px) {
            .login-card {
                padding: 20px;
            }

            .login-title {
                font-size: 1.5rem;
            }

            .btn-login {
                width: 100%;
                font-size: 1rem;
            }

            .form-label {
                font-size: 1rem;
            }

            .error-message {
                font-size: 0.9rem;
            }
        }
    </style>
    <!-- Verificación de Autenticación -->
    <script>
        // Mostrar el contenido solo si el usuario no está autenticado
        document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('token');
            if (token) {
                window.location.href = 'dashboard.html';
            } else {
                // Mostrar el contenido
                document.body.style.display = 'block';
            }
        });
    </script>
</head>
<body style="display: none;">
    <div class="login-container">
        <div class="login-card" id="loginCard">
            <h2 class="login-title">Iniciar Sesión</h2>
            <form id="loginForm">
                <div class="mb-3">
                    <label for="username" class="form-label">Usuario</label>
                    <input type="text" class="form-control glow-input" id="username" placeholder="Ingresa tu usuario" required>
                </div>
                <div class="mb-3">
                    <label for="password" class="form-label">Contraseña</label>
                    <div class="password-container">
                        <input type="password" class="form-control glow-input" id="password" placeholder="Ingresa tu contraseña" required>
                        <i class="bi bi-eye toggle-password" id="togglePassword"></i>
                    </div>
                </div>
                <button type="submit" class="btn btn-login w-100">
                    <i class="bi bi-box-arrow-in-right me-2"></i> Iniciar Sesión
                </button>
                <div class="error-message" id="errorMessage">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i> Usuario o contraseña incorrectos.
                </div>
                <div class="forgot-password">
                    <a href="recover_password.html">¿Olvidaste tu contraseña?</a>
                </div>
            </form>
        </div>
    </div>

    <!-- Librerías JavaScript -->
    <!-- jQuery (opcional, si lo usas en tus scripts) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Popper.js -->
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js"></script>
    <!-- Custom JavaScript -->
    <script src="login.js"></script>
    <script>
        // Funcionalidad para mostrar/ocultar contraseña
        document.getElementById('togglePassword').addEventListener('click', function () {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Cambiar el ícono
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });

        // Manejo de errores desde login.js
        // Modificar login.js para manejar los errores sin alert() y mostrar el mensaje en la página
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('loginForm');
            const errorMessage = document.getElementById('errorMessage');
            const loginCard = document.getElementById('loginCard');

            // Verificar si el usuario ya está autenticado
            const token = localStorage.getItem('token');
            if (token) {
                // Redirigir a dashboard.html si el token existe
                window.location.href = 'dashboard.html';
                return; // Salir de la función para evitar agregar el listener del formulario
            }

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();

                try {
                    const response = await fetch('https://loteria-backend-j1r3.onrender.com/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // Agregar console.log para verificar los datos recibidos
                       console.log('Datos recibidos del backend:', data);
                     
  // Guardar el token y el rol del usuario en el almacenamiento local
  localStorage.setItem('token', data.token);
  localStorage.setItem('userRole', data.role); // Usamos 'userRole' y 'data.role' como vienen del backend
  // Redirigir a la página dashboard.html
  window.location.href = 'dashboard.html';
} else {
                        // Manejo de errores
                        const errorMsg = data.msg || 'Credenciales inválidas.';
                        showError(errorMsg);
                    }
                } catch (error) {
                    console.error('Error al iniciar sesión:', error);
                    showError('Ocurrió un error al iniciar sesión. Intenta nuevamente más tarde.');
                }
            });

            function showError(message) {
                errorMessage.innerText = `⚠️ ${message}`;
                errorMessage.style.display = 'block';
                // Agregar efecto de sacudida
                loginCard.classList.add('shake');
                setTimeout(() => {
                    loginCard.classList.remove('shake');
                }, 500);
            }
        });
    </script>
</body>
</html>

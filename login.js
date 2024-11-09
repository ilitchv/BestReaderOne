 // login.js

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
                // Guardar el token en el almacenamiento local
                localStorage.setItem('token', data.token);
                localStorage.setItem('tipoUsuario', data.tipoUsuario); // Asegúrate de que el backend envíe 'tipoUsuario'
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

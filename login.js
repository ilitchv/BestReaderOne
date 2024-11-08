 // login.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');

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
                // Redirigir a la página dashboard.html
                window.location.href = 'dashboard.html';
            } else {
                // Manejo de errores
                const errorMsg = data.msg || 'Credenciales inválidas.';
                alert('Error: ' + errorMsg);
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            alert('Ocurrió un error al iniciar sesión. Intenta nuevamente más tarde.');
        }
    });
});

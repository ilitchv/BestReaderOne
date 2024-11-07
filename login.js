// login.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

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
        alert('Inicio de sesión exitoso. ¡Bienvenido!');
        // Redirigir a la página principal o dashboard
        window.location.href = 'dashboard.html'; // Reemplaza con la página que corresponda
      } else {
        alert('Error: ' + (data.msg || 'Credenciales inválidas.'));
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      alert('Ocurrió un error al iniciar sesión. Intenta nuevamente más tarde.');
    }
  });
});

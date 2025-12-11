// reset_password.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const resetCard = document.getElementById('resetCard');

    // Obtener el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showError('Token inválido o expirado.');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            showError('Las contraseñas no coinciden.');
            return;
        }

        // Limpiar mensajes anteriores
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        try {
            const response = await fetch('https://loteria-backend-j1r3.onrender.com/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                successMessage.style.display = 'block';
                // Limpiar el formulario
                form.reset();
                // Opcional: Redirigir al login después de unos segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                const errorMsg = data.msg || 'Ocurrió un error al restablecer la contraseña.';
                showError(errorMsg);
            }
        } catch (error) {
            console.error('Error al restablecer la contraseña:', error);
            showError('Ocurrió un error al restablecer la contraseña. Intenta nuevamente más tarde.');
        }
    });

    function showError(message) {
        errorMessage.innerText = `⚠️ ${message}`;
        errorMessage.style.display = 'block';
        // Agregar efecto de sacudida
        resetCard.classList.add('shake');
        setTimeout(() => {
            resetCard.classList.remove('shake');
        }, 500);
    }
});

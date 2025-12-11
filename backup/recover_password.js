 // recover_password.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recoverForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const recoverCard = document.getElementById('recoverCard');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();

        // Limpiar mensajes anteriores
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        try {
            const response = await fetch('https://loteria-backend-j1r3.onrender.com/api/auth/recover-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                successMessage.innerText = 'Si el correo está registrado, se enviarán las instrucciones.';
                successMessage.style.display = 'block';
                form.reset();
            } else {
                const errorMsg = data.msg || 'Ocurrió un error al enviar las instrucciones.';
                showError(errorMsg);
            }
        } catch (error) {
            console.error('Error al enviar las instrucciones:', error);
            showError('Ocurrió un error al enviar las instrucciones. Intenta nuevamente más tarde.');
        }
    });

    function showError(message) {
        errorMessage.innerText = `⚠️ ${message}`;
        errorMessage.style.display = 'block';
        // Agregar efecto de sacudida
        recoverCard.classList.add('shake');
        setTimeout(() => {
            recoverCard.classList.remove('shake');
        }, 500);
    }
});

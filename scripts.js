 $(document).ready(function() {
    // Variables globales
    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let paymentCompleted = false;
    let totalJugadasGlobal = 0;
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/YOUR_SHEETDB_API_KEY'; // Reemplaza con tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api/jugadas'; // Asegúrate de que esta es la URL correcta

    // Inicializar variables de roles y horarios (asegúrate de definir estas variables según tu lógica)
    window.userRole = 'user'; // Esto debe ser definido dinámicamente según el usuario
    const horariosCierre = {
        USA: {
            // Define los horarios de cierre para cada track de USA
            "Track1": "23:55",
            "Track2": "23:55",
            // Agrega más tracks según sea necesario
        },
        "Santo Domingo": {
            // Define los horarios de cierre para cada track de Santo Domingo
            "TrackSD1": "23:55",
            "TrackSD2": "23:55",
            // Agrega más tracks según sea necesario
        },
        Venezuela: {
            // Define los horarios de cierre para cada track de Venezuela si es necesario
            "TrackV1": "23:55",
            // Agrega más tracks según sea necesario
        }
    };
    const limitesApuesta = {
        // Define los límites de apuesta para cada modalidad
        "Pulito": { straight: 1000, box: 500 },
        "Pulito-Combinado": { straight: 1000, box: 500, combo: 300 },
        "Venezuela": { straight: 1500 },
        "Win 4": { straight: 2000, box: 1000, combo: 600 },
        "Peak 3": { straight: 1800, box: 900, combo: 500 },
        "Combo": { combo: 700 },
        "RD-Quiniela": { straight: 1200 },
        "RD-Pale": { straight: 1200 },
        // Agrega más modalidades según sea necesario
    };

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // **Credenciales de Square**
    const applicationId = 'sandbox-sq0idb-p0swM4gk8BWYR12HlUj4SQ'; // Reemplaza con Production ID si es necesario
    const locationId = 'L66P47FWVDFJS'; // Reemplaza con Production ID si es necesario

    // Función para resaltar números duplicados
    function resaltarDuplicados() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();

        camposNumeros.forEach(campo => {
            const valor = campo.value.trim();
            if (valor) {
                if (valores[valor]) {
                    duplicados.add(valor);
                } else {
                    valores[valor] = true;
                }
            }
        });

        camposNumeros.forEach(campo => {
            if (duplicados.has(campo.value.trim())) {
                campo.classList.add('duplicado');
            } else {
                campo.classList.remove('duplicado');
            }
        });
    }

    // Función para agregar listeners a los campos de número apostado
    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // Función para reiniciar el formulario
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        $("#tablaJugadas tr").each(function() {
            actualizarPlaceholders("-", $(this));
        });
        resaltarDuplicados();
        paymentCompleted = false;
    }

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracks);
        console.log("Días seleccionados:", selectedDays);

        if (selectedDays === 0) {
            total = 0;
        } else {
            total = (total * selectedTracks * selectedDays).toFixed(2);
        }
        console.log("Total después de multiplicar:", total);
        $("#totalJugadas").text(total);
    }

    // Función para calcular el número de combinaciones posibles
    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        let factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            if (counts.hasOwnProperty(digit)) {
                denominator *= factorial(counts[digit]);
            }
        }
        return factorial(totalDigits) / denominator;
    }

    // Función para actualizar placeholders (asegúrate de definir esta función según tu lógica)
    function actualizarPlaceholders(value, fila) {
        fila.find(".numeroApostado").attr("placeholder", value);
        fila.find(".straight").attr("placeholder", value);
        fila.find(".box").attr("placeholder", value);
        fila.find(".combo").attr("placeholder", value);
    }

    // Función para agregar una nueva jugada (asegúrate de definir esta función según tu lógica)
    function agregarJugada() {
        jugadaCount++;
        const fila = `
            <tr>
                <td>${jugadaCount}</td>
                <td><input type="text" class="numeroApostado form-control" maxlength="4" /></td>
                <td class="tipoJuego">-</td>
                <td><input type="number" class="straight form-control" min="0" step="0.01" /></td>
                <td><input type="text" class="box form-control" /></td>
                <td><input type="number" class="combo form-control" min="0" step="0.01" /></td>
                <td class="total">0.00</td>
            </tr>
        `;
        $("#tablaJugadas").append(fila);
        agregarListenersNumeroApostado();
        resaltarDuplicados();
    }

    // Función para recopilar datos de las jugadas
    function recopilarDatosJugadas(ticketNumber) {
        const transactionDateTime = dayjs().format('MM-DD-YYYY hh:mm A');
        const betDates = $("#ticketFecha").text();
        const tracks = $("#ticketTracks").text();
        const totalTicket = $("#ticketTotal").text();
        const timestamp = new Date().toISOString();

        const jugadasData = [];

        $("#tablaJugadas tr").each(function() {
            const jugadaNumber = generarNumeroUnico();
            const jugadaData = {
                "Ticket Number": ticketNumber,
                "Transaction DateTime": transactionDateTime,
                "Bet Dates": betDates,
                "Tracks": tracks,
                "Bet Number": $(this).find("td").eq(1).find("input").val(),
                "Game Mode": $(this).find("td").eq(2).text(),
                "Straight ($)": $(this).find("td").eq(3).find("input").val(),
                "Box ($)": $(this).find("td").eq(4).find("input").val() !== "" ? $(this).find("td").eq(4).find("input").val() : "",
                "Combo ($)": $(this).find("td").eq(5).find("input").val() !== "" ? $(this).find("td").eq(5).find("input").val() : "",
                "Total ($)": $(this).find("td").eq(6).text(),
                "Payment Method": "",
                "Jugada Number": jugadaNumber,
                "Timestamp": timestamp
            };
            jugadasData.push(jugadaData);
        });

        return jugadasData;
    }

    // Función para enviar datos a SheetDB y al Backend
    function enviarFormulario(datos, callback) {
        // Enviar a SheetDB
        const sheetDBRequest = $.ajax({
            url: SHEETDB_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Enviar al Backend
        const backendRequest = $.ajax({
            url: BACKEND_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Esperar a que ambas solicitudes se completen
        $.when(sheetDBRequest, backendRequest).done(function(sheetDBResponse, backendResponse) {
            console.log("Datos enviados a ambos destinos:");
            console.log("SheetDB:", sheetDBResponse[0]);
            console.log("Backend:", backendResponse[0]);

            // Verificar si el backend devuelve 'ticketNumber'
            if (backendResponse[0] && backendResponse[0].ticketNumber) {
                const ticketNumber = backendResponse[0].ticketNumber;
                console.log("Ticket Number recibido del backend:", ticketNumber);
                if (callback) callback(true, ticketNumber);
            } else {
                console.error("El backend no devolvió 'ticketNumber'.");
                showAlert("Error al generar el ticket. Por favor, inténtalo de nuevo.", "danger");
                if (callback) callback(false, null);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error al enviar datos:", textStatus, errorThrown);
            console.error("Detalles del Error:", jqXHR.responseText);
            showAlert("Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.", "danger");
            if (callback) callback(false, null);
        });
    }

    // Función para mostrar alertas
    function showAlert(message, type) {
        const alertHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>`;
        $("#ticketAlerts").html(alertHTML);
    }

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Función para obtener la hora límite de un track
    function obtenerHoraLimite(track) {
        for (let region in horariosCierre) {
            if (horariosCierre[region][track]) {
                return horariosCierre[region][track];
            }
        }
        return null;
    }

    // Función para calcular y mostrar las horas límite junto a cada track
    function mostrarHorasLimite() {
        $(".cutoff-time").each(function() {
            const track = $(this).data("track");

            if (track === 'Venezuela') {
                $(this).hide();
                return;
            }
            let cierreStr = "";
            if (horariosCierre.USA[track]) {
                cierreStr = horariosCierre.USA[track];
            }
            else if (horariosCierre["Santo Domingo"][track]) {
                cierreStr = horariosCierre["Santo Domingo"][track];
            }
            else if (horariosCierre.Venezuela[track]) {
                cierreStr = horariosCierre.Venezuela[track];
            }
            if (cierreStr) {
                const cierre = new Date(`1970-01-01T${cierreStr}:00`);
                cierre.setMinutes(cierre.getMinutes() - 5); // 5 minutos antes
                const horas = cierre.getHours().toString().padStart(2, '0');
                const minutos = cierre.getMinutes().toString().padStart(2, '0');
                const horaLimite = `${horas}:${minutos}`;
                $(this).text(`Hora límite: ${horaLimite}`);
            }
        });
    }

    // Inicializar las horas límite al cargar la página
    mostrarHorasLimite();

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Limpiar alertas anteriores
        $("#ticketAlerts").empty();

        // Validar formulario
        const fecha = $("#fecha").val();
        console.log("Valor de fecha:", fecha);
        if (!fecha) {
            showAlert("Por favor, selecciona una fecha.", "warning");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        if (!tracks || tracks.length === 0) {
            showAlert("Por favor, selecciona al menos un track.", "warning");
            return;
        }

        // Validar que si se seleccionó el track "Venezuela", se haya seleccionado al menos un track de USA
        const tracksUSASeleccionados = tracks.filter(track => Object.keys(horariosCierre.USA).includes(track));
        if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
            showAlert("Para jugar en la modalidad 'Venezuela', debes seleccionar al menos un track de USA además de 'Venezuela'.", "warning");
            return;
        }

        // Validar fechas y horas límite
        const fechasArray = fecha.split(", ");
        const fechaActual = new Date();
        const yearActual = fechaActual.getFullYear();
        const monthActual = fechaActual.getMonth();
        const dayActual = fechaActual.getDate();
        const fechaActualSinHora = new Date(yearActual, monthActual, dayActual);

        for (let fechaSeleccionadaStr of fechasArray) {
            // Extraer los componentes de la fecha seleccionada
            const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
            const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);

            if (fechaSeleccionada.getTime() === fechaActualSinHora.getTime()) {
                // La fecha seleccionada es hoy, aplicar validación de hora
                const horaActual = new Date();
                for (let track of tracks) {
                    if (track === 'Venezuela') continue; // Excluir "Venezuela" de la validación de hora

                    const horaLimiteStr = obtenerHoraLimite(track);
                    if (horaLimiteStr) {
                        const [horas, minutos] = horaLimiteStr.split(":");
                        const horaLimite = new Date();
                        horaLimite.setHours(parseInt(horas), parseInt(minutos) - 5, 0, 0); // Restamos 5 minutos
                        if (horaActual > horaLimite) {
                            showAlert(`El track "${track}" ya ha cerrado para hoy. Por favor, selecciona otro track o fecha.`, "danger");
                            return;
                        }
                    }
                }
            }
        }

        // Validar jugadas
        let jugadasValidas = true;
        $("#tablaJugadas tr").each(function() {
            const numero = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            if (!numero || (numero.length < 2 || numero.length > 4)) {
                jugadasValidas = false;
                showAlert("Por favor, ingresa números apostados válidos (2, 3 o 4 dígitos).", "danger");
                return false;
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                showAlert("Por favor, selecciona una modalidad de juego válida.", "danger");
                return false;
            }

            // Validar tracks requeridos por modalidad
            let tracksRequeridos = [];

            if (["Win 4", "Peak 3", "Pulito", "Pulito-Combinado", "Venezuela"].includes(modalidad)) {
                // Modalidades que requieren tracks de USA
                tracksRequeridos = Object.keys(horariosCierre.USA);
            } else if (["RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                // Modalidades que requieren tracks de Santo Domingo
                tracksRequeridos = Object.keys(horariosCierre["Santo Domingo"]);
            } else {
                // Modalidad no reconocida o no requiere validación específica
                tracksRequeridos = [];
            }

            // Verificar si al menos uno de los tracks requeridos está seleccionado
            const tracksSeleccionadosParaModalidad = tracks.filter(track => tracksRequeridos.includes(track));

            if (tracksRequeridos.length > 0 && tracksSeleccionadosParaModalidad.length === 0) {
                jugadasValidas = false;
                showAlert(`La jugada con modalidad "${modalidad}" requiere al menos un track seleccionado correspondiente.`, "danger");
                return false; // Salir del bucle
            }

            if (["Venezuela", "Venezuela-Pale", "Pulito", "Pulito-Combinado", "RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                if (straight <= 0) {
                    jugadasValidas = false;
                    showAlert("Por favor, ingresa al menos una apuesta en Straight.", "danger");
                    return false;
                }
                if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
                    const box = $(this).find(".box").val().trim();
                    const acceptableBoxValues = ["1", "2", "3"];
                    const acceptableBoxCombinations = ["1,2", "2,3", "1,3", "1,2,3"];
                    const allAcceptableValues = acceptableBoxValues.concat(acceptableBoxCombinations);
                    if (!allAcceptableValues.includes(box)) {
                        jugadasValidas = false;
                        showAlert("En la modalidad Pulito o Pulito-Combinado, el campo 'Box' debe ser 1, 2, 3, 1,2, 2,3, 1,3 o 1,2,3.", "danger");
                        return false;
                    }
                }
            } else if (["Win 4", "Peak 3"].includes(modalidad)) {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                const boxVal = $(this).find(".box").val();
                const box = boxVal !== "" ? parseFloat(boxVal) : 0;
                const combo = parseFloat($(this).find(".combo").val()) || 0;
                if (straight <= 0 && box <= 0 && combo <= 0) {
                    jugadasValidas = false;
                    showAlert(`Por favor, ingresa al menos una apuesta en Straight, Box o Combo para ${modalidad}.`, "danger");
                    return false;
                }
            }
            // Validar límites
            if (limitesApuesta[modalidad]) {
                if (parseFloat($(this).find(".straight").val()) > (limitesApuesta[modalidad].straight || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Straight excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
                if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado" && parseFloat($(this).find(".box").val()) > (limitesApuesta[modalidad].box || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Box excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
                if (limitesApuesta[modalidad].combo !== undefined && parseFloat($(this).find(".combo").val()) > (limitesApuesta[modalidad].combo || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Combo excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
            }
        });
        if (!jugadasValidas) {
            return;
        }

        // Preparar datos para el ticket
        const tracksTexto = tracks.join(", ");
        $("#ticketTracks").text(tracksTexto);
        $("#ticketJugadas").empty();
        $("#tablaJugadas tr").each(function() {
            const num = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal = $(this).find(".box").val();
            const box = boxVal !== "" ? boxVal : "-";
            const comboVal = $(this).find(".combo").val();
            const combo = comboVal !== "" ? parseFloat(comboVal) : "-";
            const total = parseFloat($(this).find(".total").text()) || 0;
            const fila = ` 
                <tr>
                    <td>${$(this).find("td").first().text()}</td>
                    <td>${num}</td>
                    <td>${modalidad}</td>
                    <td>${straight.toFixed(2)}</td>
                    <td>${box !== "-" ? box : "-"}</td>
                    <td>${combo !== "-" ? combo.toFixed(2) : "-"}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>
            `;
            $("#ticketJugadas").append(fila);
        });
        $("#ticketTotal").text($("#totalJugadas").text());

        // Generar número de ticket único de 8 dígitos (temporario hasta recibir del backend)
        const numeroTicket = generarNumeroUnico();
        $("#numeroTicket").text(numeroTicket);

        // Generar la fecha y hora de transacción
        const fechaTransaccion = dayjs().format('MM-DD-YYYY hh:mm A');
        $("#ticketTransaccion").text(fechaTransaccion);

        // Generar código QR
        $("#qrcode").empty(); // Limpiar el contenedor anterior
        new QRCode(document.getElementById("qrcode"), {
            text: numeroTicket,
            width: 128,
            height: 128,
        });

        // Mostrar las fechas de apuesta en el ticket
        $("#ticketFecha").text(fecha);
        console.log("Fechas asignadas a #ticketFecha:", $("#ticketFecha").text());

        // Calcular el total global
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Recopilar datos de las jugadas
        const jugadasData = recopilarDatosJugadas(numeroTicket);

        // Guardar las jugadas en una variable global para referencia posterior
        window.jugadasDataGlobal = jugadasData;

        // Enviar los datos al backend y SheetDB
        enviarFormulario(jugadasData, function(success, backendTicketNumber) {
            if (success) {
                console.log(`Ticket Number recibido: ${backendTicketNumber}`);
                // Asignar el ticketNumber correcto
                $("#numeroTicket").text(backendTicketNumber);
                $("#ticketJugadas tr").each(function(index) {
                    $(this).find("td").eq(0).text(index + 1); // Actualizar jugadaCount si es necesario
                });
                // Mostrar el modal aquí después de recibir el ticketNumber
                ticketModal.show();
            } else {
                showAlert("Error al enviar los datos. Por favor, inténtalo de nuevo.", "danger");
            }
        });
    });

    // Evento para iniciar el pago desde el modal
    $("#iniciarPago").click(function() {
        if (window.userRole !== 'user') {
            // Para otros roles, asumimos pago en efectivo
            const ticketNumber = $("#numeroTicket").text();
            confirmarYGuardarTicket('Efectivo', ticketNumber);
            return;
        }

        // Obtener el total global
        const totalAmount = parseFloat($("#totalJugadas").text());

        // Inicializar Cash App Pay
        initializeCashAppPay(totalAmount);
    });

    // Función para inicializar Cash App Pay utilizando el SDK de Square
    async function initializeCashAppPay(totalAmount) {
        console.log('Inicializando Cash App Pay con total:', totalAmount);
        if (!window.Square) {
            showAlert('El SDK de Square no se cargó correctamente.', 'danger');
            console.error('Square SDK no está disponible.');
            return;
        }

        // Verificar que applicationId y locationId no sean undefined
        if (!applicationId || !locationId) {
            console.error('applicationId o locationId son undefined.');
            showAlert('Error en las credenciales de Square. Por favor, contacta al administrador.', 'danger');
            return;
        }

        try {
            const payments = window.Square.payments(applicationId, locationId);

            const paymentRequest = payments.paymentRequest({
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    amount: totalAmount.toFixed(2),
                    label: 'Total',
                },
            });

            const options = {
                redirectURL: window.location.origin + window.location.pathname + '?payment=success&referenceId=' + Date.now(),
                referenceId: 'my-distinct-reference-id-' + Date.now(), // Generar un ID único
            };

            const cashAppPay = await payments.cashAppPay(paymentRequest, options);

            console.log('Cash App Pay creado:', cashAppPay);

            // Añadir listener para tokenización
            cashAppPay.addEventListener('ontokenization', async (event) => {
                const { tokenResult } = event.detail;
                if (tokenResult.status === 'OK') {
                    const token = tokenResult.token;
                    console.log('Tokenización exitosa:', token);
                    // Procesar el pago en el backend
                    const paymentResult = await processPayment(token, totalAmount);
                    if (paymentResult.success) {
                        console.log('Pago procesado exitosamente.');
                        paymentCompleted = true; // Marcar como pago completado
                        showAlert("Pago realizado exitosamente a través de Cash App Pay.", "success");
                        // Proceder a guardar las jugadas y generar el ticket final
                        const ticketNumber = $("#numeroTicket").text();
                        confirmarYGuardarTicket('Cash App', ticketNumber);
                    } else {
                        showAlert('Error al procesar el pago: ' + paymentResult.error, "danger");
                        console.error('Error en el backend al procesar el pago:', paymentResult.error);
                    }
                } else if (tokenResult.status === 'CANCEL') {
                    showAlert('Pago cancelado por el usuario.', "warning");
                } else {
                    showAlert('Error al tokenizar el pago: ' + (tokenResult.errors[0] ? tokenResult.errors[0].message : 'Desconocido'), "danger");
                    console.error('Error en la tokenización del pago:', tokenResult.errors[0] ? tokenResult.errors[0].message : 'Desconocido');
                }
            });

            // Añadir botón de Cash App Pay solo para desktop
            if (!isMobileDevice()) {
                const buttonOptions = {
                    shape: 'semiround',
                    width: 'full',
                };
                await cashAppPay.attach('#cash-app-pay', buttonOptions);
                console.log('Cash App Pay adjuntado al contenedor.');
            }

        } catch (error) {
            console.error('Error al inicializar Cash App Pay:', error);
            showAlert('Error al inicializar Cash App Pay: ' + error.message, 'danger');
        }
    }

    // Función para procesar el pago en el backend
    async function processPayment(token, amount) {
        try {
            const response = await fetch(`${BACKEND_API_URL}/procesar-pago`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sourceId: token, amount: amount }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend respondió con error: ${errorText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error al procesar el pago:', error);
            return { success: false, error: error.message };
        }
    }

    // Función para confirmar y guardar el ticket
    function confirmarYGuardarTicket(metodoPago, ticketNumber) {
        console.log(`Confirmando y guardando el ticket número: ${ticketNumber} con método de pago: ${metodoPago}`);

        // Limpiar alertas anteriores
        $("#ticketAlerts").empty();

        // Actualizar el método de pago en el backend
        $.ajax({
            url: `${BACKEND_API_URL}/${ticketNumber}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ metodoPago: metodoPago }),
            success: function(response) {
                console.log("Método de pago actualizado:", response);
                showAlert("Ticket confirmado e impreso exitosamente.", "success");

                // Imprimir el ticket
                window.print();

                // Descargar el ticket como imagen
                html2canvas(document.querySelector("#preTicket")).then(canvas => {
                    const imgData = canvas.toDataURL("image/png");
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = 'ticket.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Compartir el ticket si la API está disponible
                    if (navigator.share) {
                        navigator.share({
                            title: 'Tu Ticket de Apuesta',
                            text: 'Aquí está tu ticket de apuesta.',
                            files: [dataURLtoFile(imgData, 'ticket.png')]
                        }).then(() => {
                            console.log('Ticket compartido exitosamente.');
                        }).catch((error) => {
                            console.error('Error al compartir el ticket:', error);
                        });
                    }
                });

                // Cerrar el modal
                ticketModal.hide();

                // Reiniciar el formulario
                resetForm();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("Error al actualizar el método de pago:", textStatus, errorThrown);
                console.error("Detalles del Error:", jqXHR.responseText);
                let mensajeError = "Hubo un problema al confirmar el ticket. Por favor, inténtalo de nuevo.";
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    mensajeError = jqXHR.responseJSON.error;
                }
                showAlert(mensajeError, "danger");
            }
        });
    }

    // Función para convertir dataURL a File (para compartir)
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    // Función para detectar si el dispositivo es móvil
    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    // Inicializar listeners y funciones al cargar la página
    agregarJugada();
    agregarListenersNumeroApostado();
    resaltarDuplicados();
});

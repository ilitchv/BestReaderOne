 // scripts.js

$(document).ready(function() {

    // Define las URLs de tus APIs
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api'; // Ajustado para reflejar las rutas del backend

    // Inicializar Flatpickr con selección de múltiples fechas
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y",
        minDate: "today",
        maxDate: null,
        defaultDate: null,
        allowInput: true,
        onChange: function(selectedDates, dateStr, instance) {
            selectedDays = selectedDates.length;
            console.log("Días seleccionados:", selectedDays);
            calcularTotal();
            actualizarEstadoTracks(); // Actualizar tracks al cambiar la fecha
        },
    });

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let cashAppPayInitialized = false; // Bandera para evitar inicializaciones múltiples
    let paymentCompleted = false; // Estado de pago
    let totalJugadasGlobal = 0;
    let fechaTransaccion = '';
    let ticketData = {}; // Objeto para almacenar datos del ticket
    let ticketId = null; // Variable para almacenar el ticketId
    let cashAppPayInstance = null; // Variable para almacenar la instancia de Cash App Pay
    const userRole = localStorage.getItem('userRole') || 'user'; // Por defecto 'user' si no está establecido
    console.log('User Role:', userRole);

    // Horarios de cierre por track
    const horariosCierre = {
        "USA": {
            "New York Mid Day": "14:25",
            "New York Evening": "22:25",
            "Georgia Mid Day": "12:20",
            "Georgia Evening": "18:45",
            "New Jersey Mid Day": "12:54",
            "New Jersey Evening": "22:50",
            "Florida Mid Day": "13:25",
            "Florida Evening": "21:30",
            "Connecticut Mid Day": "13:35",
            "Connecticut Evening": "22:20",
            "Georgia Night": "23:20",
            "Pensilvania AM": "12:55",
            "Pensilvania PM": "18:20"
        },
        "Santo Domingo": {
            "Real": "12:45",
            "Gana mas": "14:25",
            "Loteka": "19:30",
            "Nacional": "20:30",
            "Quiniela Pale": "20:30",
            "Primera Día": "11:50",
            "Suerte Día": "12:20",
            "Lotería Real": "12:50",
            "Suerte Tarde": "17:50",
            "Lotedom": "17:50",
            "Primera Noche": "19:50",
            "Panama": "16:00",
            "Quiniela Pale Domingo": "15:30",
            "Nacional Domingo": "17:50"
        },
        "Venezuela": {
            "Venezuela": "19:00"
        }
    };

    // Límites de apuestas por modalidad
    const limitesApuesta = {
        "Win 4": { "straight": 6, "box": 30, "combo": 50 },
        "Peak 3": { "straight": 35, "box": 50, "combo": 70 },
        "Venezuela": { "straight": 100 },
        "Venezuela-Pale": { "straight": 20 },
        "Pulito": { "straight": 100 },
        "Pulito-Combinado": { "straight": 100 },
        "RD-Quiniela": { "straight": 100 },
        "RD-Pale": { "straight": 20 },
        "Combo": { "combo": 50 }
    };

    // Función para determinar la modalidad de juego
    function determinarModalidad(tracks, numero, fila) {
        let modalidad = "-";

        const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
        const incluyeVenezuela = tracks.includes("Venezuela");

        const longitud = numero.length;
        const boxValue = fila.find(".box").val().trim();
        const acceptableBoxValues = ["1", "2", "3"];
        const acceptableBoxCombinations = ["1,2", "2,3", "1,3", "1,2,3"];

        if (incluyeVenezuela && esUSA) {
            if (longitud === 2) {
                modalidad = "Venezuela";
            } else if (longitud === 4) {
                modalidad = "Venezuela-Pale";
            }
        } else if (esUSA && !esSD) {
            if (longitud === 4) {
                modalidad = "Win 4";
            } else if (longitud === 3) {
                modalidad = "Peak 3";
            } else if (longitud === 2) {
                if (acceptableBoxValues.includes(boxValue)) {
                    modalidad = "Pulito";
                } else if (acceptableBoxCombinations.includes(boxValue)) {
                    modalidad = "Pulito-Combinado";
                }
            }
        } else if (esSD && !esUSA) {
            if (longitud === 2) {
                modalidad = "RD-Quiniela";
            } else if (longitud === 4) {
                modalidad = "RD-Pale";
            }
        }

        return modalidad;
    }

    // Función para agregar una nueva jugada
    function agregarJugada() {
        if (jugadaCount >= 100) {
            showAlert("Has alcanzado el máximo de 100 jugadas.", "danger");
            return;
        }
        jugadaCount++;
        const fila = `
            <tr>
                <td>${jugadaCount}</td>
                <td><input type="number" class="form-control numeroApostado" min="0" max="9999" required></td>
                <td class="tipoJuego">-</td>
                <td><input type="number" class="form-control straight" min="0" max="100.00" step="1" placeholder="Ej: 5"></td>
                <td><input type="text" class="form-control box" placeholder="1,2,3"></td>
                <td><input type="number" class="form-control combo" min="0" max="50.00" step="0.10" placeholder="Ej: 3.00"></td>
                <td class="total">0.00</td>
            </tr>
        `;

        // Agregar la jugada al DOM
        $("#tablaJugadas").append(fila);

        // Agregar listeners a los nuevos campos
        agregarListenersNumeroApostado();
        resaltarDuplicados();

        // Enfocar el cursor en el campo "Número Apostado" de la nueva jugada
        $("#tablaJugadas tr:last .numeroApostado").focus();
    }

    // Agregar una jugada inicial
    agregarJugada();

    // Evento para agregar más jugadas
    $("#agregarJugada").click(function() {
        agregarJugada();
    });

    // Evento para eliminar la última jugada
    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        // Remover la última fila
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        // Actualizar el número de jugadas
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index + 1);
        });
        calcularTotal();
    });

    // Contador de tracks seleccionados y días
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        // Excluir "Venezuela" del conteo de tracks para el cálculo del total
        selectedTracks = tracksSeleccionados.filter(track => track !== "Venezuela").length || 1;

        calcularTotal();
    });

    // Evento para detectar cambios en los campos de entrada
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
        const fila = $(this).closest("tr");
        const num = fila.find(".numeroApostado").val();
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const modalidad = determinarModalidad(tracks, num, fila);
        fila.find(".tipoJuego").text(modalidad);
        actualizarPlaceholders(modalidad, fila);
        calcularTotalJugada(fila);
        calcularTotal();
    });

    // Función para actualizar los placeholders según la modalidad
    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight").attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight}`).prop('disabled', false);
        } else {
            fila.find(".straight").attr("placeholder", "Ej: 5.00").prop('disabled', false);
        }

        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box").attr("placeholder", "1,2,3").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            fila.find(".box").attr("placeholder", `Máximo $${limitesApuesta[modalidad].box}`).prop('disabled', false);
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta[modalidad].combo}`).prop('disabled', false);
        } else if (modalidad === "Combo") {
            fila.find(".straight").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta.Combo.combo}`).prop('disabled', false);
        } else {
            fila.find(".box").attr("placeholder", "Ej: 2.50").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "Ej: 3.00").prop('disabled', false);
        }
    }

    // Función para calcular el total de una jugada
    function calcularTotalJugada(fila) {
        const modalidad = fila.find(".tipoJuego").text();
        const numero = fila.find(".numeroApostado").val();
        if (!numero || numero.length < 2 || numero.length > 4) {
            fila.find(".total").text("0.00");
            return;
        }

        const combinaciones = calcularCombinaciones(numero);
        let straight = parseFloat(fila.find(".straight").val()) || 0;
        let boxVal = fila.find(".box").val().trim();
        let box = parseFloat(boxVal) || 0;
        let combo = parseFloat(fila.find(".combo").val()) || 0;

        // Aplicar límites según modalidad
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight || straight);
            if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                box = Math.min(box, limitesApuesta[modalidad].box || box);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                combo = Math.min(combo, limitesApuesta[modalidad].combo || combo);
            }
        }

        // Calcular total según modalidad
        let total = 0;
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            const boxValues = boxVal.split(",").filter(value => value !== "");
            const countBoxValues = boxValues.length;
            total = straight * countBoxValues;
        } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
            total = straight;
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            total = straight + box + (combo * combinaciones);
        } else if (modalidad === "Combo") {
            total = combo;
        } else {
            total = straight + box + combo;
        }

        fila.find(".total").text(total.toFixed(2));
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

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracks);
        console.log("Días seleccionados:", selectedDays);

        // Si no hay días seleccionados, el total es 0
        if (selectedDays === 0) {
            total = 0;
        } else {
            // Multiplicar por el número de tracks seleccionados y días
            total = (total * selectedTracks * selectedDays).toFixed(2);
        }
        console.log("Total después de multiplicar:", total);
        $("#totalJugadas").text(total);
    }

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Función para detectar si el dispositivo es móvil
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Función para mostrar alertas usando Bootstrap
    function showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Limpiar alertas anteriores
        $("#ticketAlerts").empty();

        // Verificar si hay un pago pendiente
        if (!paymentCompleted && localStorage.getItem('ticketId')) {
            showAlert("Tienes un ticket pendiente de pago. Por favor, completa el pago antes de generar uno nuevo.", "warning");
            return;
        }

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

        // Obtener las fechas seleccionadas como array
        const fechasArray = fecha.split(", ");
        const fechaActual = new Date();
        const yearActual = fechaActual.getFullYear();
        const monthActual = fechaActual.getMonth();
        const dayActual = fechaActual.getDate();
        const fechaActualSinHora = new Date(yearActual, monthActual, dayActual);

        // Validar cada fecha seleccionada
        for (let fechaSeleccionadaStr of fechasArray) {
            const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
            const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);

            if (fechaSeleccionada.getTime() === fechaActualSinHora.getTime()) {
                const horaActual = new Date();
                for (let track of tracks) {
                    if (track === 'Venezuela') continue;

                    const horaLimiteStr = obtenerHoraLimite(track);
                    if (horaLimiteStr) {
                        const [horas, minutos] = horaLimiteStr.split(":");
                        const horaLimite = new Date();
                        horaLimite.setHours(parseInt(horas), parseInt(minutos) - 5, 0, 0);
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
                return false; // Salir del each
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                showAlert("Por favor, selecciona una modalidad de juego válida.", "danger");
                return false;
            }

            // Validar que la jugada tiene al menos un track seleccionado correspondiente a su modalidad
            let tracksRequeridos = [];

            if (["Win 4", "Peak 3", "Pulito", "Pulito-Combinado", "Venezuela"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre.USA);
            } else if (["RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre["Santo Domingo"]);
            } else {
                tracksRequeridos = [];
            }

            const tracksSeleccionadosParaModalidad = tracks.filter(track => tracksRequeridos.includes(track));

            if (tracksRequeridos.length > 0 && tracksSeleccionadosParaModalidad.length === 0) {
                jugadasValidas = false;
                showAlert(`La jugada con modalidad "${modalidad}" requiere al menos un track seleccionado correspondiente.`, "danger");
                return false;
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
        const jugadasArray = [];
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

            jugadasArray.push({
                numero: num,
                modalidad: modalidad,
                straight: straight,
                box: box,
                combo: combo,
                total: total
            });
        });
        $("#ticketTotal").text($("#totalJugadas").text());

        // Mostrar las fechas de apuesta en el ticket
        $("#ticketFecha").text(fecha);
        console.log("Fechas asignadas a #ticketFecha:", $("#ticketFecha").text());

        // Calcular el total global
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Almacenar datos necesarios en ticketData
        ticketData = {
            fecha: fecha,
            tracks: tracks,
            jugadas: jugadasArray,
            totalAmount: totalJugadasGlobal,
            ticketJugadasHTML: $("#ticketJugadas").html(),
            ticketTracks: tracksTexto,
            ticketFecha: fecha,
            selectedDays: selectedDays,
            selectedTracks: selectedTracks
        };

        // Enviar ticketData al backend para almacenarlo y obtener ticketId
        $.ajax({
            url: `${BACKEND_API_URL}/store-ticket`, // Ruta actualizada
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(ticketData),
            success: function(response) {
                if (response.ticketId) {
                    ticketId = response.ticketId;
                    paymentCompleted = false; // Reiniciar el estado de pago

                    // Guardar ticketId en localStorage
                    localStorage.setItem('ticketId', ticketId);

                    // Limpiar campos de QR y número de ticket
                    $("#numeroTicket").text('');
                    $("#ticketTransaccion").text('');
                    $("#qrcode").empty();

                    // Mostrar el modal usando Bootstrap 5
                    ticketModal.show();

                    // Ajustar el modal según el rol del usuario
                    if (userRole === 'user') {
                        // Inicializar Cash App Pay
                        if (!cashAppPayInitialized) {
                            console.log('Usuario con rol "user" identificado. Inicializando Cash App Pay.');
                            initializeCashAppPay(totalJugadasGlobal);
                            cashAppPayInitialized = true;
                        }
                    } else {
                        // Mostrar contenedores de Confirmar e Imprimir y ocultar Cash App Pay
                        $('#cashAppPayContainer').hide();
                        $('#confirmarTicketContainer').show();
                        // Asegurar que el botón 'Confirmar e Imprimir' esté visible
                        $('#confirmarTicket').show();
                    }
                } else {
                    showAlert('Error al almacenar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                }
            },
            error: function(error) {
                console.error('Error al almacenar los datos del ticket:', error);
                // Mostrar el mensaje de error detallado del backend si está disponible
                const errorMsg = error.responseJSON && error.responseJSON.error ? error.responseJSON.error : 'Error al almacenar los datos del ticket. Por favor, inténtalo de nuevo.';
                showAlert(errorMsg, 'danger');
            }
        });
    });

    // Modificar initializeCashAppPay para incluir ticketId en redirectURL
    async function initializeCashAppPay(totalAmount) {
        console.log('Inicializando Cash App Pay con total:', totalAmount);
        if (!window.Square) {
            showAlert('El SDK de Square no se cargó correctamente.', 'danger');
            console.error('Square SDK no está disponible.');
            return;
        }

        try {
            // Obtener las credenciales de Square desde el backend
            const credentialsResponse = await fetch(`${BACKEND_API_URL}/square-credentials`);
            const credentials = await credentialsResponse.json();
            const { applicationId, locationId } = credentials;

            if (!applicationId || !locationId) {
                showAlert('Error en las credenciales de Square. Por favor, contacta al administrador.', 'danger');
                console.error('applicationId o locationId son undefined.');
                return;
            }

            const payments = window.Square.payments(applicationId, locationId);

            const paymentRequest = payments.paymentRequest({
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    amount: totalAmount.toFixed(2),
                    label: 'Total',
                },
            });

            // La URL actual no contiene parámetros
            const currentURL = window.location.origin + window.location.pathname;

            const options = {
                redirectURL: `${currentURL}?ticketId=${ticketId}`,
                referenceId: 'my-distinct-reference-id-' + Date.now(),
            };

            const cashAppPay = await payments.cashAppPay(paymentRequest, options);

            // Almacenar la instancia
            cashAppPayInstance = cashAppPay;

            console.log('Cash App Pay creado:', cashAppPay);

            // Añadir listener para tokenización (funciona en escritorio)
            cashAppPay.addEventListener('ontokenization', async (event) => {
                const { tokenResult } = event.detail;
                if (tokenResult.status === 'OK') {
                    const sourceId = tokenResult.token;
                    console.log('Tokenización exitosa:', sourceId);
                    // Procesar el pago en el backend
                    const paymentResult = await processPayment(sourceId, totalAmount);
                    if (paymentResult.success) {
                        console.log('Pago procesado exitosamente.');
                        paymentCompleted = true; // Marcar como pago completado
                        showAlert("Pago realizado exitosamente a través de Cash App Pay.", "success");
                        // Proceder a confirmar y guardar el ticket
                        confirmarYGuardarTicket('Cash App');
                    } else {
                        showAlert('Error al procesar el pago: ' + paymentResult.error, "danger");
                        console.error('Error en el backend al procesar el pago:', paymentResult.error);
                    }
                } else {
                    // Manejar cancelación o errores
                    if (tokenResult.status === 'CANCEL') {
                        showAlert('Pago cancelado por el usuario.', "warning");
                    } else if (tokenResult.errors) {
                        showAlert('Error al tokenizar el pago: ' + tokenResult.errors[0].message, "danger");
                        console.error('Error en la tokenización del pago:', tokenResult.errors[0].message);
                    } else {
                        showAlert('Error desconocido al tokenizar el pago.', "danger");
                        console.error('Error desconocido en la tokenización del pago:', tokenResult);
                    }

                    // Destruir la instancia de Cash App Pay
                    if (cashAppPayInstance) {
                        try {
                            cashAppPayInstance.destroy();
                            cashAppPayInstance = null;
                            cashAppPayInitialized = false;
                            console.log('Cash App Pay instance destroyed after cancellation or error.');
                        } catch (error) {
                            console.error('Error al destruir la instancia de Cash App Pay después de cancelación o error:', error);
                        }
                    }
                }
            });

            // Adjuntar el botón de Cash App Pay
            const buttonOptions = {
                shape: 'semiround',
                width: 'full',
            };
            await cashAppPay.attach('#cash-app-pay', buttonOptions);
            console.log('Cash App Pay adjuntado al contenedor.');

        } catch (error) {
            console.error('Error al inicializar Cash App Pay:', error);
            showAlert('Error al inicializar Cash App Pay: ' + error.message, 'danger');
        }
    }

    // Función para procesar el pago en el backend
    async function processPayment(sourceId, amount) {
        try {
            const payload = {
                sourceId: sourceId,
                amount: amount,
                ticketId: ticketId
            };

            const response = await fetch(`${BACKEND_API_URL}/procesar-pago`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                return result;
            } else {
                console.error('Error del backend:', result);
                return { success: false, error: result.error || 'Error desconocido en el backend.' };
            }
        } catch (error) {
            console.error('Error al procesar el pago:', error);
            return { success: false, error: error.message };
        }
    }

    // Modificar el manejador de carga de la ventana para recuperar ticketData desde el backend usando ticketId
    $(window).on('load', function() {
        // Obtener ticketId de localStorage
        ticketId = localStorage.getItem('ticketId');

        // Obtener los parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const paymentId = urlParams.get('paymentId');

        if (ticketId) {
            // Recuperar ticketData desde el backend
            $.ajax({
                url: `${BACKEND_API_URL}/retrieve-ticket`,
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({ ticketId: ticketId }),
                success: function(response) {
                    if (response.ticketData) {
                        ticketData = response.ticketData;

                        // Restaurar datos en el modal
                        $("#ticketTracks").text(ticketData.ticketTracks);
                        $("#ticketJugadas").html(ticketData.ticketJugadasHTML);
                        $("#ticketTotal").text(ticketData.totalAmount.toFixed(2));
                        $("#ticketFecha").text(ticketData.ticketFecha);

                        // Limpiar campos de QR y número de ticket
                        $("#numeroTicket").text('');
                        $("#ticketTransaccion").text('');
                        $("#qrcode").empty();

                        // Mostrar el modal
                        ticketModal.show();

                        // Verificar el estado del pago en el backend
                        $.ajax({
                            url: `${BACKEND_API_URL}/check-payment-status`,
                            method: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({ ticketId: ticketId }),
                            success: function(paymentResponse) {
                                if (paymentResponse.paymentCompleted) {
                                    paymentCompleted = true;
                                    confirmarYGuardarTicket('Cash App');
                                } else {
                                    if (!cashAppPayInitialized) {
                                        console.log('Inicializando Cash App Pay después de recuperar ticketData.');
                                        initializeCashAppPay(ticketData.totalAmount);
                                        cashAppPayInitialized = true;
                                    }
                                }
                            },
                            error: function(error) {
                                console.error('Error al verificar el estado del pago:', error);
                                showAlert('Error al verificar el estado del pago. Por favor, inténtalo de nuevo.', 'danger');
                            }
                        });

                    } else {
                        showAlert('Error al recuperar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                        // Limpiar ticketId de localStorage
                        localStorage.removeItem('ticketId');
                    }
                },
                error: function(error) {
                    console.error('Error al recuperar los datos del ticket:', error);
                    showAlert('Error al recuperar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                    // Limpiar ticketId de localStorage
                    localStorage.removeItem('ticketId');
                }
            });
        }
    });

    // Función para procesar el pago usando paymentId (para dispositivos móviles)
    async function processPaymentWithPaymentId(paymentId, amount) {
        console.log('Procesando paymentId:', paymentId, 'con monto:', amount);
        try {
            const payload = {
                sourceId: paymentId,
                amount: amount,
                ticketId: ticketId
            };

            const response = await fetch(`${BACKEND_API_URL}/procesar-pago`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                if (result.success) {
                    console.log('Pago procesado exitosamente con paymentId.');
                    paymentCompleted = true;
                    showAlert("Pago realizado exitosamente a través de Cash App Pay.", "success");
                    confirmarYGuardarTicket('Cash App');
                } else {
                    showAlert('Error al procesar el pago: ' + result.error, "danger");
                }
            } else {
                console.error('Error del backend:', result);
                showAlert('Error al procesar el pago: ' + (result.error || 'Error desconocido.'), "danger");
            }
        } catch (error) {
            console.error('Error al procesar el pago:', error);
            showAlert('Error al procesar el pago: ' + error.message, "danger");
        }
    }

    // Evento para confirmar e imprimir el ticket
    $("#confirmarTicket").click(function() {
        // Limpiar alertas anteriores
        $("#ticketAlerts").empty();

        if (userRole === 'user') {
            if (paymentCompleted) {
                // Proceder con la confirmación e impresión
                confirmarYGuardarTicket('Cash App');
            } else {
                // Mostrar alerta en el modal
                showAlert("Por favor, procede con el pago haciendo clic en el botón Cash App Pay.", "warning");
            }
        } else {
            // Para roles admin y dealer, establecer paymentCompleted en true
            paymentCompleted = true;
            confirmarYGuardarTicket('Efectivo');
        }
    });

    // Modificar confirmarYGuardarTicket para validar en el servidor antes de generar el ticket
    function confirmarYGuardarTicket(metodoPago) {
        // Validar en el servidor que el pago ha sido completado
        $.ajax({
            url: `${BACKEND_API_URL}/validate-ticket`,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ ticketId: ticketId }),
            success: function(response) {
                if (response.valid) {
                    // Generar número de ticket único y código QR
                    const numeroTicket = generarNumeroUnico();
                    $("#numeroTicket").text(numeroTicket);

                    // Generar la fecha y hora de transacción
                    fechaTransaccion = dayjs().format('MM-DD-YYYY hh:mm A');
                    $("#ticketTransaccion").text(fechaTransaccion);

                    // Generar código QR
                    $("#qrcode").empty(); // Limpiar el contenedor anterior
                    new QRCode(document.getElementById("qrcode"), {
                        text: numeroTicket,
                        width: 128,
                        height: 128,
                    });

                    // Datos comunes a todas las jugadas
                    const ticketNumber = numeroTicket;
                    const transactionDateTime = fechaTransaccion;
                    const betDates = ticketData.ticketFecha;
                    const tracks = ticketData.ticketTracks;
                    const totalTicket = ticketData.totalAmount.toFixed(2);
                    const timestamp = new Date().toISOString();

                    // Array para almacenar las jugadas
                    const jugadasData = [];

                    // Recorrer cada jugada y preparar los datos
                    ticketData.jugadas.forEach(function(jugada) {
                        // Generar número único de 8 dígitos para la jugada
                        const jugadaNumber = generarNumeroUnico();

                        const jugadaData = {
                            "Ticket Number": ticketNumber,
                            "Transaction DateTime": transactionDateTime,
                            "Bet Dates": betDates,
                            "Tracks": tracks,
                            "Bet Number": jugada.numero,
                            "Game Mode": jugada.modalidad,
                            "Straight ($)": jugada.straight,
                            "Box ($)": jugada.box !== "-" ? parseFloat(jugada.box) : null,
                            "Combo ($)": jugada.combo !== "-" ? parseFloat(jugada.combo) : null,
                            "Total ($)": jugada.total,
                            "Payment Method": metodoPago,
                            "Jugada Number": jugadaNumber,
                            "Timestamp": timestamp
                        };

                        // Añadir la jugada al array
                        jugadasData.push(jugadaData);
                    });

                    // Enviar datos a ambos destinos
                    enviarFormulario(jugadasData);
                } else {
                    showAlert('El pago no ha sido completado o el ticket no es válido.', 'danger');
                }
            },
            error: function(error) {
                console.error('Error al validar el ticket en el servidor:', error);
                showAlert('Error al validar el ticket. Por favor, inténtalo de nuevo.', 'danger');
            }
        });
    }

    // Modificar enviarFormulario para limpiar el estado después de completar
    function enviarFormulario(datos) {
        // Enviar a SheetDB
        const sheetDBRequest = $.ajax({
            url: SHEETDB_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Enviar al Backend para guardar en MongoDB
        const backendRequest = $.ajax({
            url: `${BACKEND_API_URL}/save-jugadas`, // Ruta actualizada
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Esperar a que ambas solicitudes se completen
        $.when(sheetDBRequest, backendRequest).done(function(sheetDBResponse, backendResponse) {
            console.log("Datos enviados a ambos destinos:");
            console.log("SheetDB:", sheetDBResponse);
            console.log("Backend:", backendResponse);

            // Mostrar mensaje de éxito
            showAlert("Ticket guardado y enviado exitosamente.", "success");

            // Después de que ambas solicitudes se hayan completado con éxito

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
            });

            // Cerrar el modal
            ticketModal.hide();

            // Reiniciar el formulario
            resetForm();

            // Limpiar datos almacenados
            ticketData = {};
            paymentCompleted = false;
            cashAppPayInitialized = false;
            ticketId = null;

            // Destruir la instancia de Cash App Pay si existe
            if (cashAppPayInstance) {
                try {
                    cashAppPayInstance.destroy();
                    cashAppPayInstance = null;
                    console.log('Cash App Pay instance destroyed after completing the process.');
                } catch (error) {
                    console.error('Error al destruir la instancia de Cash App Pay:', error);
                }
            }

            // Limpiar ticketId de localStorage
            localStorage.removeItem('ticketId');

            // Limpiar los parámetros de la URL
            const newURL = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newURL);

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error al enviar datos:", textStatus, errorThrown);
            // Intentar obtener el error detallado del backend
            let errorMsg = "Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.";
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            showAlert(errorMsg, "danger");
        });
    }

    // Evento para el botón de reset
    $("#resetForm").click(function() {
        resetForm();
    });

    // Función para reiniciar el formulario
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        // Resetear los placeholders
        $("#tablaJugadas tr").each(function() {
            actualizarPlaceholders("-", $(this));
        });
        resaltarDuplicados();
        // Resetear el estado de pago
        paymentCompleted = false;
        cashAppPayInitialized = false;
        ticketData = {};
        ticketId = null;

        // Destruir la instancia de Cash App Pay si existe
        if (cashAppPayInstance) {
            try {
                cashAppPayInstance.destroy();
                cashAppPayInstance = null;
                console.log('Cash App Pay instance destroyed in resetForm.');
            } catch (error) {
                console.error('Error al destruir la instancia de Cash App Pay en resetForm:', error);
            }
        }

        // Limpiar ticketId de localStorage
        localStorage.removeItem('ticketId');

        // Limpiar alertas
        $("#ticketAlerts").empty();

        // Habilitar todos los tracks y remover clases
        $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
    }

    // Función para deshabilitar tracks basados en su hora de cierre
    function actualizarEstadoTracks() {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;

        const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);

        const fechaActual = new Date();
        const esMismoDia = fechaSeleccionada.toDateString() === fechaActual.toDateString();

        if (!esMismoDia) {
            // Habilitar todos los tracks para fechas futuras
            $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
            return;
        }

        const ahora = new Date();

        for (let region in horariosCierre) {
            for (let track in horariosCierre[region]) {
                const horaCierreStr = horariosCierre[region][track];
                const [horaCierre, minutoCierre] = horaCierreStr.split(":").map(Number);
                const horaCierreMiliseconds = horaCierre * 60 + minutoCierre;
                const ahoraMiliseconds = ahora.getHours() * 60 + ahora.getMinutes();

                if (ahoraMiliseconds >= horaCierreMiliseconds) {
                    // Deshabilitar el checkbox correspondiente
                    $(`.track-checkbox[value="${track}"]`).prop('disabled', true).prop('checked', false).closest('label').addClass('closed-track');
                } else {
                    // Habilitar el checkbox si aún no está cerrado
                    $(`.track-checkbox[value="${track}"]`).prop('disabled', false).closest('label').removeClass('closed-track');
                }
            }
        }
    }

    // Llamar a la función al cargar la página
    actualizarEstadoTracks();

    // Actualizar el estado de los tracks cada vez que cambie la fecha
    $("#fecha").change(function() {
        actualizarEstadoTracks();
    });

    // Actualizar el estado de los tracks cada minuto si la fecha es hoy
    setInterval(function() {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;

        const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);

        const fechaActual = new Date();
        const esMismoDia = fechaSeleccionada.toDateString() === fechaActual.toDateString();

        if (esMismoDia) {
            actualizarEstadoTracks();
        }
    }, 60000);

    // Función para mostrar las horas límite junto a cada track (Opcional)
    function mostrarHorasLimite() {
        $(".cutoff-time").each(function() {
            const track = $(this).data("track");

            if (track === 'Venezuela') {
                $(this).hide(); // Oculta el elemento del DOM
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

    // Función para obtener la hora límite de un track
    function obtenerHoraLimite(track) {
        for (let region in horariosCierre) {
            if (horariosCierre[region][track]) {
                return horariosCierre[region][track];
            }
        }
        return null;
    }

    // Función para resaltar números duplicados
    function resaltarDuplicados() {
        // Obtener todos los campos de número apostado
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();

        // Recopilar valores y detectar duplicados
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

        // Aplicar o remover la clase .duplicado
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
            campo.removeEventListener('input', resaltarDuplicados); // Evitar duplicar listeners
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // Agregar listeners al cargar la página
    agregarListenersNumeroApostado();
    resaltarDuplicados(); // Resaltar duplicados al cargar, si los hay

    // Llamar a la función para mostrar las horas límite al cargar la página
    mostrarHorasLimite();

});

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
    let paymentCompleted = false;      // Estado de pago
    let totalJugadasGlobal = 0;
    let fechaTransaccion = '';
    let ticketData = {};              // Objeto para almacenar datos del ticket
    let ticketId = null;              // Variable para almacenar el ticketId
    let cashAppPayInstance = null;    // Variable para almacenar la instancia de Cash App Pay
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
        "Win 4": { "straight": 6,  "box": 30, "combo": 50 },
        "Peak 3": { "straight": 35, "box": 50, "combo": 70 },
        "Venezuela": { "straight": 100 },
        "Venezuela-Pale": { "straight": 20 },
        "Pulito": { "straight": 100 },
        "Pulito-Combinado": { "straight": 100 },
        "RD-Quiniela": { "straight": 100 },
        "RD-Pale": { "straight": 20 },
        "Combo": { "combo": 50 }
    };

    // MOSTRAR/HIDING COMPARTIR: Al iniciar, ocultar sección de compartir
    $("#finalShareSection").hide();

    // ================== DETERMINAR MODALIDAD ==================
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

    // ================== AGREGAR / ELIMINAR JUGADA ==================
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
        $("#tablaJugadas").append(fila);
        agregarListenersNumeroApostado();
        resaltarDuplicados();
        $("#tablaJugadas tr:last .numeroApostado").focus();
    }

    // Agregar jugada inicial
    agregarJugada();
    $("#agregarJugada").click(() => agregarJugada());
    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index + 1);
        });
        calcularTotal();
    });

    // ================== EVENTOS EN JUGADAS ==================
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        selectedTracks = tracksSeleccionados.filter(track => track !== "Venezuela").length || 1;
        calcularTotal();
    });

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

    // ================== PLACEHOLDERS SEGÚN MODALIDAD ==================
    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight").attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight || 100}`).prop('disabled', false);
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
            fila.find(".box").attr("placeholder", `Máximo $${limitesApuesta[modalidad].box || 50}`).prop('disabled', false);
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta[modalidad].combo || 50}`).prop('disabled', false);
        } else if (modalidad === "Combo") {
            fila.find(".straight").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta.Combo.combo}`).prop('disabled', false);
        } else {
            fila.find(".box").attr("placeholder", "Ej: 2.50").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "Ej: 3.00").prop('disabled', false);
        }
    }

    // ================== CÁLCULOS DE TOTALES ==================
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

        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight || straight);
            if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                box = Math.min(box, limitesApuesta[modalidad].box || box);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                combo = Math.min(combo, limitesApuesta[modalidad].combo || combo);
            }
        }

        let total = 0;
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            const boxValues = boxVal.split(",").filter(value => value !== "");
            total = straight * boxValues.length;
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

    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        let factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            denominator *= factorial(counts[digit]);
        }
        return factorial(totalDigits) / denominator;
    }

    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        if (selectedDays === 0) {
            total = 0;
        } else {
            total = (total * selectedTracks * selectedDays).toFixed(2);
        }
        $("#totalJugadas").text(total);
    }

    // ================== MODAL BOOTSTRAP ==================
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // ================== ALERTAS Y UTILS ==================
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // ================== GENERAR TICKET ==================
    $("#generarTicket").click(function() {
        $("#ticketAlerts").empty();

        if (!paymentCompleted && localStorage.getItem('ticketId')) {
            showAlert("Tienes un ticket pendiente de pago. Por favor, completa el pago antes de generar uno nuevo.", "warning");
            return;
        }

        const fecha = $("#fecha").val();
        if (!fecha) {
            showAlert("Por favor, selecciona una fecha.", "warning");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        if (!tracks || tracks.length === 0) {
            showAlert("Por favor, selecciona al menos un track.", "warning");
            return;
        }

        // Validar 'Venezuela' con un track de USA
        const tracksUSASeleccionados = tracks.filter(track => Object.keys(horariosCierre.USA).includes(track));
        if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
            showAlert("Para jugar en la modalidad 'Venezuela', debes seleccionar al menos un track de USA además de 'Venezuela'.", "warning");
            return;
        }

        // Validar horarios
        const fechasArray = fecha.split(", ");
        const fechaActual = new Date();
        const yearActual = fechaActual.getFullYear();
        const monthActual = fechaActual.getMonth();
        const dayActual = fechaActual.getDate();
        const fechaActualSinHora = new Date(yearActual, monthActual, dayActual);

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
                            showAlert(`El track "${track}" ya ha cerrado para hoy.`, "danger");
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

            // Validar tracks requeridos
            let tracksRequeridos = [];
            if (["Win 4", "Peak 3", "Pulito", "Pulito-Combinado", "Venezuela"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre.USA);
            } else if (["RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre["Santo Domingo"]);
            }
            const tracksSeleccionadosParaModalidad = tracks.filter(track => tracksRequeridos.includes(track));
            if (tracksRequeridos.length > 0 && tracksSeleccionadosParaModalidad.length === 0) {
                jugadasValidas = false;
                showAlert(`La jugada con modalidad "${modalidad}" requiere un track correspondiente.`, "danger");
                return false;
            }

            // Validar montos
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
                        showAlert("En Pulito/Pulito-Combinado, 'Box' debe ser 1,2,3 o variantes.", "danger");
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
                if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                    if (parseFloat($(this).find(".box").val()) > (limitesApuesta[modalidad].box || Infinity)) {
                        jugadasValidas = false;
                        showAlert(`El monto en Box excede el límite para ${modalidad}.`, "danger");
                        return false;
                    }
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

        // Preparar ticket
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
        $("#ticketFecha").text(fecha);

        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

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

        // Guardar ticket en backend
        $.ajax({
            url: `${BACKEND_API_URL}/store-ticket`,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(ticketData),
            success: function(response) {
                if (response.ticketId) {
                    ticketId = response.ticketId;
                    paymentCompleted = false;
                    localStorage.setItem('ticketId', ticketId);

                    $("#numeroTicket").text('');
                    $("#ticketTransaccion").text('');
                    $("#qrcode").empty();

                    ticketModal.show();

                    if (userRole === 'user') {
                        if (!cashAppPayInitialized) {
                            console.log('Rol "user". Inicializando Cash App Pay.');
                            initializeCashAppPay(totalJugadasGlobal);
                            cashAppPayInitialized = true;
                        }
                    } else {
                        $('#cashAppPayContainer').hide();
                        $('#confirmarTicketContainer').show();
                        $('#confirmarTicket').show();
                    }
                } else {
                    showAlert('Error al almacenar el ticket. Inténtalo de nuevo.', 'danger');
                }
            },
            error: function(error) {
                console.error('Error al almacenar el ticket:', error);
                const errorMsg = (error.responseJSON && error.responseJSON.error) 
                    ? error.responseJSON.error 
                    : 'Error al almacenar el ticket. Inténtalo de nuevo.';
                showAlert(errorMsg, 'danger');
            }
        });
    });

    // ================== CASH APP PAY ==================
    async function initializeCashAppPay(totalAmount) {
        console.log('Inicializando Cash App Pay con total:', totalAmount);
        if (!window.Square) {
            showAlert('El SDK de Square no se cargó correctamente.', 'danger');
            return;
        }

        try {
            const credentialsResponse = await fetch(`${BACKEND_API_URL}/square-credentials`);
            const credentials = await credentialsResponse.json();
            const { applicationId, locationId } = credentials;
            if (!applicationId || !locationId) {
                showAlert('Error en las credenciales de Square.', 'danger');
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
            const currentURL = window.location.origin + window.location.pathname;
            const options = {
                redirectURL: `${currentURL}?ticketId=${ticketId}`,
                referenceId: 'my-distinct-reference-id-' + Date.now(),
            };

            const cashAppPay = await payments.cashAppPay(paymentRequest, options);
            cashAppPayInstance = cashAppPay;

            cashAppPay.addEventListener('ontokenization', async (event) => {
                const { tokenResult } = event.detail;
                if (tokenResult.status === 'OK') {
                    const sourceId = tokenResult.token;
                    const paymentResult = await processPayment(sourceId, totalAmount);
                    if (paymentResult.success) {
                        paymentCompleted = true;
                        showAlert("Pago realizado exitosamente (Cash App).", "success");
                        confirmarYGuardarTicket('Cash App');
                    } else {
                        showAlert('Error al procesar pago: ' + paymentResult.error, "danger");
                    }
                } else {
                    // Manejo de error/cancel
                    if (tokenResult.status === 'CANCEL') {
                        showAlert('Pago cancelado por el usuario.', "warning");
                    } else if (tokenResult.errors) {
                        showAlert('Error al tokenizar: ' + tokenResult.errors[0].message, "danger");
                    } else {
                        showAlert('Error desconocido al tokenizar.', "danger");
                    }
                    if (cashAppPayInstance) {
                        try {
                            cashAppPayInstance.destroy();
                            cashAppPayInstance = null;
                            cashAppPayInitialized = false;
                        } catch (error) {
                            console.error('Error al destruir instancia Cash App Pay:', error);
                        }
                    }
                }
            });

            const buttonOptions = { shape: 'semiround', width: 'full' };
            await cashAppPay.attach('#cash-app-pay', buttonOptions);
            console.log('Cash App Pay adjuntado.');
        } catch (error) {
            console.error('Error al inicializar Cash App Pay:', error);
            showAlert('Error al inicializar Cash App Pay: ' + error.message, 'danger');
        }
    }

    async function processPayment(sourceId, amount) {
        try {
            const payload = { sourceId, amount, ticketId };
            const response = await fetch(`${BACKEND_API_URL}/procesar-pago`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (response.ok) {
                return result;
            } else {
                return { success: false, error: result.error || 'Error desconocido en backend.' };
            }
        } catch (error) {
            console.error('Error al procesar pago:', error);
            return { success: false, error: error.message };
        }
    }

    // ================== RECUPERAR TICKET AL CARGAR ==================
    $(window).on('load', function() {
        ticketId = localStorage.getItem('ticketId');
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const paymentId = urlParams.get('paymentId');

        if (ticketId) {
            $.ajax({
                url: `${BACKEND_API_URL}/retrieve-ticket`,
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({ ticketId }),
                success: function(response) {
                    if (response.ticketData) {
                        ticketData = response.ticketData;
                        $("#ticketTracks").text(ticketData.ticketTracks);
                        $("#ticketJugadas").html(ticketData.ticketJugadasHTML);
                        $("#ticketTotal").text(ticketData.totalAmount.toFixed(2));
                        $("#ticketFecha").text(ticketData.ticketFecha);

                        $("#numeroTicket").text('');
                        $("#ticketTransaccion").text('');
                        $("#qrcode").empty();

                        ticketModal.show();

                        $.ajax({
                            url: `${BACKEND_API_URL}/check-payment-status`,
                            method: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({ ticketId }),
                            success: function(paymentResponse) {
                                if (paymentResponse.paymentCompleted) {
                                    paymentCompleted = true;
                                    confirmarYGuardarTicket('Cash App');
                                } else {
                                    if (!cashAppPayInitialized) {
                                        initializeCashAppPay(ticketData.totalAmount);
                                        cashAppPayInitialized = true;
                                    }
                                }
                            },
                            error: function(error) {
                                showAlert('Error al verificar pago.', 'danger');
                            }
                        });
                    } else {
                        showAlert('Error al recuperar ticket.', 'danger');
                        localStorage.removeItem('ticketId');
                    }
                },
                error: function(error) {
                    console.error('Error al recuperar ticket:', error);
                    showAlert('Error al recuperar ticket.', 'danger');
                    localStorage.removeItem('ticketId');
                }
            });
        }
    });

    // ================== CONFIRMAR TICKET ==================
    $("#confirmarTicket").click(function() {
        $("#ticketAlerts").empty();
        if (userRole === 'user') {
            if (paymentCompleted) {
                confirmarYGuardarTicket('Cash App');
            } else {
                showAlert("Por favor, procede con el pago (Cash App).", "warning");
            }
        } else {
            paymentCompleted = true;
            confirmarYGuardarTicket('Efectivo');
        }
    });

    function confirmarYGuardarTicket(metodoPago) {
        $.ajax({
            url: `${BACKEND_API_URL}/validate-ticket`,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ ticketId }),
            success: function(response) {
                if (response.valid) {
                    const numeroTicket = generarNumeroUnico();
                    $("#numeroTicket").text(numeroTicket);

                    fechaTransaccion = dayjs().format('MM-DD-YYYY hh:mm A');
                    $("#ticketTransaccion").text(fechaTransaccion);

                    $("#qrcode").empty();
                    new QRCode(document.getElementById("qrcode"), {
                        text: numeroTicket,
                        width: 128,
                        height: 128,
                    });

                    const ticketNumber = numeroTicket;
                    const transactionDateTime = fechaTransaccion;
                    const betDates = ticketData.ticketFecha;
                    const tracks = ticketData.ticketTracks;
                    const timestamp = new Date().toISOString();

                    const jugadasData = [];
                    ticketData.jugadas.forEach(function(jugada) {
                        const jugadaNumber = generarNumeroUnico();
                        jugadasData.push({
                            "Ticket Number": ticketNumber,
                            "Transaction DateTime": transactionDateTime,
                            "Bet Dates": betDates,
                            "Tracks": tracks,
                            "Bet Number": jugada.numero,
                            "Game Mode": jugada.modalidad,
                            "Straight ($)": jugada.straight,
                            "Box ($)": jugada.box === "-" ? null : parseFloat(jugada.box),
                            "Combo ($)": jugada.combo === "-" ? null : parseFloat(jugada.combo),
                            "Total ($)": jugada.total,
                            "Payment Method": metodoPago,
                            "Jugada Number": jugadaNumber,
                            "Timestamp": timestamp
                        });
                    });

                    enviarFormulario(jugadasData);
                } else {
                    showAlert('El pago no se ha completado o el ticket no es válido.', 'danger');
                }
            },
            error: function(error) {
                console.error('Error al validar ticket:', error);
                showAlert('Error al validar el ticket. Intenta de nuevo.', 'danger');
            }
        });
    }

    // ================== ENVIAR FORMULARIO Y DESCARGAR ==================
    function enviarFormulario(datos) {
        const sheetDBRequest = $.ajax({
            url: SHEETDB_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });
        const backendRequest = $.ajax({
            url: `${BACKEND_API_URL}/save-jugadas`,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        $.when(sheetDBRequest, backendRequest).done(function(sheetDBResponse, backendResponse) {
            console.log("Datos enviados a ambos destinos:");
            console.log("SheetDB:", sheetDBResponse);
            console.log("Backend:", backendResponse);
            showAlert("Ticket guardado y enviado exitosamente.", "success");

            // 1) Removemos la impresión
            // window.print(); // borrado

            // 2) Descargar ticket en alta resolución
            descargarTicketComoImagen(() => {
                ticketModal.hide();
                resetForm();
                ticketData = {};
                paymentCompleted = false;
                cashAppPayInitialized = false;
                ticketId = null;
                if (cashAppPayInstance) {
                    try {
                        cashAppPayInstance.destroy();
                        cashAppPayInstance = null;
                        console.log('Cash App Pay instance destroyed after completing the process.');
                    } catch (error) {
                        console.error('Error al destruir la instancia de Cash App Pay:', error);
                    }
                }
                localStorage.removeItem('ticketId');
                // Limpiar los parámetros de la URL
                const newURL = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, newURL);

                // MOSTRAR el botón de compartir al final
                $('#finalShareSection').show();
            });

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error al enviar datos:", textStatus, errorThrown);
            let errorMsg = "Hubo un problema al enviar los datos.";
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            showAlert(errorMsg, "danger");
        });
    }

    // =============== FUNCIÓN DESCARGAR TICKET (HTML2CANVAS) ===============
    function descargarTicketComoImagen(callback) {
        const ticketElement = document.getElementById("preTicket");

        // Guardar estilos originales
        const originalStyles = {
            width: ticketElement.style.width,
            height: ticketElement.style.height,
            maxHeight: ticketElement.style.maxHeight,
            overflowY: ticketElement.style.overflowY
        };

        // Expandir temporalmente
        ticketElement.style.width = "auto";
        ticketElement.style.height = "auto";
        ticketElement.style.maxHeight = "none";
        ticketElement.style.overflowY = "visible";

        setTimeout(() => {
            html2canvas(ticketElement, { scale: 3 }).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'ticket.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showAlert("Ticket descargado automáticamente. ¡Listo!", "success");
                if (typeof callback === 'function') {
                    callback();
                }
            }).catch(error => {
                console.error("Error al capturar el ticket:", error);
                showAlert("Hubo un problema al generar el ticket.", "danger");
                if (typeof callback === 'function') {
                    callback();
                }
            }).finally(() => {
                // Restaurar estilos
                ticketElement.style.width = originalStyles.width;
                ticketElement.style.height = originalStyles.height;
                ticketElement.style.maxHeight = originalStyles.maxHeight;
                ticketElement.style.overflowY = originalStyles.overflowY;
            });
        }, 400);
    }

    // =============== COMPARTIR TICKET (WEB SHARE API) ===============
    // Botón en #finalShareSection
    $("#shareTicketBtn").click(function() {
        compartirTicket();
    });

    function compartirTicket() {
        capturarTicketComoArchivo().then(file => {
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Mi Ticket',
                    text: 'Aquí está mi ticket de Lotería'
                })
                .then(() => {
                    showAlert('Ticket compartido correctamente.', 'success');
                })
                .catch(err => {
                    console.error('Error al compartir:', err);
                    showAlert('No se pudo compartir el ticket. Te lo descargamos.', 'warning');
                    descargarArchivo(file, 'ticket.png');
                });
            } else {
                showAlert('Este navegador no soporta Web Share con archivos. Descargando...', 'warning');
                descargarArchivo(file, 'ticket.png');
            }
        }).catch(err => {
            console.error("Error al capturar ticket:", err);
            showAlert('Error al capturar el ticket para compartir.', 'danger');
        });
    }

    function capturarTicketComoArchivo() {
        return new Promise((resolve, reject) => {
            const ticketElement = document.getElementById("preTicket");
            const originalStyles = {
                width: ticketElement.style.width,
                height: ticketElement.style.height,
                maxHeight: ticketElement.style.maxHeight,
                overflowY: ticketElement.style.overflowY
            };

            ticketElement.style.width = "auto";
            ticketElement.style.height = "auto";
            ticketElement.style.maxHeight = "none";
            ticketElement.style.overflowY = "visible";

            setTimeout(() => {
                html2canvas(ticketElement, { scale: 3 }).then(canvas => {
                    canvas.toBlob(blob => {
                        if (!blob) {
                            return reject(new Error("No se pudo generar blob del canvas."));
                        }
                        const file = new File([blob], 'ticket.png', { type: 'image/png' });
                        resolve(file);
                    }, 'image/png');
                }).catch(err => reject(err))
                  .finally(() => {
                    ticketElement.style.width = originalStyles.width;
                    ticketElement.style.height = originalStyles.height;
                    ticketElement.style.maxHeight = originalStyles.maxHeight;
                    ticketElement.style.overflowY = originalStyles.overflowY;
                  });
            }, 400);
        });
    }

    function descargarArchivo(file, filename) {
        const blobURL = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = blobURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobURL);
    }

    // =============== RESET FORM ==================
    $("#resetForm").click(function() {
        resetForm();
    });

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
        cashAppPayInitialized = false;
        ticketData = {};
        ticketId = null;

        if (cashAppPayInstance) {
            try {
                cashAppPayInstance.destroy();
                cashAppPayInstance = null;
                console.log('Cash App Pay instance destroyed in resetForm.');
            } catch (error) {
                console.error('Error al destruir Cash App Pay en resetForm:', error);
            }
        }
        localStorage.removeItem('ticketId');
        $("#ticketAlerts").empty();

        // Ocultar sección de compartir en cada reset
        $('#finalShareSection').hide();

        // Habilitar tracks
        $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
    }

    // =============== DESHABILITAR TRACKS POR HORA ==================
    function actualizarEstadoTracks() {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;

        const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);
        const fechaActual = new Date();
        const esMismoDia = fechaSeleccionada.toDateString() === fechaActual.toDateString();

        if (!esMismoDia) {
            $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
            return;
        }

        const ahora = new Date();
        for (let region in horariosCierre) {
            for (let track in horariosCierre[region]) {
                const horaCierreStr = horariosCierre[region][track];
                const [hCierre, mCierre] = horaCierreStr.split(":").map(Number);
                const horaCierreMilis = hCierre * 60 + mCierre;
                const ahoraMilis = ahora.getHours() * 60 + ahora.getMinutes();

                if (ahoraMilis >= horaCierreMilis) {
                    $(`.track-checkbox[value="${track}"]`)
                        .prop('disabled', true)
                        .prop('checked', false)
                        .closest('label').addClass('closed-track');
                } else {
                    $(`.track-checkbox[value="${track}"]`)
                        .prop('disabled', false)
                        .closest('label').removeClass('closed-track');
                }
            }
        }
    }

    $("#fecha").change(function() { actualizarEstadoTracks(); });
    setInterval(function() {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;
        const [mSel, dSel, ySel] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(ySel, mSel - 1, dSel);
        const fechaActual = new Date();
        if (fechaSeleccionada.toDateString() === fechaActual.toDateString()) {
            actualizarEstadoTracks();
        }
    }, 60000);

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
            } else if (horariosCierre["Santo Domingo"][track]) {
                cierreStr = horariosCierre["Santo Domingo"][track];
            } else if (horariosCierre.Venezuela[track]) {
                cierreStr = horariosCierre.Venezuela[track];
            }
            if (cierreStr) {
                const cierre = new Date(`1970-01-01T${cierreStr}:00`);
                cierre.setMinutes(cierre.getMinutes() - 5);
                const horas = cierre.getHours().toString().padStart(2, '0');
                const minutos = cierre.getMinutes().toString().padStart(2, '0');
                $(this).text(`Hora límite: ${horas}:${minutos}`);
            }
        });
    }

    function obtenerHoraLimite(track) {
        for (let region in horariosCierre) {
            if (horariosCierre[region][track]) {
                return horariosCierre[region][track];
            }
        }
        return null;
    }

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

    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // Al cargar la página
    agregarListenersNumeroApostado();
    resaltarDuplicados();
    mostrarHorasLimite();
    actualizarEstadoTracks();

});

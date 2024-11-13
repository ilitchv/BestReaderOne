 let fechaTransaccion = '';

$(document).ready(function() {

    // Define las URLs de tus APIs
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api/jugadas'; // Tu URL del backend en Render

    // Inicializar Flatpickr con selección de rango de fechas
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y", // Cambiado a MM-DD-YYYY
        minDate: "today",
        maxDate: null,
        defaultDate: null,
        allowInput: true,
        onChange: function(selectedDates, dateStr, instance) {
            selectedDays = selectedDates.length;
            console.log("Días seleccionados:", selectedDays);
            calcularTotal();
        },
    });

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;

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
            "Nacional": "20:30", // Domingos a las 17:50
            "Quiniela Pale": "20:30", // Domingos a las 15:30
            "Primera Día": "11:50",
            "Suerte Día": "12:20",
            "Lotería Real": "12:50",
            "Suerte Tarde": "17:50",
            "Lotedom": "17:50",
            "Primera Noche": "19:50",
            "Panama": "16:00",
            // Horarios especiales para domingos
            "Quiniela Pale Domingo": "15:30",
            "Nacional Domingo": "17:50"
        },
        "Venezuela": {
            "Venezuela": "19:00" // Asumiendo un horario de cierre para Venezuela
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
        "RD-Quiniela": { "straight": 100 }, // Actualizado a $100
        "RD-Pale": { "straight": 20 }, // Se mantiene en $20
        "Combo": { "combo": 50 } // Añadido
    };

    // Modalidades de juego
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
            alert("Has alcanzado el máximo de 100 jugadas.");
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
            alert("No hay jugadas para eliminar.");
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

    // Variables para almacenar el total global y el rol del usuario
    let totalJugadasGlobal = 0;
    const userRole = localStorage.getItem('userRole');
    console.log('User Role:', userRole);

    // Función para obtener el Application ID y Location ID desde el backend
    async function obtenerSquareCredentials() {
        try {
            const response = await fetch(`${BACKEND_API_URL}/square-credentials`);
            const data = await response.json();
            console.log('Credenciales recibidas del backend:', data);    
            return {
                applicationId: data.applicationId, // Corregido para acceder a 'applicationId'
                locationId: data.locationId        // Corregido para acceder a 'locationId'
            };
        } catch (error) {
            console.error('Error al obtener las credenciales de Square:', error);
            return null;
        }
    }

    // Función para inicializar Cash App Pay
    async function initializeCashAppPay(totalAmount) {
        console.log('Inicializando Cash App Pay con total:', totalAmount);
        if (!window.Square) {
            alert('El SDK de Square no se cargó correctamente.');
            console.error('Square SDK no está disponible.');
            return;
        }

        const credentials = await obtenerSquareCredentials();
        if (!credentials) {
            alert('No se pudo obtener las credenciales de Square.');
            console.error('Credenciales de Square no obtenidas.');
            return;
        }

        console.log('Credenciales de Square obtenidas:', credentials);

// Verificar que applicationId y locationId no sean undefined
    if (!credentials.applicationId || !credentials.locationId) {
        alert('Las credenciales de Square están incompletas.');
        console.error('applicationId o locationId están indefinidos.');
        return;
    }
     
        // Añadir un log para verificar el formato de locationId
        const cleanLocationId = credentials.locationId.trim();
        console.log('Formato de locationId:', cleanLocationId);

        try {
            const payments = window.Square.payments(credentials.applicationId, {
                locationId: cleanLocationId,
            });

            const paymentRequest = payments.paymentRequest({
                countryCode: 'US',
                currencyCode: 'USD',
                total: {
                    amount: totalAmount.toFixed(2),
                    label: 'Total',
                },
            });

            const cashAppPay = await payments.cashAppPay(paymentRequest);
            await cashAppPay.attach('#cash-app-pay');

            console.log('Cash App Pay adjuntado al contenedor.');

            cashAppPay.addEventListener('ontokenization', async (event) => {
                const { tokenResult } = event.detail;
                if (tokenResult.status === 'OK') {
                    console.log('Tokenización exitosa:', tokenResult.token);
                    // Procesar el pago en el backend
                    const paymentResult = await processPayment(tokenResult.token, totalAmount);
                    if (paymentResult.success) {
                        console.log('Pago procesado exitosamente.');
                        // Generar el ticket y guardar las jugadas
                        confirmarYGuardarTicket('Cash App');
                    } else {
                        alert('Error al tokenizar el pago: ' + tokenResult.errors[0].message);
                        console.error('Error en la tokenización del pago:', tokenResult.errors[0].message);
                    }
                } else {
                    alert('Error al tokenizar el pago: ' + tokenResult.errors[0].message);
                    console.error('Error en la tokenización del pago:', tokenResult.errors[0].message);
                }
            });

        } catch (error) {
            console.error('Error al inicializar Cash App Pay:', error);
            // Agregar un botón de prueba manualmente
            const testButton = document.createElement('button');
            testButton.innerText = 'Botón de Prueba Cash App Pay';
            testButton.classList.add('btn', 'btn-warning');
            document.getElementById('cash-app-pay').appendChild(testButton);

            testButton.addEventListener('click', () => {
                alert('Botón de prueba clickeado. El contenedor está funcionando.');
            });

            console.log('Botón de prueba agregado al contenedor de Cash App Pay.');
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

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error al procesar el pago:', error);
            return { success: false, error: error.message };
        }
    }

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Validar formulario
        const fecha = $("#fecha").val();
        console.log("Valor de fecha:", fecha);
        if (!fecha) {
            alert("Por favor, selecciona una fecha.");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        if (!tracks || tracks.length === 0) {
            alert("Por favor, selecciona al menos un track.");
            return;
        }

        // Validar que si se seleccionó el track "Venezuela", se haya seleccionado al menos un track de USA
        const tracksUSASeleccionados = tracks.filter(track => Object.keys(horariosCierre.USA).includes(track));
        if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
            alert("Para jugar en la modalidad 'Venezuela', debes seleccionar al menos un track de USA además de 'Venezuela'.");
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
                            alert(`El track "${track}" ya ha cerrado para hoy. Por favor, selecciona otro track o fecha.`);
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
                alert("Por favor, ingresa números apostados válidos (2, 3 o 4 dígitos).");
                return false;
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                alert("Por favor, selecciona una modalidad de juego válida.");
                return false;
            }

            // Nueva Validación: Verificar que la jugada tiene al menos un track seleccionado correspondiente a su modalidad
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
                alert(`La jugada con modalidad "${modalidad}" requiere al menos un track seleccionado correspondiente.`);
                return false; // Salir del bucle
            }

            if (["Venezuela", "Venezuela-Pale", "Pulito", "Pulito-Combinado", "RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                if (straight <= 0) {
                    jugadasValidas = false;
                    alert("Por favor, ingresa al menos una apuesta en Straight.");
                    return false;
                }
                if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
                    const box = $(this).find(".box").val().trim();
                    const acceptableBoxValues = ["1", "2", "3"];
                    const acceptableBoxCombinations = ["1,2", "2,3", "1,3", "1,2,3"];
                    const allAcceptableValues = acceptableBoxValues.concat(acceptableBoxCombinations);
                    if (!allAcceptableValues.includes(box)) {
                        jugadasValidas = false;
                        alert("En la modalidad Pulito o Pulito-Combinado, el campo 'Box' debe ser 1, 2, 3, 1,2, 2,3, 1,3 o 1,2,3.");
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
                    alert(`Por favor, ingresa al menos una apuesta en Straight, Box o Combo para ${modalidad}.`);
                    return false;
                }
            }
            // Validar límites
            if (limitesApuesta[modalidad]) {
                if (parseFloat($(this).find(".straight").val()) > (limitesApuesta[modalidad].straight || Infinity)) {
                    jugadasValidas = false;
                    alert(`El monto en Straight excede el límite para ${modalidad}.`);
                    return false;
                }
                if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado" && parseFloat($(this).find(".box").val()) > (limitesApuesta[modalidad].box || Infinity)) {
                    jugadasValidas = false;
                    alert(`El monto en Box excede el límite para ${modalidad}.`);
                    return false;
                }
                if (limitesApuesta[modalidad].combo !== undefined && parseFloat($(this).find(".combo").val()) > (limitesApuesta[modalidad].combo || Infinity)) {
                    jugadasValidas = false;
                    alert(`El monto en Combo excede el límite para ${modalidad}.`);
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
        // Generar número de ticket único de 8 dígitos
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

        // Mostrar las fechas de apuesta en el ticket
        $("#ticketFecha").text(fecha);
        console.log("Fechas asignadas a #ticketFecha:", $("#ticketFecha").text());

        // Calcular el total global
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Si el usuario es 'user', inicializar Cash App Pay
        if (userRole === 'user') {
            console.log('Usuario con rol "user" identificado. Inicializando Cash App Pay.');
            initializeCashAppPay(totalJugadasGlobal);
        }

        // Mostrar el modal usando Bootstrap 5
        ticketModal.show();
    });

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Evento para confirmar e imprimir el ticket
    $("#confirmarTicket").click(function() {
        if (userRole === 'user') {
            // Para usuarios regulares, el pago ya se procesó con Cash App Pay
            // Solo confirmamos y guardamos el ticket
            confirmarYGuardarTicket('Cash App');
        } else {
            // Para otros roles, asumimos pago en efectivo
            confirmarYGuardarTicket('Efectivo');
        }
    });

    // Función para confirmar y guardar el ticket
    function confirmarYGuardarTicket(metodoPago) {
        // Datos comunes a todas las jugadas
        const ticketNumber = $("#numeroTicket").text();
        const transactionDateTime = fechaTransaccion;
        const betDates = $("#ticketFecha").text();
        const tracks = $("#ticketTracks").text();
        const totalTicket = $("#ticketTotal").text();
        const timestamp = new Date().toISOString();

        // Array para almacenar las jugadas
        const jugadasData = [];

        // Recorrer cada jugada y preparar los datos
        $("#ticketJugadas tr").each(function() {
            // Generar número único de 8 dígitos para la jugada
            const jugadaNumber = generarNumeroUnico();

            const jugadaData = {
                "Ticket Number": ticketNumber,
                "Transaction DateTime": transactionDateTime,
                "Bet Dates": betDates,
                "Tracks": tracks,
                "Bet Number": $(this).find("td").eq(1).text(),
                "Game Mode": $(this).find("td").eq(2).text(),
                "Straight ($)": $(this).find("td").eq(3).text(),
                "Box ($)": $(this).find("td").eq(4).text() !== "-" ? $(this).find("td").eq(4).text() : "",
                "Combo ($)": $(this).find("td").eq(5).text() !== "-" ? $(this).find("td").eq(5).text() : "",
                "Total ($)": $(this).find("td").eq(6).text(),
                "Payment Method": metodoPago, // Añadido el método de pago
                "Jugada Number": jugadaNumber,
                "Timestamp": timestamp
            };

            // Añadir la jugada al array
            jugadasData.push(jugadaData);
        });

        // Enviar datos a ambos destinos
        enviarFormulario(jugadasData);
    }

    // Función para enviar datos a SheetDB y al Backend
    function enviarFormulario(datos) {
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
            console.log("SheetDB:", sheetDBResponse);
            console.log("Backend:", backendResponse);

            // Después de que ambas solicitudes se hayan completado con éxito

            // Imprimir el ticket
            window.print();

            // Opcional: Usar html2canvas para capturar solo el ticket
            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                // Obtener la imagen en formato data URL
                const imgData = canvas.toDataURL("image/png");
                // Crear un enlace para descargar la imagen
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
            alert("Ticket guardado y enviado exitosamente.");
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error al enviar datos:", textStatus, errorThrown);
            alert("Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.");
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
        // Resetear los placeholders
        $("#tablaJugadas tr").each(function() {
            actualizarPlaceholders("-", $(this));
        });
        resaltarDuplicados();
    }

    // Calcular y mostrar las horas límite junto a cada track
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

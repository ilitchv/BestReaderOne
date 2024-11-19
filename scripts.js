 $(document).ready(function() {
    // Define the URLs of your APIs
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Your SheetDB URL
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api/jugadas'; // Your backend URL

    // Initialize Flatpickr with multiple date selection
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y",
        minDate: "today",
        maxDate: null,
        defaultDate: null,
        allowInput: true,
        onChange: function(selectedDates, dateStr, instance) {
            selectedDays = selectedDates.length;
            console.log("Selected days:", selectedDays);
            calcularTotal();
        },
    });

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let cashAppPayInitialized = false; // Flag to avoid multiple initializations
    let paymentCompleted = false; // Payment state
    let totalJugadasGlobal = 0;
    let fechaTransaccion = '';
    let ticketData = {}; // Object to store ticket data for state preservation
    const userRole = localStorage.getItem('userRole') || 'user'; // Default to 'user' if not set
    console.log('User Role:', userRole);

    // Cash App Pay credentials
    const applicationId = 'sandbox-sq0idb-p0swM4gk8BWYR12HlUj4SQ'; // Replace with Production ID if necessary
    const locationId = 'L66P47FWVDFJS'; // Replace with Production ID if necessary

    // Close times by track
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

    // Betting limits by game mode
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

    // Function to determine game mode
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

    // Function to add a new play
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

    // Add initial play
    agregarJugada();

    // Event to add more plays
    $("#agregarJugada").click(function() {
        agregarJugada();
    });

    // Event to delete the last play
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

    // Track selection counter and days
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        // Exclude "Venezuela" from track count for total calculation
        selectedTracks = tracksSeleccionados.filter(track => track !== "Venezuela").length || 1;

        calcularTotal();
    });

    // Event to detect changes in input fields
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

    // Function to update placeholders based on game mode
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

    // Function to calculate the total of a play
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

        // Apply limits based on game mode
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight || straight);
            if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                box = Math.min(box, limitesApuesta[modalidad].box || box);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                combo = Math.min(combo, limitesApuesta[modalidad].combo || combo);
            }
        }

        // Calculate total based on game mode
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

    // Function to calculate the number of possible combinations
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

    // Function to calculate the total of all plays
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        console.log("Total before multiplication:", total);
        console.log("Selected tracks:", selectedTracks);
        console.log("Selected days:", selectedDays);

        if (selectedDays === 0) {
            total = 0;
        } else {
            total = (total * selectedTracks * selectedDays).toFixed(2);
        }
        console.log("Total after multiplication:", total);
        $("#totalJugadas").text(total);
    }

    // Initialize Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Function to detect if the device is mobile
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Function to show alerts using Bootstrap
    function showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        $("#ticketAlerts").html(alertHTML);
    }

    // Function to initialize Cash App Pay using Square SDK
    async function initializeCashAppPay(totalAmount) {
        console.log('Initializing Cash App Pay with total:', totalAmount);
        if (!window.Square) {
            showAlert('El SDK de Square no se cargó correctamente.', 'danger');
            console.error('Square SDK is not available.');
            return;
        }

        if (!applicationId || !locationId) {
            console.error('applicationId or locationId are undefined.');
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
                redirectURL: window.location.origin + window.location.pathname + '?payment=success',
                referenceId: 'my-distinct-reference-id-' + Date.now(),
            };

            const cashAppPay = await payments.cashAppPay(paymentRequest, options);

            console.log('Cash App Pay created:', cashAppPay);

            // Add listener for tokenization
            cashAppPay.addEventListener('ontokenization', async (event) => {
                const { tokenResult } = event.detail;
                if (tokenResult.status === 'OK') {
                    const token = tokenResult.token;
                    console.log('Tokenization successful:', token);
                    // Process the payment in the backend
                    const paymentResult = await processPayment(token, totalAmount);
                    if (paymentResult.success) {
                        console.log('Payment processed successfully.');
                        paymentCompleted = true; // Mark payment as completed
                        showAlert("Pago realizado exitosamente a través de Cash App Pay.", "success");
                        // Proceed to confirm and save the ticket
                        confirmarYGuardarTicket('Cash App');
                    } else {
                        showAlert('Error al procesar el pago: ' + paymentResult.error, 'danger');
                        console.error('Backend error processing payment:', paymentResult.error);
                    }
                } else if (tokenResult.status === 'CANCEL') {
                    showAlert('Pago cancelado por el usuario.', "warning");
                } else {
                    showAlert('Error al tokenizar el pago: ' + tokenResult.errors[0].message, "danger");
                    console.error('Payment tokenization error:', tokenResult.errors[0].message);
                }
            });

            // Add Cash App Pay button only for desktop
            if (!isMobileDevice()) {
                const buttonOptions = {
                    shape: 'semiround',
                    width: 'full',
                };
                await cashAppPay.attach('#cash-app-pay', buttonOptions);
                console.log('Cash App Pay attached to the container.');
            } else {
                // For mobile devices, redirect to Cash App
                const cashAppRedirect = await cashAppPay.cashAppRedirect();
                await cashAppRedirect.start();
            }

        } catch (error) {
            console.error('Error initializing Cash App Pay:', error);
            showAlert('Error al inicializar Cash App Pay: ' + error.message, 'danger');
        }
    }

    // Function to process the payment in the backend
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
                throw new Error(`Backend responded with error: ${errorText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error processing payment:', error);
            return { success: false, error: error.message };
        }
    }

    // Event to generate the ticket
    $("#generarTicket").click(function() {
        // Clear previous alerts
        $("#ticketAlerts").empty();

        // Validate form
        const fecha = $("#fecha").val();
        console.log("Fecha value:", fecha);
        if (!fecha) {
            showAlert("Por favor, selecciona una fecha.", "warning");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        if (!tracks || tracks.length === 0) {
            showAlert("Por favor, selecciona al menos un track.", "warning");
            return;
        }

        // Validate if "Venezuela" is selected along with at least one USA track
        const tracksUSASeleccionados = tracks.filter(track => Object.keys(horariosCierre.USA).includes(track));
        if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
            showAlert("Para jugar en la modalidad 'Venezuela', debes seleccionar al menos un track de USA además de 'Venezuela'.", "warning");
            return;
        }

        // Get selected dates as array
        const fechasArray = fecha.split(", ");
        const fechaActual = new Date();
        const yearActual = fechaActual.getFullYear();
        const monthActual = fechaActual.getMonth();
        const dayActual = fechaActual.getDate();
        const fechaActualSinHora = new Date(yearActual, monthActual, dayActual);

        // Validate each selected date
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

        // Validate plays
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

            // Validate that the play has at least one corresponding track selected
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
            // Validate limits
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

        // Prepare data for the ticket
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

        // Do not generate ticket number and QR code here
        // They will be generated after payment is successful

        // Display betting dates on the ticket
        $("#ticketFecha").text(fecha);
        console.log("Assigned dates to #ticketFecha:", $("#ticketFecha").text());

        // Calculate the global total
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Store necessary data for state preservation
        ticketData = {
            fecha: fecha,
            tracks: tracks,
            plays: $("#tablaJugadas").html(),
            totalAmount: totalJugadasGlobal,
            ticketJugadas: $("#ticketJugadas").html(),
            ticketTracks: tracksTexto,
            ticketFecha: fecha,
            selectedDays: selectedDays,
            selectedTracks: selectedTracks
        };

        // Store data in localStorage
        localStorage.setItem('ticketData', JSON.stringify(ticketData));

        // Show the modal using Bootstrap 5
        ticketModal.show();

        // Adjust the modal based on user role
        if (userRole === 'user') {
            // Show payment button
            if (!cashAppPayInitialized) {
                console.log('User with role "user" detected. Initializing Cash App Pay.');
                initializeCashAppPay(totalJugadasGlobal);
                cashAppPayInitialized = true;
            } else {
                console.log('Cash App Pay is already initialized.');
            }
        } else {
            // Hide payment button for non-'user' roles
            $('#cash-app-pay').empty();
            cashAppPayInitialized = false;
            // Optionally hide payment instructions
            $('.payment-instructions').hide();
        }
    });

    // Function to generate unique 8-digit ticket number
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Event to confirm and print the ticket
    $("#confirmarTicket").click(function() {
        // Clear previous alerts
        $("#ticketAlerts").empty();

        if (userRole === 'user') {
            if (paymentCompleted) {
                // Proceed with confirmation and printing
                confirmarYGuardarTicket('Cash App');
            } else {
                // Show alert in the modal
                showAlert("Por favor, procede con el pago haciendo clic en el botón Cash App Pay.", "warning");
            }
        } else {
            // For other roles, assume cash payment
            paymentCompleted = true; // Mark payment as completed
            confirmarYGuardarTicket('Efectivo');
        }
    });

    // Function to confirm and save the ticket
    function confirmarYGuardarTicket(metodoPago) {
        // Generate unique ticket number and QR code
        const numeroTicket = generarNumeroUnico();
        $("#numeroTicket").text(numeroTicket);

        // Generate transaction date and time
        fechaTransaccion = dayjs().format('MM-DD-YYYY hh:mm A');
        $("#ticketTransaccion").text(fechaTransaccion);

        // Generate QR code
        $("#qrcode").empty(); // Clear previous QR code
        new QRCode(document.getElementById("qrcode"), {
            text: numeroTicket,
            width: 128,
            height: 128,
        });

        // Update ticketData with new information
        ticketData.numeroTicket = numeroTicket;
        ticketData.fechaTransaccion = fechaTransaccion;

        // Data common to all plays
        const transactionDateTime = fechaTransaccion;
        const betDates = $("#ticketFecha").text();
        const tracks = $("#ticketTracks").text();
        const totalTicket = $("#ticketTotal").text();
        const timestamp = new Date().toISOString();

        // Array to store plays
        const jugadasData = [];

        // Iterate over each play and prepare data
        $("#ticketJugadas tr").each(function() {
            const jugadaNumber = generarNumeroUnico();

            const jugadaData = {
                "Ticket Number": numeroTicket,
                "Transaction DateTime": transactionDateTime,
                "Bet Dates": betDates,
                "Tracks": tracks,
                "Bet Number": $(this).find("td").eq(1).text(),
                "Game Mode": $(this).find("td").eq(2).text(),
                "Straight ($)": $(this).find("td").eq(3).text(),
                "Box ($)": $(this).find("td").eq(4).text() !== "-" ? $(this).find("td").eq(4).text() : "",
                "Combo ($)": $(this).find("td").eq(5).text() !== "-" ? $(this).find("td").eq(5).text() : "",
                "Total ($)": $(this).find("td").eq(6).text(),
                "Payment Method": metodoPago,
                "Jugada Number": jugadaNumber,
                "Timestamp": timestamp
            };

            jugadasData.push(jugadaData);
        });

        // Send data to both destinations
        enviarFormulario(jugadasData);
    }

    // Function to send data to SheetDB and Backend
    function enviarFormulario(datos) {
        // Send to SheetDB
        const sheetDBRequest = $.ajax({
            url: SHEETDB_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Send to Backend
        const backendRequest = $.ajax({
            url: BACKEND_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(datos)
        });

        // Wait for both requests to complete
        $.when(sheetDBRequest, backendRequest).done(function(sheetDBResponse, backendResponse) {
            console.log("Data sent to both destinations:");
            console.log("SheetDB:", sheetDBResponse);
            console.log("Backend:", backendResponse);

            // Show success message
            showAlert("Ticket guardado y enviado exitosamente.", "success");

            // After both requests have completed successfully

            // Print the ticket
            window.print();

            // Optional: Use html2canvas to capture only the ticket
            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'ticket.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Optional: Share the ticket if the API is available
                if (navigator.share) {
                    navigator.share({
                        title: 'Tu Ticket de Apuesta',
                        text: 'Aquí está tu ticket de apuesta.',
                        files: [dataURLtoFile(imgData, 'ticket.png')]
                    }).then(() => {
                        console.log('Ticket shared successfully.');
                    }).catch((error) => {
                        console.error('Error sharing the ticket:', error);
                    });
                }
            });

            // Close the modal
            ticketModal.hide();

            // Reset the form
            resetForm();

            // Clear stored data
            localStorage.removeItem('ticketData');
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error sending data:", textStatus, errorThrown);
            showAlert("Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.", "danger");
        });
    }

    // Function to reset the form
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
        // Clear stored data
        localStorage.removeItem('ticketData');
    }

    // Function to show cutoff times next to each track
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
                cierre.setMinutes(cierre.getMinutes() - 5);
                const horas = cierre.getHours().toString().padStart(2, '0');
                const minutos = cierre.getMinutes().toString().padStart(2, '0');
                const horaLimite = `${horas}:${minutos}`;
                $(this).text(`Hora límite: ${horaLimite}`);
            }
        });
    }

    // Function to get the cutoff time of a track
    function obtenerHoraLimite(track) {
        for (let region in horariosCierre) {
            if (horariosCierre[region][track]) {
                return horariosCierre[region][track];
            }
        }
        return null;
    }

    // Function to highlight duplicate numbers
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

    // Function to add listeners to the number input fields
    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // Function to convert dataURL to File (for sharing)
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    // Add listeners on page load
    agregarListenersNumeroApostado();
    resaltarDuplicados();

    // Call the function to show cutoff times on page load
    mostrarHorasLimite();

    // Check for payment success and restore state
    $(document).ready(function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'success') {
            const storedTicketData = JSON.parse(localStorage.getItem('ticketData'));
            if (storedTicketData) {
                console.log('Restoring state after payment success.');
                // Restore ticket data
                $("#fecha").val(storedTicketData.fecha);
                $("#tablaJugadas").html(storedTicketData.plays);
                $("#ticketJugadas").html(storedTicketData.ticketJugadas);
                $("#ticketTracks").text(storedTicketData.ticketTracks);
                $("#ticketFecha").text(storedTicketData.ticketFecha);
                selectedDays = storedTicketData.selectedDays;
                selectedTracks = storedTicketData.selectedTracks;
                totalJugadasGlobal = storedTicketData.totalAmount;
                $("#totalJugadas").text(totalJugadasGlobal);
                // Set paymentCompleted to true
                paymentCompleted = true;
                // Show the modal again
                ticketModal.show();
                // Proceed to confirm and save the ticket
                confirmarYGuardarTicket('Cash App');
            } else {
                console.error('No ticket data found in localStorage.');
            }
        }
    });

});

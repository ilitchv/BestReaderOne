 /***************************************************************************************
 * scripts.js
 * Versión ajustada para recibir/enviar JSON al backend (en lugar de multipart/form-data),
 * manteniendo todo el flujo de la app como ya lo tienes (jugadas, tracks, etc.).
 ***************************************************************************************/

$(document).ready(function() {

    // Define las URLs de tus APIs
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api/tickets'; // Ruta actualizada del backend

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

    // Variables globales
    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let totalJugadasGlobal = 0;

    let ticketData = {};   // Objeto para almacenar datos del ticket
    let ticketId = null;   // ID único de ticket (devuelto por el backend)
    const userRole = localStorage.getItem('userRole') || 'user';
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

    /***************************************************************************************
     * Función para determinar la modalidad de juego
     ***************************************************************************************/
    function determinarModalidad(tracks, numero, fila) {
        let modalidad = "-";

        const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD  = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
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

    /***************************************************************************************
     * Función para agregar una nueva jugada
     ***************************************************************************************/
    function agregarJugada() {
        if (jugadaCount >= 100) {
            showAlert("Has alcanzado el máximo de 100 jugadas.", "danger");
            return;
        }
        jugadaCount++;

        const fila = `
            <tr>
                <td>${jugadaCount}</td>
                <td>
                  <input type="number" class="form-control numeroApostado" min="0" max="9999" required>
                </td>
                <td class="tipoJuego">-</td>
                <td>
                  <input type="number" class="form-control straight" min="0" max="100.00" step="1" placeholder="Ej: 5">
                </td>
                <td>
                  <input type="number" class="form-control box" step="1" placeholder="Ej: 2" >
                </td>
                <td>
                  <input type="number" class="form-control combo" step="0.10" placeholder="Ej: 3.00" >
                </td>
                <td class="total">0.00</td>
            </tr>
        `;

        $("#tablaJugadas").append(fila);

        // Agregar listeners a los nuevos campos
        agregarListenersNumeroApostado();
        resaltarDuplicados();

        // Enfocar el cursor en la nueva jugada
        $("#tablaJugadas tr:last .numeroApostado").focus();
    }

    // Agregar la jugada inicial
    agregarJugada();

    /***************************************************************************************
     * Eventos para agregar y eliminar jugadas
     ***************************************************************************************/
    $("#agregarJugada").click(function() {
        agregarJugada();
    });

    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        // Recalcular el ID de cada jugada en la tabla
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index + 1);
        });
        calcularTotal();
    });

    /***************************************************************************************
     * Manejo de selección de tracks
     ***************************************************************************************/
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked")
            .map(function() { return $(this).val(); }).get();

        // Excluir "Venezuela" del conteo de tracks para el cálculo
        selectedTracks = tracksSeleccionados.filter(track => track !== "Venezuela").length || 1;
        calcularTotal();
    });

    /***************************************************************************************
     * Detectar cambios en los campos (numero, straight, box, combo)
     ***************************************************************************************/
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
        const fila = $(this).closest("tr");
        const num  = fila.find(".numeroApostado").val();
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const modalidad = determinarModalidad(tracks, num, fila);

        // Actualiza la columna "tipoJuego"
        fila.find(".tipoJuego").text(modalidad);

        // Ajusta placeholders y des/habilita campos
        actualizarPlaceholders(modalidad, fila);

        // Recalcular el total de la jugada
        calcularTotalJugada(fila);

        // Recalcular el total global
        calcularTotal();
    });

    /***************************************************************************************
     * Función para calcular combinaciones
     ***************************************************************************************/
    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        let factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            if (counts.hasOwnProperty(digit)) {
                denominator *= factorial(counts[digit]);
            }
        }
        return factorial(totalDigits) / denominator;
    }

    /***************************************************************************************
     * Función para calcular el total de una jugada
     ***************************************************************************************/
    function calcularTotalJugada(fila) {
        const modalidad = fila.find(".tipoJuego").text();
        const numero    = fila.find(".numeroApostado").val();

        if (!numero || numero.length < 2 || numero.length > 4) {
            fila.find(".total").text("0.00");
            return;
        }

        const combinaciones = calcularCombinaciones(numero);

        let straight = parseFloat(fila.find(".straight").val()) || 0;
        let boxVal   = fila.find(".box").val().trim();
        let boxNum   = boxVal ? parseFloat(boxVal) : 0;
        let comboVal = fila.find(".combo").val().trim();
        let comboNum = comboVal ? parseFloat(comboVal) : 0;

        // Aplicar límites
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight ?? straight);
            if (limitesApuesta[modalidad].box !== undefined &&
                modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                boxNum = Math.min(boxNum, limitesApuesta[modalidad].box ?? boxNum);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo ?? comboNum);
            }
        }

        // Calcular total según modalidad
        let total = 0;
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            // Multiplicar straight * cuantos valores box
            const boxValues = boxVal.split(",").filter(v => v !== "");
            total = straight * boxValues.length;
        } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
            total = straight;
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            total = straight + boxNum + (comboNum * combinaciones);
        } else if (modalidad === "Combo") {
            total = comboNum;
        } else {
            // Caso general
            total = straight + boxNum + comboNum;
        }

        fila.find(".total").text(total.toFixed(2));
    }

    /***************************************************************************************
     * Función para calcular total de todas las jugadas
     ***************************************************************************************/
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });

        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracks);
        console.log("Días seleccionados:", selectedDays);

        // Si no hay días seleccionados => total = 0
        if (selectedDays === 0) {
            total = 0;
        } else {
            // Multiplicar por # tracks y # days
            total = (total * selectedTracks * selectedDays);
        }

        console.log("Total después de multiplicar:", total.toFixed(2));
        $("#totalJugadas").text(total.toFixed(2));
    }

    /***************************************************************************************
     * Bootstrap Modal
     ***************************************************************************************/
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    /***************************************************************************************
     * Función para mostrar alertas
     ***************************************************************************************/
    function showAlert(message, type) {
        const alertHTML = `
          <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
          </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    /***************************************************************************************
     * Función para generar un número de ticket interno (antes de confirmar)
     ***************************************************************************************/
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    /***************************************************************************************
     * Función para agregar listeners a los campos de número apostado
     ***************************************************************************************/
    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    /***************************************************************************************
     * Función para resaltar duplicados
     ***************************************************************************************/
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

    /***************************************************************************************
     * Función para actualizar placeholders de cada fila según modalidad
     ***************************************************************************************/
    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight")
                .attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight ?? "?"}`)
                .prop('disabled', false);
        } else {
            fila.find(".straight")
                .attr("placeholder", "Ej: 5.00")
                .prop('disabled', false);
        }

        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box")
                .attr("placeholder", "1,2,3")
                .prop('disabled', false);
            fila.find(".combo")
                .attr("placeholder", "No aplica")
                .prop('disabled', true)
                .val('');
        } else if (
            modalidad === "Venezuela" ||
            modalidad === "Venezuela-Pale" ||
            modalidad.startsWith("RD-")
        ) {
            fila.find(".box")
                .attr("placeholder", "No aplica")
                .prop('disabled', true)
                .val('');
            fila.find(".combo")
                .attr("placeholder", "No aplica")
                .prop('disabled', true)
                .val('');
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            fila.find(".box")
                .attr("placeholder", `Máx $${limitesApuesta[modalidad].box ?? "?"}`)
                .prop('disabled', false);
            fila.find(".combo")
                .attr("placeholder", `Máx $${limitesApuesta[modalidad].combo ?? "?"}`)
                .prop('disabled', false);
        } else if (modalidad === "Combo") {
            fila.find(".straight")
                .attr("placeholder", "No aplica")
                .prop('disabled', true)
                .val('');
            fila.find(".box")
                .attr("placeholder", "No aplica")
                .prop('disabled', true)
                .val('');
            fila.find(".combo")
                .attr("placeholder", `Máx $${limitesApuesta.Combo.combo}`)
                .prop('disabled', false);
        } else {
            // Caso general
            fila.find(".box")
                .attr("placeholder", "Ej: 2.00")
                .prop('disabled', false);
            fila.find(".combo")
                .attr("placeholder", "Ej: 3.00")
                .prop('disabled', false);
        }
    }

    /***************************************************************************************
     * Función para deshabilitar tracks según su hora de cierre
     ***************************************************************************************/
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
                    // Deshabilitar
                    $(`.track-checkbox[value="${track}"]`)
                        .prop('disabled', true)
                        .prop('checked', false)
                        .closest('label').addClass('closed-track');
                } else {
                    // Habilitar
                    $(`.track-checkbox[value="${track}"]`)
                        .prop('disabled', false)
                        .closest('label').removeClass('closed-track');
                }
            }
        }
    }

    // Llamar al cargar
    actualizarEstadoTracks();

    // Cambia la fecha => actualizar tracks
    $("#fecha").change(function() {
        actualizarEstadoTracks();
    });

    // Actualizar cada minuto
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

    // Mostrar horas límite
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
                let parts = cierreStr.split(":");
                let cierre = new Date(`1970-01-01T${cierreStr}:00`);
                cierre.setMinutes(cierre.getMinutes() - 5);
                let horas   = cierre.getHours().toString().padStart(2, '0');
                let minutos = cierre.getMinutes().toString().padStart(2, '0');
                $(this).text(`Hora límite: ${horas}:${minutos}`);
            }
        });
    }
    mostrarHorasLimite();

    /***************************************************************************************
     * Evento para generar el ticket
     ***************************************************************************************/
    $("#generarTicket").click(function() {
        // Limpiar alertas
        $("#ticketAlerts").empty();

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

        // Validar jugadas
        let jugadasValidas = true;
        const jugadasArray = [];
        $("#tablaJugadas tr").each(function() {
            const numero    = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight  = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal    = $(this).find(".box").val();
            const comboVal  = $(this).find(".combo").val();
            const totalFila = parseFloat($(this).find(".total").text()) || 0;

            if (!numero || numero.length < 2 || numero.length > 4) {
                jugadasValidas = false;
                showAlert("Ingresa números válidos (2, 3 o 4 dígitos).", "danger");
                return false; // break each
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                showAlert("Selecciona una modalidad de juego válida.", "danger");
                return false;
            }
            if (totalFila <= 0) {
                jugadasValidas = false;
                showAlert("Apuesta inválida, revisa straight/box/combo.", "danger");
                return false;
            }

            // Convertir box/combo a num o null
            let boxNum   = (boxVal && !isNaN(boxVal)) ? parseFloat(boxVal) : null;
            let comboNum = (comboVal && !isNaN(comboVal)) ? parseFloat(comboVal) : null;

            // Estructura requerida: AÑADIMOS "Ticket Number" => un placeholder
            const jugadaObj = {
                "Ticket Number": "PEND-XXXX", // Placeholder (el backend exige algo)
                numero: numero,
                modalidad: modalidad,
                straight: straight,
                box: boxNum,
                combo: comboNum,
                total: totalFila
            };
            jugadasArray.push(jugadaObj);
        });

        if (!jugadasValidas) return;

        // Calcular total
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Transformar las fechas a formato ISO
        const fechasSeleccionadas = fecha.split(", ").map(fechaStr => {
            const [m, d, y] = fechaStr.split('-').map(Number);
            // Convertir a "YYYY-MM-DD"
            return `${y}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        });

        // Construir ticketData
        ticketData = {
            fecha: fechasSeleccionadas, // Array de "YYYY-MM-DD"
            tracks: tracks,             // Array de tracks
            jugadas: jugadasArray,      // Array de jugadas con "Ticket Number"
            totalAmount: totalJugadasGlobal,
            selectedDays: selectedDays,
            selectedTracks: selectedTracks
        };

        console.log("Fechas asignadas a #ticketFecha:", fecha);
        console.log("Datos del Ticket a Enviar:", ticketData);

        // Obtener token de localStorage
        const token = localStorage.getItem('token');
        console.log("Token de Autenticación:", token);

        // Enviar al backend como JSON
        $.ajax({
            url: `${BACKEND_API_URL}/store-ticket`, // URL actualizada
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            data: JSON.stringify(ticketData),
            success: function(response) {
                if (response.ticketId) {
                    ticketId = response.ticketId;
                    // Guardar ticketId
                    localStorage.setItem('ticketId', ticketId);

                    // Limpiar campos en modal
                    $("#numeroTicket").text('');
                    $("#ticketTransaccion").text('');
                    $("#qrcode").empty();

                    // Mostrar modal
                    ticketModal.show();
                } else {
                    showAlert("Error al almacenar los datos del ticket.", "danger");
                }
            },
            error: function(error) {
                console.error('Error al almacenar los datos del ticket:', error);
                const errorMsg = (error.responseJSON && error.responseJSON.error)
                  ? error.responseJSON.error
                  : 'Error al almacenar los datos del ticket. Intenta de nuevo.';
                showAlert(errorMsg, 'danger');
            }
        });
    });

    /***************************************************************************************
     * Manejo de la carga de ventana para recuperar el ticketData
     ***************************************************************************************/
    $(window).on('load', function() {
        ticketId = localStorage.getItem('ticketId');
        if (ticketId) {
            $.ajax({
                url: `${BACKEND_API_URL}/retrieve-ticket`, // URL actualizada
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({ ticketId: ticketId }),
                success: function(response) {
                    if (response.ticketData) {
                        ticketData = response.ticketData;
                        $("#ticketTracks").text(ticketData.tracks.join(", "));
                        $("#ticketJugadas").html(ticketData.ticketJugadasHTML || '');
                        $("#ticketTotal").text(ticketData.totalAmount?.toFixed(2) || '0.00');
                        $("#ticketFecha").text(ticketData.fecha?.join(", ") || '');

                        $("#numeroTicket").text('');
                        $("#ticketTransaccion").text('');
                        $("#qrcode").empty();

                        ticketModal.show();
                    } else {
                        showAlert('Error al recuperar los datos del ticket.', 'danger');
                        localStorage.removeItem('ticketId');
                    }
                },
                error: function(error) {
                    console.error('Error al recuperar datos del ticket:', error);
                    showAlert('Error al recuperar datos del ticket.', 'danger');
                    localStorage.removeItem('ticketId');
                }
            });
        }
    });

    /***************************************************************************************
     * Confirmar e imprimir ticket (aquí se añade "Ticket Number" real a cada jugada)
     ***************************************************************************************/
    $("#confirmarTicket").click(function() {
        $("#ticketAlerts").empty();

        const numeroTicket = generarNumeroUnico();
        $("#numeroTicket").text(numeroTicket);

        const fechaTransaccion = dayjs().format('MM-DD-YYYY hh:mm A');
        $("#ticketTransaccion").text(fechaTransaccion);

        // Generar QR
        $("#qrcode").empty();
        new QRCode(document.getElementById("qrcode"), {
            text: numeroTicket,
            width: 128,
            height: 128,
        });

        // Actualizar jugadas con "Ticket Number" real
        if (ticketData.jugadas) {
            ticketData.jugadas.forEach(j => {
                j["Ticket Number"] = numeroTicket;
            });
        }

        // Enviar formulario a SheetDB y backend (save-jugadas)
        enviarFormulario(ticketData.jugadas);
    });

    /***************************************************************************************
     * Función para enviar a SheetDB y al backend
     ***************************************************************************************/
    function enviarFormulario(jugadas) {
        // 1) Enviar a SheetDB
        const sheetDBRequest = $.ajax({
            url: SHEETDB_API_URL,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(jugadas)
        });

        // 2) Enviar al backend /save-jugadas
        const backendRequest = $.ajax({
            url: `${BACKEND_API_URL}/save-jugadas`, // URL actualizada
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(jugadas)
        });

        $.when(sheetDBRequest, backendRequest).done(function(sheetDBResponse, backendResponse) {
            console.log("Datos enviados a ambos destinos:");
            console.log("SheetDB:", sheetDBResponse);
            console.log("Backend:", backendResponse);

            showAlert("Ticket guardado y enviado exitosamente.", "success");

            // Imprimir
            window.print();

            // Descargar imagen
            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'ticket.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            // Cerrar modal
            ticketModal.hide();

            // Reiniciar formulario
            resetForm();

            // Limpiar ticketData
            ticketData = {};
            ticketId = null;
            localStorage.removeItem('ticketId');

            // Limpiar parámetros URL
            const newURL = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newURL);

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error al enviar datos:", textStatus, errorThrown);
            let errorMsg = "Hubo un problema al enviar los datos.";
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMsg = jqXHR.responseJSON.error;
            }
            showAlert(errorMsg, "danger");
        });
    }

    /***************************************************************************************
     * Botón de reset
     ***************************************************************************************/
    $("#resetForm").click(function() {
        resetForm();
    });

    /***************************************************************************************
     * Función para reiniciar formulario
     ***************************************************************************************/
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");

        // Resetear placeholders
        $("#tablaJugadas tr").each(function() {
            actualizarPlaceholders("-", $(this));
        });

        resaltarDuplicados();

        ticketData = {};
        ticketId = null;
        localStorage.removeItem('ticketId');

        $("#ticketAlerts").empty();
        $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
    }

});  // fin document.ready

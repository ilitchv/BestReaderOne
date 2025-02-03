 /***************************************************************************************
 * scripts.js
 * 
 * Versión actualizada para:
 * - Recopilar la información del ticket (fechas, tracks, jugadas, total).
 * - Mostrar en el modal de previsualización la información preliminar del ticket 
 *   (sin número de ticket, sin fecha de transacción y sin código QR).
 * - Hacer visible el botón “Confirmar e Imprimir” para continuar el flujo.
 * - Se han eliminado las verificaciones y el envío de token en las llamadas AJAX,
 *   para evitar errores de “Token expirado” y cortar el flujo.
 ***************************************************************************************/

$(document).ready(function() {

    // -------------------- Configuraciones Generales --------------------
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api/tickets'; // Ruta del backend
    // Para efectos de este flujo, se ignoran los tokens. (No se usa la cabecera Authorization)
    // const token = localStorage.getItem('token'); // Comentado para evitar validación
    const userRole = localStorage.getItem('userRole') || 'user';
    console.log('User Role:', userRole);

    // Se asigna un valor predeterminado para el email, ya que no se obtiene desde el perfil
    let userEmail = "usuario@example.com";

    // -------------------- Variables Globales --------------------
    let jugadaCount = 0;
    let selectedDays = 0;
    let selectedTracks = 0; // Número de tracks seleccionados
    let totalJugadasGlobal = 0;
    let ticketData = {};   // Datos que se enviarán al backend
    let ticketId = null;

    // -------------------- Horarios de Cierre y Límites --------------------
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

    // -------------------- Inicializar Flatpickr --------------------
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y",
        minDate: "today",
        allowInput: true,
        onChange: function(selectedDates) {
            selectedDays = selectedDates.length;
            console.log("Días seleccionados:", selectedDays);
            calcularTotal();
            actualizarEstadoTracks();
        }
    });

    // -------------------- Función para Agregar una Jugada --------------------
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
                <td><input type="number" class="form-control straight" step="1" min="0" placeholder="Ej: 5"></td>
                <td><input type="number" class="form-control box" step="1" placeholder="Ej: 2"></td>
                <td><input type="number" class="form-control combo" step="0.10" placeholder="Ej: 3.00"></td>
                <td class="total">0.00</td>
            </tr>
        `;
        $("#tablaJugadas").append(fila);
        agregarListenersNumeroApostado();
        resaltarDuplicados();
        $("#tablaJugadas tr:last .numeroApostado").focus();
    }
    // Jugada inicial
    agregarJugada();

    // -------------------- Eventos para Agregar/Eliminar Jugadas --------------------
    $("#agregarJugada").click(agregarJugada);
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

    // -------------------- Manejo de Selección de Tracks --------------------
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        selectedTracks = tracksSeleccionados.length || 1;
        calcularTotal();
    });

    // -------------------- Eventos en la Tabla de Jugadas --------------------
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

    // -------------------- Función para Determinar Modalidad --------------------
    function determinarModalidad(tracks, numero, fila) {
        if (!numero) return "-";
        const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
        const incluyeVenezuela = tracks.includes("Venezuela");
        const longitud = numero.length;
        const boxValue = fila.find(".box").val().trim();
        const acceptableBoxValues = ["1", "2", "3"];
        const acceptableBoxCombinations = ["1,2", "2,3", "1,3", "1,2,3"];
        if (incluyeVenezuela && esUSA) {
            if (longitud === 2) return "Venezuela";
            else if (longitud === 4) return "Venezuela-Pale";
        } else if (esUSA && !esSD) {
            if (longitud === 4) return "Win 4";
            else if (longitud === 3) return "Peak 3";
            else if (longitud === 2) {
                if (acceptableBoxValues.includes(boxValue)) return "Pulito";
                if (acceptableBoxCombinations.includes(boxValue)) return "Pulito-Combinado";
            }
        } else if (esSD && !esUSA) {
            if (longitud === 2) return "RD-Quiniela";
            else if (longitud === 4) return "RD-Pale";
        }
        return "-";
    }

    // -------------------- Función para Actualizar Placeholders --------------------
    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight")
                .attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight}`)
                .prop('disabled', false);
        } else {
            fila.find(".straight")
                .attr("placeholder", "Ej: 5.00")
                .prop('disabled', false);
        }
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box").attr("placeholder", "1,2,3").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            fila.find(".box").attr("placeholder", `Máx $${limitesApuesta[modalidad].box}`).prop('disabled', false);
            fila.find(".combo").attr("placeholder", `Máx $${limitesApuesta[modalidad].combo}`).prop('disabled', false);
        } else if (modalidad === "Combo") {
            fila.find(".straight").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", `Máx $${limitesApuesta.Combo.combo}`).prop('disabled', false);
        } else {
            fila.find(".box").attr("placeholder", "Ej: 2.00").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "Ej: 3.00").prop('disabled', false);
        }
    }

    // -------------------- Función para Calcular Total de una Jugada --------------------
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
        let boxNum = boxVal ? parseFloat(boxVal) : 0;
        let comboVal = fila.find(".combo").val().trim();
        let comboNum = comboVal ? parseFloat(comboVal) : 0;
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight);
            if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                boxNum = Math.min(boxNum, limitesApuesta[modalidad].box);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo);
            }
        }
        let total = 0;
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            const boxValues = boxVal.split(',').filter(v => v !== '');
            total = straight * boxValues.length;
        } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
            total = straight;
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            total = straight + boxNum + (comboNum * combinaciones);
        } else if (modalidad === "Combo") {
            total = comboNum;
        } else {
            total = straight + boxNum + comboNum;
        }
        fila.find(".total").text(total.toFixed(2));
    }

    // -------------------- Función para Calcular Combinaciones --------------------
    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            denominator *= factorial(counts[digit]);
        }
        return factorial(totalDigits) / denominator;
    }

    // -------------------- Función para Calcular el Total Global --------------------
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
            total = total * selectedTracks * selectedDays;
        }
        console.log("Total después de multiplicar:", total.toFixed(2));
        $("#totalJugadas").text(total.toFixed(2));
    }

    // -------------------- Función para Resaltar Duplicados --------------------
    function resaltarDuplicados() {
        const campos = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();
        campos.forEach(campo => {
            const valor = campo.value.trim();
            if (valor) {
                if (valores[valor]) {
                    duplicados.add(valor);
                } else {
                    valores[valor] = true;
                }
            }
        });
        campos.forEach(campo => {
            if (duplicados.has(campo.value.trim())) {
                campo.classList.add('duplicado');
            } else {
                campo.classList.remove('duplicado');
            }
        });
    }

    function agregarListenersNumeroApostado() {
        const campos = document.querySelectorAll('.numeroApostado');
        campos.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // -------------------- Función para Actualizar Estado de los Tracks --------------------
    function actualizarEstadoTracks() {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;
        const [m, d, y] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(y, m - 1, d);
        const fechaActual = new Date();
        const esMismoDia = (fechaSeleccionada.toDateString() === fechaActual.toDateString());
        if (!esMismoDia) {
            $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
            return;
        }
        const ahora = new Date();
        const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes();
        for (let region in horariosCierre) {
            for (let track in horariosCierre[region]) {
                const [hC, mC] = horariosCierre[region][track].split(":").map(Number);
                const horaCierre = hC * 60 + mC;
                if (ahoraMins >= horaCierre) {
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
    actualizarEstadoTracks();
    setInterval(() => {
        const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
        if (!fechaSeleccionadaStr) return;
        const [m, d, y] = fechaSeleccionadaStr.split('-').map(Number);
        const fechaSeleccionada = new Date(y, m - 1, d);
        const fechaActual = new Date();
        if (fechaSeleccionada.toDateString() === fechaActual.toDateString()) {
            actualizarEstadoTracks();
        }
    }, 60000);

    // -------------------- Función para Mostrar Horas Límite en la UI --------------------
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
                const [hh, mm] = cierreStr.split(":").map(Number);
                const cutoff = new Date();
                cutoff.setHours(hh, mm - 5, 0, 0);
                const horas = cutoff.getHours().toString().padStart(2, '0');
                const minutos = cutoff.getMinutes().toString().padStart(2, '0');
                $(this).text(`Hora límite: ${horas}:${minutos}`);
            }
        });
    }
    mostrarHorasLimite();

    // -------------------- Función para Mostrar Alertas --------------------
    function showAlert(message, type) {
        const alertHTML = `
          <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
          </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    // -------------------- Modal Bootstrap --------------------
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // -------------------- Función para Mostrar Previsualización del Ticket --------------------
    // Muestra la información preliminar sin número de ticket, sin fecha de transacción y sin QR.
    // Se fuerza la visualización del contenedor del botón “Confirmar e Imprimir”.
    function mostrarPreTicketModal(tData, isConfirmed) {
        $("#ticketAlerts").empty();
        $("#ticketFecha").text(tData.fecha.join(', '));
        $("#ticketTracks").text(tData.tracks.join(', '));
        $("#ticketTotal").text(tData.totalAmount.toFixed(2));
        const tbody = $("#ticketJugadas");
        tbody.empty();
        tData.jugadas.forEach((jug, index) => {
            const row = `
              <tr>
                <td>${index + 1}</td>
                <td>${jug.numero}</td>
                <td>${jug.modalidad}</td>
                <td>${jug.straight.toFixed(2)}</td>
                <td>${jug.box !== null ? jug.box.toFixed(2) : '-'}</td>
                <td>${jug.combo !== null ? jug.combo.toFixed(2) : '-'}</td>
                <td>$${jug.total.toFixed(2)}</td>
              </tr>
            `;
            tbody.append(row);
        });
        // Para la previsualización preliminar, ocultamos el número de ticket, la fecha de transacción y el QR.
        $("#numeroTicket").text('').parent().hide();
        $("#ticketTransaccion").text('').parent().hide();
        $("#qrcode").empty().parent().parent().hide();
        // Aseguramos que el contenedor del botón "Confirmar e Imprimir" se muestre:
        $("#confirmarTicketContainer").show();
    }

    // -------------------- Evento para Generar Ticket (Previsualización) --------------------
    $("#generarTicket").click(function() {
        $("#ticketAlerts").empty();
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
        let jugadasValidas = true;
        const jugadasArray = [];
        $("#tablaJugadas tr").each(function() {
            const numero = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal = $(this).find(".box").val();
            const comboVal = $(this).find(".combo").val();
            const totalFila = parseFloat($(this).find(".total").text()) || 0;
            if (!numero || numero.length < 2 || numero.length > 4) {
                jugadasValidas = false;
                showAlert("Ingresa números válidos (2, 3 o 4 dígitos).", "danger");
                return false;
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
            let boxNum = (boxVal && !isNaN(boxVal)) ? parseFloat(boxVal) : null;
            let comboNum = (comboVal && !isNaN(comboVal)) ? parseFloat(comboVal) : null;
            const jugadaObj = {
                "Ticket Number": "PEND-XXXX", // Placeholder
                numero: numero,
                modalidad: modalidad,
                straight: straight,
                box: boxNum,
                combo: comboNum,
                total: totalFila,
                jugadaNumber: jugadaCount // O asigna según corresponda
            };
            jugadasArray.push(jugadaObj);
        });
        if (!jugadasValidas) return;
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());
        const fechasSeleccionadas = fecha.split(", ").map(fStr => {
            const [m, d, y] = fStr.split('-').map(Number);
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        });
        ticketData = {
            fecha: fechasSeleccionadas,
            tracks: tracks,
            jugadas: jugadasArray,
            totalAmount: totalJugadasGlobal,
            selectedDays: selectedDays,
            selectedTracks: selectedTracks
        };
        console.log("Datos del Ticket (pre-confirmación):", ticketData);
        // Mostrar previsualización sin confirmar (sin ticketId, sin fechaTransacción, sin QR)
        mostrarPreTicketModal(ticketData, false);
        ticketModal.show();
    });

    // -------------------- Evento para Confirmar e Imprimir Ticket --------------------
    $("#confirmarTicket").click(async function() {
        try {
            $("#ticketAlerts").empty();
            // Generar número de ticket y fecha de transacción
            const numeroTicket = generarNumeroUnico();
            const fechaTransaccion = dayjs().format('YYYY-MM-DD HH:mm:ss');
            // Actualizar modal con estos datos y generar el QR
            $("#numeroTicket").text(numeroTicket).parent().show();
            $("#ticketTransaccion").text(fechaTransaccion).parent().show();
            $("#qrcode").empty();
            new QRCode(document.getElementById("qrcode"), numeroTicket);
            // Actualizar cada jugada en ticketData con el número real del ticket
            if (ticketData.jugadas) {
                ticketData.jugadas.forEach(j => {
                    j["Ticket Number"] = numeroTicket;
                });
            }
            // Agregar campos adicionales
            ticketData.ticketId = numeroTicket;
            ticketData.fechaTransaccion = fechaTransaccion;
            ticketData.userEmail = userEmail;
            console.log("Ticket a confirmar:", ticketData);

            // Enviar al backend para almacenar el ticket en MongoDB
            // Se elimina la cabecera Authorization para evitar validación del token.
            const resp = await fetch(`${BACKEND_API_URL}/store-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // No se envía token
                },
                body: JSON.stringify(ticketData)
            });
            const data = await resp.json();
            if (!resp.ok) {
                const msg = data.error || 'Error al guardar el ticket en backend.';
                showAlert(msg, 'danger');
                return;
            }
            console.log("Ticket almacenado en backend:", data);

            // Preparar payload para SheetDB
            const sheetPayload = data.jugadas.map(j => ({
                "Ticket Number": data.ticketId,
                "Transaction DateTime": dayjs(data.fechaTransaccion).format('YYYY-MM-DD HH:mm:ss'),
                "Bet Dates": data.fecha.join(', '),
                "Tracks": data.tracks.join(', '),
                "Bet Number": j.numero,
                "Game Mode": j.modalidad,
                "Straight ($)": j.straight,
                "Box ($)": j.box !== null ? j.box : "",
                "Combo ($)": j.combo !== null ? j.combo : "",
                "Total ($)": j.total,
                "Jugada Number": j.jugadaNumber || 1,
                "Timestamp": new Date().toISOString(),
                "User": data.userEmail || "usuario@example.com"
            }));
            console.log("Payload para SheetDB:", sheetPayload);
            try {
                const sheetRes = await fetch(SHEETDB_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: sheetPayload })
                });
                if (!sheetRes.ok) {
                    const sheetError = await sheetRes.text();
                    throw new Error(`SheetDB Error: ${sheetError}`);
                }
                const sheetJson = await sheetRes.json();
                console.log("SheetDB response:", sheetJson);
            } catch (sheetErr) {
                console.error("Error al enviar a SheetDB:", sheetErr);
                showAlert("No se pudo enviar a Google Sheets. Revisa la consola.", "warning");
            }
            // Actualizar el modal con los datos confirmados
            mostrarPreTicketModal(data, true);
            // Descargar e imprimir el ticket (captura del modal)
            await new Promise(resolve => setTimeout(resolve, 500));
            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `ticket_${data.ticketId || 'sinID'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            // Cerrar modal y reiniciar formulario
            setTimeout(() => {
                ticketModal.hide();
                resetForm();
            }, 1000);
        } catch (error) {
            console.error("Error al confirmar ticket:", error);
            showAlert("Ocurrió un error al confirmar el ticket. Revisa la consola.", "danger");
        }
    });

    // -------------------- Función para Generar un Número Único --------------------
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // -------------------- Función para Reiniciar el Formulario --------------------
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        $("#ticketAlerts").empty();
        ticketData = {};
        ticketId = null;
        localStorage.removeItem('ticketId');
        $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
        console.log("Formulario reseteado.");
    }

    // -------------------- (Opcional) Recuperar Ticket Previo --------------------
    $(window).on('load', function() {
        ticketId = localStorage.getItem('ticketId');
        if (ticketId) {
            $.ajax({
                url: `${BACKEND_API_URL}/retrieve-ticket`,
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({ ticketId: ticketId })
                // No se envía token para evitar errores de validación
            }).done(function(response) {
                if (response.ticketData) {
                    showAlert('Se recuperó el ticket.', 'info');
                } else {
                    showAlert('Error al recuperar los datos del ticket.', 'danger');
                    localStorage.removeItem('ticketId');
                }
            }).fail(function(error) {
                console.error('Error al recuperar datos del ticket:', error);
                showAlert('Error al recuperar datos del ticket.', 'danger');
                localStorage.removeItem('ticketId');
            });
        }
    });

});

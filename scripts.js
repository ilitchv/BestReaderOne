 /***************************************************************************************
 * scripts.js
 * 
 * - Mantiene la lógica de jugadas y tracks (USA, Santo Domingo, Venezuela),
 *   tal como la tenías antes.
 * - Al hacer clic en "Generar Ticket", se muestra un modal de previsualización.
 * - Al hacer clic en "Confirmar e Imprimir", se guarda en MongoDB (store-ticket),
 *   luego se envía la data a SheetDB, se muestra y descarga un ticket con QR.
 * - Se eliminan referencias a Square/Cash App.
 ***************************************************************************************/

$(document).ready(function() {
    // =================== URLs y Config ===================== //
    const SHEETDB_API_URL   = 'https://sheetdb.io/api/v1/gect4lbs5bwvr';  // Tu URL real de SheetDB
    const BACKEND_BASE_URL  = 'https://loteria-backend-j1r3.onrender.com';
    const BACKEND_TICKETS   = `${BACKEND_BASE_URL}/api/tickets`;
    const token             = localStorage.getItem('token');
    const userRole          = localStorage.getItem('userRole') || 'user';
    let userEmail           = '';

    if (!token) {
        alert('Debes iniciar sesión para acceder a esta página.');
        window.location.href = 'login.html';
        return;
    }

    console.log('User Role:', userRole);

    // =================== Obtener perfil de usuario (para email, etc.) =================== //
    async function obtenerPerfilUsuario() {
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/auth/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                userEmail = data.email || '';
                console.log('Email del usuario:', userEmail);
            } else {
                console.error('Error al obtener el perfil:', data.msg);
                alert('No se pudo obtener el perfil. Inicia sesión nuevamente.');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            alert('Error de conexión al obtener el perfil. Inicia sesión nuevamente.');
            window.location.href = 'login.html';
        }
    }
    obtenerPerfilUsuario();

    // =================== Variables globales para jugadas =================== //
    let jugadaCount         = 0;
    let selectedDays        = 0;
    let selectedTracksCount = 0;  // Excluyendo “Venezuela” del conteo
    let totalJugadasGlobal  = 0;
    let ticketData          = {};

    // =================== Horarios de cierre y límites =================== //
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

    // =================== Flatpickr =================== //
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

    // =================== Funciones de Jugadas =================== //
    function agregarJugada() {
        if (jugadaCount >= 100) {
            showAlert("Has alcanzado el máximo de 100 jugadas.", "danger");
            return;
        }
        jugadaCount++;
        const fila = `
          <tr>
            <td>${jugadaCount}</td>
            <td><input type="number" class="form-control numeroApostado" min="0" max="9999"></td>
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
    }

    $("#agregarJugada").click(agregarJugada);

    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        // Re-enumerar
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index + 1);
        });
        calcularTotal();
    });

    // Iniciar con una jugada
    agregarJugada();

    // Al cambiar un checkbox de track
    $(".track-checkbox").change(function() {
        const tracksSel = $(".track-checkbox:checked")
            .map(function() { return $(this).val(); }).get();
        // Excluir "Venezuela" del conteo
        selectedTracksCount = tracksSel.filter(t => t !== "Venezuela").length || 1;
        calcularTotal();
    });

    // Detectar cambios en la tabla
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
        const fila     = $(this).closest("tr");
        const numero   = fila.find(".numeroApostado").val();
        const tracks   = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const modalidad = determinarModalidad(tracks, numero, fila);

        fila.find(".tipoJuego").text(modalidad);
        actualizarPlaceholders(modalidad, fila);
        calcularTotalJugada(fila);
        calcularTotal();
    });

    // =================== Determinar modalidad =================== //
    function determinarModalidad(tracks, numero, fila) {
        if (!numero) return "-";

        const esUSA    = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD     = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
        const esVEN    = tracks.includes("Venezuela");

        const lengthNum = numero.length;
        const boxVal    = fila.find(".box").val().trim();
        const acceptableBoxValues       = ["1","2","3"];
        const acceptableBoxCombinations = ["1,2","2,3","1,3","1,2,3"];

        if (esVEN && esUSA) {
            if (lengthNum === 2) return "Venezuela";
            else if (lengthNum === 4) return "Venezuela-Pale";
        } else if (esUSA && !esSD) {
            if (lengthNum === 4) return "Win 4";
            else if (lengthNum === 3) return "Peak 3";
            else if (lengthNum === 2) {
                if (acceptableBoxValues.includes(boxVal)) return "Pulito";
                if (acceptableBoxCombinations.includes(boxVal)) return "Pulito-Combinado";
            }
        } else if (esSD && !esUSA) {
            if (lengthNum === 2) return "RD-Quiniela";
            else if (lengthNum === 4) return "RD-Pale";
        }
        return "-";
    }

    function actualizarPlaceholders(modalidad, fila) {
        fila.find(".straight").prop('disabled', false).attr("placeholder","Ej: 5");
        fila.find(".box").prop('disabled', false).attr("placeholder","Ej: 2");
        fila.find(".combo").prop('disabled', false).attr("placeholder","Ej: 3.00");

        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box").attr("placeholder","1,2,3");
            fila.find(".combo").val('').prop('disabled', true).attr("placeholder","No aplica");
        } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
            fila.find(".box").val('').prop('disabled', true).attr("placeholder","No aplica");
            fila.find(".combo").val('').prop('disabled', true).attr("placeholder","No aplica");
        } else if (modalidad === "Combo") {
            // Si acaso existiera
            fila.find(".straight").val('').prop('disabled', true).attr("placeholder","No aplica");
            fila.find(".box").val('').prop('disabled', true).attr("placeholder","No aplica");
        }
    }

    // =================== Calcular total de una jugada =================== //
    function calcularTotalJugada(fila) {
        const modalidad = fila.find(".tipoJuego").text();
        const numero    = fila.find(".numeroApostado").val();
        if (!numero || numero.length < 2 || numero.length > 4) {
            fila.find(".total").text("0.00");
            return;
        }

        let straight = parseFloat(fila.find(".straight").val()) || 0;
        let boxVal   = fila.find(".box").val().trim();
        let comboVal = fila.find(".combo").val().trim();
        let boxNum   = boxVal ? parseFloat(boxVal) : 0;
        let comboNum = comboVal ? parseFloat(comboVal) : 0;

        // Calcular combinaciones
        const combinaciones = calcularCombinaciones(numero);

        // Aplicar límites (si aplica)
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight ?? straight);
            if (limitesApuesta[modalidad].box !== undefined &&
                modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
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
            total = straight + boxNum + comboNum * combinaciones;
        } else {
            // Caso general
            total = straight + boxNum + comboNum;
        }

        fila.find(".total").text(total.toFixed(2));
    }

    // Calcular combinaciones factorial
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

    // =================== Calcular total global =================== //
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracksCount);
        console.log("Días seleccionados:", selectedDays);

        if (selectedDays === 0) {
            total = 0;
        } else {
            total = total * selectedTracksCount * selectedDays;
        }
        console.log("Total después de multiplicar:", total.toFixed(2));
        $("#totalJugadas").text(total.toFixed(2));
    }

    // =================== Resaltar duplicados =================== //
    function resaltarDuplicados() {
        const campos = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();

        campos.forEach(c => {
            const val = c.value.trim();
            if (val) {
                if (valores[val]) {
                    duplicados.add(val);
                } else {
                    valores[val] = true;
                }
            }
        });
        campos.forEach(c => {
            if (duplicados.has(c.value.trim())) {
                c.classList.add('duplicado');
            } else {
                c.classList.remove('duplicado');
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

    // =================== Actualizar Tracks según hora de cierre =================== //
    function actualizarEstadoTracks() {
        const fechaVal = $("#fecha").val().split(", ")[0];
        if (!fechaVal) return;
        const [m, d, y] = fechaVal.split('-').map(Number);
        const fechaSelec = new Date(y, m - 1, d);
        const fechaHoy   = new Date();
        const esMismoDia = (fechaSelec.toDateString() === fechaHoy.toDateString());

        if (!esMismoDia) {
            $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
            return;
        }

        // Mismo día => deshabilitar si ya pasó la hora
        const ahora = new Date();
        const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes();
        for (let region in horariosCierre) {
            for (let track in horariosCierre[region]) {
                const [hC, mC] = horariosCierre[region][track].split(":").map(Number);
                const cutoff   = hC * 60 + mC;
                if (ahoraMins >= cutoff) {
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

    // Refrescar cada 1 min si es hoy
    setInterval(() => {
        const fechaVal = $("#fecha").val().split(", ")[0];
        if (!fechaVal) return;
        const [m, d, y] = fechaVal.split('-').map(Number);
        const selDate   = new Date(y, m - 1, d);
        const hoy       = new Date();
        if (selDate.toDateString() === hoy.toDateString()) {
            actualizarEstadoTracks();
        }
    }, 60000);

    // =================== Mostrar horas límite en la UI =================== //
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
                const cutoff = new Date(`1970-01-01T${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:00`);
                cutoff.setMinutes(cutoff.getMinutes() - 5);
                const horas   = cutoff.getHours().toString().padStart(2,'0');
                const minutos = cutoff.getMinutes().toString().padStart(2,'0');
                $(this).text(`Hora límite: ${horas}:${minutos}`);
            }
        });
    }
    mostrarHorasLimite();

    // =================== Función para mostrar alertas =================== //
    function showAlert(message, type) {
        const alertHTML = `
          <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
          </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    // =================== Modal Bootstrap 5 =================== //
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // =================== "Generar Ticket" -> Muestra Modal Previsualización =================== //
    $("#generarTicket").click(function() {
        $("#ticketAlerts").empty();

        const fechaVal = $("#fecha").val();
        if (!fechaVal) {
            showAlert("Selecciona al menos una fecha.", "warning");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
        if (!tracks || tracks.length === 0) {
            showAlert("Selecciona al menos un track.", "warning");
            return;
        }

        // Validar jugadas
        let jugadasArray = [];
        let jugadasValidas = true;

        $("#tablaJugadas tr").each(function() {
            const numero    = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight  = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal    = $(this).find(".box").val();
            const comboVal  = $(this).find(".combo").val();
            const totalFila = parseFloat($(this).find(".total").text()) || 0;

            if (!numero || numero.length < 2 || numero.length > 4) {
                jugadasValidas = false;
                showAlert("Número inválido (debe tener 2-4 dígitos).", "danger");
                return false; // break
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                showAlert("Selecciona una modalidad de juego.", "danger");
                return false;
            }
            if (totalFila <= 0) {
                jugadasValidas = false;
                showAlert("Apuesta inválida, revisa straight/box/combo.", "danger");
                return false;
            }

            const boxNum   = boxVal   && !isNaN(boxVal)   ? parseFloat(boxVal)   : null;
            const comboNum = comboVal && !isNaN(comboVal) ? parseFloat(comboVal) : null;
            jugadasArray.push({
                numero, modalidad, straight, box: boxNum, combo: comboNum,
                total: totalFila
            });
        });

        if (!jugadasValidas) return;

        // Calcular total global
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Convertir fechas a ISO
        const fechas = fechaVal.split(", ").map(fStr => {
            const [m, d, y] = fStr.split('-').map(Number);
            return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        });

        // Construir ticketData
        ticketData = {
            fecha: fechas,
            tracks: tracks,
            jugadas: jugadasArray,
            totalAmount: totalJugadasGlobal
            // userEmail: userEmail, (si necesitas enviarlo al backend)
        };

        // Muestra la previsualización en el modal (sin ticketId todavía)
        mostrarPreTicketModal(ticketData, false /* isConfirmed */);
        ticketModal.show();
    });

    // =================== Mostrar datos en el modal de "Pre Ticket" =================== //
    function mostrarPreTicketModal(tData, isConfirmed) {
        $("#ticketAlerts").empty();
        // Fechas
        $("#ticketFecha").text(tData.fecha.join(', '));
        // Tracks
        $("#ticketTracks").text(tData.tracks.join(', '));
        // Total
        $("#ticketTotal").text(tData.totalAmount.toFixed(2));

        // Limpiar tabla
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

        if (isConfirmed) {
            // Mostrar ticketId, fechaTransaccion, QR
            $("#numeroTicket").parent().show();
            $("#ticketTransaccion").parent().show();
            $("#qrcode").parent().parent().show();
        } else {
            $("#numeroTicket").text('').parent().hide();
            $("#ticketTransaccion").text('').parent().hide();
            $("#qrcode").empty().parent().parent().hide();
        }
    }

    // =================== "Confirmar e Imprimir" =================== //
    $("#confirmarTicket").click(async function() {
        try {
            $("#ticketAlerts").empty();
            // 1. Llamar a /store-ticket
            const resp = await fetch(`${BACKEND_TICKETS}/store-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(ticketData)
            });
            const data = await resp.json();
            if (!resp.ok) {
                const msg = data.error || 'Error al guardar el ticket en backend.';
                showAlert(msg, 'danger');
                return;
            }
            console.log("Ticket almacenado (SIN pago) en backend:", data);

            // 2. Enviar a SheetDB
            //    Construimos un array de objetos para tu sheet:
            //    Ajusta los campos que quieras. Aquí de ejemplo:
            const sheetPayload = data.jugadas.map(j => ({
                ticketId: data.ticketId,
                numero: j.numero,
                modalidad: j.modalidad,
                total: j.total
            }));

            try {
                const sheetRes = await fetch(SHEETDB_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: sheetPayload })
                });
                const sheetJson = await sheetRes.json();
                console.log("SheetDB response:", sheetJson);
                if (!sheetRes.ok) {
                    showAlert("SheetDB rechazó la solicitud. Verifica formato.", "warning");
                }
            } catch (sheetErr) {
                console.error("Error al enviar a SheetDB:", sheetErr);
                showAlert("No se pudo enviar a Google Sheets. Revisa consola.", "warning");
            }

            // 3. Actualizar modal con los datos "confirmados"
            if (data.ticketId) {
                $("#numeroTicket").text(data.ticketId);
            }
            if (data.fechaTransaccion) {
                // Usa dayjs si quieres formatear
                $("#ticketTransaccion").text(data.fechaTransaccion);
            }
            // Generar QR
            if (data.ticketId) {
                $("#qrcode").empty();
                new QRCode(document.getElementById("qrcode"), data.ticketId);
            }

            mostrarPreTicketModal(data, true);

            // 4. Descargar/Imprimir
            //    - O usar window.print(), o usar html2canvas + descarga automática
            await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa

            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `ticket_${data.ticketId || 'sinID'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            // (Opcional) window.print() en lugar de html2canvas
            // window.print();

            // 5. Cerrar modal y resetear
            setTimeout(() => {
                ticketModal.hide();
                resetForm();
            }, 1000);

        } catch (error) {
            console.error("Error al confirmar ticket:", error);
            showAlert("Ocurrió un error al confirmar el ticket. Revisa la consola.", "danger");
        }
    });

    // =================== Botón Reset =================== //
    $("#resetForm").click(resetForm);
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedDays = 0;
        selectedTracksCount = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        $("#ticketAlerts").empty();
        ticketData = {};
        console.log("Formulario reseteado.");
    }

});

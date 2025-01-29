 /***************************************************************************************
 * scripts.js (Versión SIN pagos, con botón de "Confirmar e Imprimir" en el modal)
 * 
 * Flujo:
 *  1) "Generar Ticket" => Recolecta jugadas y muestra el modal de previsualización.
 *  2) "Confirmar e Imprimir" => Guarda en backend /store-ticket, luego SheetDB, y luego imprime.
 ***************************************************************************************/

$(document).ready(function() {

    // ====== CONFIGURACIONES GENERALES ======
    const SHEETDB_API_URL   = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL real de SheetDB
    const BACKEND_BASE_URL  = 'https://loteria-backend-j1r3.onrender.com'; 
    const BACKEND_TICKETS   = `${BACKEND_BASE_URL}/api/tickets`; // Endpoint "/store-ticket", etc.
    const userRole          = localStorage.getItem('userRole') || 'user';
    const token             = localStorage.getItem('token');
    let userEmail           = '';
    console.log('User Role:', userRole);

    // ====== VARIABLES GLOBALES ======
    let jugadaCount         = 0;
    let selectedTracks      = 0;
    let selectedDays        = 0;
    let totalJugadasGlobal  = 0;
    let ticketData          = {};   // Se llenará al hacer click en "Generar Ticket"

    // ====== CHECK DE AUTENTICACIÓN (básico) ======
    if (!token) {
      alert('Debes iniciar sesión para acceder a esta página.');
      window.location.href = 'login.html';
    }

    // ====== FUNCIONES UTILES ======
    function showAlert(message, type) {
      const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
      `;
      $("#ticketAlerts").append(alertHTML);
    }

    // Generar un ticketId local (por si lo necesitas)
    function generarTicketIdLocal() {
      return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // ====== OBTENER PERFIL (para email, etc.) ======
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
          alert('Error al obtener tu perfil. Por favor, inicia sesión nuevamente.');
          window.location.href = 'login.html';
        }
      } catch (error) {
        console.error('Error al obtener el perfil:', error);
        alert('Error al obtener tu perfil. Por favor, inicia sesión nuevamente.');
        window.location.href = 'login.html';
      }
    }
    obtenerPerfilUsuario();

    // ====== HORARIOS DE CIERRE, LIMITES DE APUESTA, ETC. ======
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
      "Peak 3": { "straight": 35,"box": 50, "combo": 70 },
      "Venezuela": { "straight": 100 },
      "Venezuela-Pale": { "straight": 20 },
      "Pulito": { "straight": 100 },
      "Pulito-Combinado": { "straight": 100 },
      "RD-Quiniela": { "straight": 100 },
      "RD-Pale": { "straight": 20 },
      "Combo": { "combo": 50 }
    };

    // ====== FLATPICKR ======
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
      },
    });

    // ====== VARIABLES PARA TABLA DE JUGADAS ======
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

    // Iniciar con 1 jugada
    agregarJugada();

    // ====== OBTENER TRACKS CHECKEADOS ======
    $(".track-checkbox").change(function() {
      const tracksSeleccionados = $(".track-checkbox:checked")
        .map(function() { return $(this).val(); })
        .get();
      // Ignorar "Venezuela" en el conteo
      selectedTracks = tracksSeleccionados.filter(t => t !== "Venezuela").length || 1;
      calcularTotal();
    });

    // ====== EVENTOS input EN LA TABLA ======
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
      const fila = $(this).closest("tr");
      const num  = fila.find(".numeroApostado").val();
      const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
      const modalidad = determinarModalidad(tracks, num, fila);

      fila.find(".tipoJuego").text(modalidad);
      actualizarPlaceholders(modalidad, fila);
      calcularTotalJugada(fila);
      calcularTotal();
    });

    // ====== DETERMINAR MODALIDAD (lógica simplificada) ======
    function determinarModalidad(tracks, numero, fila) {
      let modalidad = "-";
      const esUSA   = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
      const esSD    = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
      const incluyeVenezuela = tracks.includes("Venezuela");

      const longitud = numero.length;
      const boxValue = fila.find(".box").val().trim();
      const acceptableBoxValues = ["1","2","3"];
      const acceptableBoxCombinations = ["1,2","2,3","1,3","1,2,3"];

      if (incluyeVenezuela && esUSA) {
        if (longitud === 2) modalidad = "Venezuela";
        else if (longitud === 4) modalidad = "Venezuela-Pale";
      } else if (esUSA && !esSD) {
        if (longitud === 4) modalidad = "Win 4";
        else if (longitud === 3) modalidad = "Peak 3";
        else if (longitud === 2) {
          if (acceptableBoxValues.includes(boxValue)) modalidad = "Pulito";
          else if (acceptableBoxCombinations.includes(boxValue)) modalidad = "Pulito-Combinado";
        }
      } else if (esSD && !esUSA) {
        if (longitud === 2) modalidad = "RD-Quiniela";
        else if (longitud === 4) modalidad = "RD-Pale";
      }

      return modalidad;
    }

    // ====== ACTUALIZAR PLACEHOLDERS ======
    function actualizarPlaceholders(modalidad, fila) {
      // Reset
      fila.find(".straight").prop('disabled', false).attr("placeholder","Ej: 5");
      fila.find(".box").prop('disabled', false).attr("placeholder","Ej: 2");
      fila.find(".combo").prop('disabled', false).attr("placeholder","Ej: 3.00");

      if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
        fila.find(".box").attr("placeholder", "1,2,3");
        fila.find(".combo").val('').prop('disabled', true).attr("placeholder","No aplica");
      } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
        fila.find(".box").val('').prop('disabled', true).attr("placeholder","No aplica");
        fila.find(".combo").val('').prop('disabled', true).attr("placeholder","No aplica");
      } else if (modalidad === "Combo") {
        fila.find(".straight").val('').prop('disabled', true).attr("placeholder","No aplica");
        fila.find(".box").val('').prop('disabled', true).attr("placeholder","No aplica");
      }
    }

    // ====== CALCULAR TOTAL DE UNA FILA ======
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
      let comboVal = fila.find(".combo").val().trim();
      let boxNum   = boxVal ? parseFloat(boxVal) : 0;
      let comboNum = comboVal ? parseFloat(comboVal) : 0;

      // Aplicar límites
      if (limitesApuesta[modalidad]) {
        straight = Math.min(straight, limitesApuesta[modalidad].straight ?? straight);
        if (limitesApuesta[modalidad].box !== undefined
            && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
          boxNum = Math.min(boxNum, limitesApuesta[modalidad].box);
        }
        if (limitesApuesta[modalidad].combo !== undefined) {
          comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo);
        }
      }

      let total = 0;
      if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
        const boxValues = boxVal.split(",").filter(v => v !== "");
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

    // ====== CALCULAR COMBINACIONES ======
    function calcularCombinaciones(numero) {
      const counts = {};
      for (let char of numero) {
        counts[char] = (counts[char] || 0) + 1;
      }
      const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
      const totalDigits = numero.length;
      let denominator = 1;
      for (let digit in counts) {
        denominator *= factorial(counts[digit]);
      }
      return factorial(totalDigits) / denominator;
    }

    // ====== CALCULAR TOTAL GLOBAL ======
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

    // ====== RESALTAR DUPLICADOS ======
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

    // ====== ACTUALIZAR TRACKS SEGUN HORA DE CIERRE ======
    function actualizarEstadoTracks() {
      const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
      if (!fechaSeleccionadaStr) return;
      const [m, d, y] = fechaSeleccionadaStr.split('-').map(Number);
      const fechaSeleccionada = new Date(y, m - 1, d);

      const fechaActual = new Date();
      const esMismoDia = fechaSeleccionada.toDateString() === fechaActual.toDateString();

      if (!esMismoDia) {
        $(".track-checkbox").prop('disabled', false).closest('label').removeClass('closed-track');
        return;
      }

      const ahora = new Date();
      const ahoraMiliseconds = ahora.getHours() * 60 + ahora.getMinutes();

      for (let region in horariosCierre) {
        for (let track in horariosCierre[region]) {
          const [hCierre, minCierre] = horariosCierre[region][track].split(":").map(Number);
          const cutoff = hCierre * 60 + minCierre;
          if (ahoraMiliseconds >= cutoff) {
            $(`.track-checkbox[value="${track}"]`)
              .prop('disabled', true).prop('checked', false)
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

    // Refrescar cada minuto si es mismo día
    setInterval(() => {
      const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
      if (!fechaSeleccionadaStr) return;
      const [m, d, y] = fechaSeleccionadaStr.split('-').map(Number);
      const fechaSel = new Date(y, m - 1, d);
      const fechaHoy = new Date();
      if (fechaSel.toDateString() === fechaHoy.toDateString()) {
        actualizarEstadoTracks();
      }
    }, 60000);

    // Mostrar horas límite (sólo informativo)
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
          const cutoffDate = new Date(`1970-01-01T${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:00`);
          cutoffDate.setMinutes(cutoffDate.getMinutes() - 5);
          const horas   = cutoffDate.getHours().toString().padStart(2,'0');
          const minutos = cutoffDate.getMinutes().toString().padStart(2,'0');
          $(this).text(`Hora límite: ${horas}:${minutos}`);
        }
      });
    }
    mostrarHorasLimite();

    // ====== MODAL (Bootstrap 5) ======
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // ====== BOTON "GENERAR TICKET" ======
    $("#generarTicket").click(function() {
      $("#ticketAlerts").empty();

      const fechaVal = $("#fecha").val();
      if (!fechaVal) {
        showAlert("Por favor, selecciona al menos una fecha.", "warning");
        return;
      }

      const tracks = $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
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
          showAlert("Números válidos: 2, 3 o 4 dígitos.", "danger");
          return false; // break
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

        const boxNum   = (boxVal && !isNaN(boxVal))     ? parseFloat(boxVal)   : null;
        const comboNum = (comboVal && !isNaN(comboVal)) ? parseFloat(comboVal) : null;
        jugadasArray.push({
          numero, modalidad, straight, box: boxNum, combo: comboNum,
          total: totalFila
        });
      });

      if (!jugadasValidas) return;

      totalJugadasGlobal = parseFloat($("#totalJugadas").text());
      const fechasSeleccionadas = fechaVal.split(", ").map(fechaStr => {
        const [m, d, y] = fechaStr.split('-').map(Number);
        return `${y}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
      });

      // Construir ticketData local
      ticketData = {
        fecha: fechasSeleccionadas,
        tracks: tracks,
        jugadas: jugadasArray,
        totalAmount: totalJugadasGlobal,
        // userEmail: userEmail, (si lo necesitas en backend)
      };

      console.log("Datos del Ticket (pre-confirmación):", ticketData);

      // Mostrar en el modal (sin enviar a backend todavía)
      mostrarModalPreTicket(ticketData, false /* isConfirmed = false */);
      ticketModal.show();
    });

    // ====== MOSTRAR MODAL PRE-TICKET ======
    function mostrarModalPreTicket(tData, isConfirmed) {
      $("#ticketAlerts").empty();

      // Fechas
      $("#ticketFecha").text(tData.fecha.join(', '));
      // Tracks
      $("#ticketTracks").text(tData.tracks.join(', '));
      // Total
      $("#ticketTotal").text(tData.totalAmount.toFixed(2));

      // Limpiar la tabla
      const tbody = $("#ticketJugadas");
      tbody.empty();

      tData.jugadas.forEach((jugada, index) => {
        const row = `
          <tr>
            <td>${index + 1}</td>
            <td>${jugada.numero}</td>
            <td>${jugada.modalidad}</td>
            <td>${jugada.straight.toFixed(2)}</td>
            <td>${jugada.box !== null ? jugada.box.toFixed(2) : '-'}</td>
            <td>${jugada.combo !== null ? jugada.combo.toFixed(2) : '-'}</td>
            <td>$${jugada.total.toFixed(2)}</td>
          </tr>
        `;
        tbody.append(row);
      });

      // Ocultar/mostrar info de "confirmed"
      if (isConfirmed) {
        // Si ya está confirmado, se mostraría un ticketId, qr, etc.
        $("#numeroTicket").parent().show();
        $("#ticketTransaccion").parent().show();
        $("#qrcode").parent().parent().show();
      } else {
        // Aún no confirmado
        $("#numeroTicket").text('').parent().hide();
        $("#ticketTransaccion").text('').parent().hide();
        $("#qrcode").empty().parent().parent().hide();
      }
    }

    // ====== BOTON "CONFIRMAR E IMPRIMIR" ======
    // (Debes asegurarte de que en tu index.html exista el botón con id="confirmarTicket"
    //  y que NO esté forzado a display:none)
    $("#confirmarTicket").click(async function() {
      try {
        $("#ticketAlerts").empty();

        // 1. Llamar al backend /store-ticket para guardar en MongoDB
        const response = await fetch(`${BACKEND_TICKETS}/store-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(ticketData)
        });
        const data = await response.json();
        if (!response.ok) {
          const msg = data.error || 'Error al almacenar el ticket en backend.';
          showAlert(msg, 'danger');
          return;
        }
        console.log("Ticket guardado en MongoDB:", data);

        // 2. Enviar a SheetDB
        //    Si deseas almacenar por cada jugada, ajusta en base a tu formato.
        //    Ejemplo: un array de { ticketId, numero, modalidad, total, etc. }
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
          const sheetData = await sheetRes.json();
          console.log("SheetDB response:", sheetData);
        } catch (sheetErr) {
          console.error("Error al enviar a SheetDB:", sheetErr);
          showAlert("No se pudo enviar a Google Sheets. Revisa consola.", "warning");
        }

        // 3. Actualizar modal con ticketId, fechaTransaccion, etc.
        if (data.ticketId) {
          $("#numeroTicket").text(data.ticketId).parent().show();
        }
        if (data.fechaTransaccion) {
          $("#ticketTransaccion").text(dayjs(data.fechaTransaccion).format('YYYY-MM-DD HH:mm:ss')).parent().show();
        }

        // Generar QR
        if (data.ticketId) {
          $("#qrcode").empty().parent().parent().show();
          new QRCode(document.getElementById("qrcode"), data.ticketId);
        }

        // (Re-mostrar modal con info final)
        mostrarModalPreTicket(data, true);
        
        // 4. Imprimir o descargar
        window.print();

        // 5. Cerrar modal y resetear formulario
        setTimeout(() => {
          ticketModal.hide();
          resetForm();
        }, 1000);

      } catch (error) {
        console.error("Error en Confirmar Ticket:", error);
        showAlert("Error al confirmar el ticket.", "danger");
      }
    });

    // ====== FUNCION RESETEAR FORMULARIO ======
    $("#resetForm").click(resetForm);
    function resetForm() {
      $("#lotteryForm")[0].reset();
      $("#tablaJugadas").empty();
      jugadaCount = 0;
      selectedDays = 0;
      selectedTracks = 0;
      agregarJugada();
      $("#totalJugadas").text("0.00");
      $("#ticketAlerts").empty();
      ticketData = {};
      console.log("Formulario reseteado.");
    }

});

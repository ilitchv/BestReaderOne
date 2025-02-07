 /****************************************************************************
 * scripts.js
 *
 * Flujo deseado:
 * 1) Al hacer clic en "Generar Ticket":
 *    - Se recopila la info del formulario (fechas, tracks, jugadas, total).
 *    - Se construye un objeto ticketData (SIN ticketId ni QR).
 *    - Se muestra inmediatamente el modal (#ticketModal) con esa info (previsualizarSinConfirm).
 * 2) Al hacer clic en "Confirmar e Imprimir":
 *    - Se genera un ticketId y fecha de transacción.
 *    - Se actualiza la previsualización (previsualizarConConfirm).
 *    - Se guarda en backend (colección "jugadas") y en SheetDB.
 *    - Se descarga imagen PNG del ticket.
 *    - Se cierra el modal y se resetea el formulario para evitar envíos múltiples.
 ****************************************************************************/

$(document).ready(function() {
  // ====================== CONFIGURACIONES GENERALES ====================== //
  const SHEETDB_API_URL  = "https://sheetdb.io/api/v1/bl57zyh73b0ev"; // Ajusta a tu URL de SheetDB
  const BACKEND_API_URL  = "https://loteria-backend-j1r3.onrender.com/api"; // Ajusta a tu backend
  const token            = localStorage.getItem("token");
  const userRole         = localStorage.getItem("userRole") || "user";

  console.log("User Role:", userRole);
  if (!token) {
    alert("Debes iniciar sesión para acceder a esta página.");
    window.location.href = "login.html";
    return;
  }

  // ====================== VARIABLES GLOBALES ====================== //
  let jugadaCount      = 0;
  let selectedDays     = 0;
  let selectedTracks   = 0;
  let totalJugadas     = 0;
  let ticketData       = {};  // Objeto con la información del ticket
  let jugadasData      = [];  // Array de jugadas
  let fechaTransaccion = "";
  let isProgrammaticReset = false;
  let userEmail = "";

  // ====================== HORARIOS DE CIERRE ====================== //
  const horariosCierre = {
    "USA": {
      "New York Mid Day":    "14:25",
      "New York Evening":    "22:25",
      "Georgia Mid Day":     "12:20",
      "Georgia Evening":     "18:45",
      "New Jersey Mid Day":  "12:54",
      "New Jersey Evening":  "22:50",
      "Florida Mid Day":     "13:25",
      "Florida Evening":     "21:30",
      "Connecticut Mid Day": "13:35",
      "Connecticut Evening": "22:20",
      "Georgia Night":       "23:20",
      "Pensilvania AM":      "12:55",
      "Pensilvania PM":      "18:20"
    },
    "Santo Domingo": {
      "Real":                  "12:45",
      "Gana mas":              "14:25",
      "Loteka":                "19:30",
      "Nacional":              "20:30",
      "Quiniela Pale":         "20:30",
      "Primera Día":           "11:50",
      "Suerte Día":            "12:20",
      "Lotería Real":          "12:50",
      "Suerte Tarde":          "17:50",
      "Lotedom":               "17:50",
      "Primera Noche":         "19:50",
      "Panama":                "16:00",
      "Quiniela Pale Domingo": "15:30",
      "Nacional Domingo":      "17:50"
    },
    "Venezuela": {
      "Venezuela": "19:00"
    }
  };

  // ====================== LÍMITES DE APUESTA (opcional) ====================== //
  const limitesApuesta = {
    "Win 4":             { straight: 6,  box: 30, combo: 6 },
    "Peak 3":            { straight: 35, box: 50, combo: 35 },
    "Venezuela":         { straight: 100 },
    "Venezuela-Pale":    { straight: 100 },
    "Pulito":            { straight: 100 },
    "RD-Quiniela":       { straight: 100 },
    "RD-Pale":           { straight: 20 }
  };

  // ====================== OBTENER PERFIL DEL USUARIO ====================== //
  async function obtenerPerfil() {
    try {
      const resp = await fetch(`${BACKEND_API_URL}/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await resp.json();
      if (resp.ok) {
        userEmail = data.email;
        console.log("Email del usuario:", userEmail);
      }
    } catch (err) {
      console.error("Error al obtener perfil:", err);
    }
  }
  obtenerPerfil();

  // ====================== INICIALIZAR CALENDARIO (Flatpickr) ====================== //
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

  // ====================== MANEJADORES PARA JUGADAS ====================== //
  function agregarJugada() {
    if (jugadaCount >= 100) {
      alert("Has alcanzado el máximo de 100 jugadas.");
      return;
    }
    jugadaCount++;
    const row = `
      <tr>
        <td>${jugadaCount}</td>
        <td><input type="number" class="form-control numeroApostado" min="0" max="9999" required></td>
        <td class="tipoJuego">-</td>
        <td><input type="number" class="form-control straight" step="1" placeholder="E.g., 5"></td>
        <td><input type="number" class="form-control box" step="1" placeholder="1, 2 o 3"></td>
        <td><input type="number" class="form-control combo" step="0.10" placeholder="E.g., 3.00"></td>
        <td class="total">0.00</td>
      </tr>
    `;
    $("#tablaJugadas").append(row);
    agregarListenersNumeroApostado();
    resaltarDuplicados();
  }

  $("#agregarJugada").click(agregarJugada);

  $("#eliminarJugada").click(function() {
    if (jugadaCount === 0) {
      alert("No hay jugadas para eliminar.");
      return;
    }
    $("#tablaJugadas tr:last").remove();
    jugadaCount--;
    // Reenumerar
    $("#tablaJugadas tr").each(function(index) {
      $(this).find("td:first").text(index + 1);
    });
    calcularTotal();
  });

  // Agregar al menos una jugada al iniciar
  agregarJugada();

  // ====================== EVENTOS EN LA TABLA DE JUGADAS ====================== //
  $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
    const fila = $(this).closest("tr");
    const numero = fila.find(".numeroApostado").val();
    const tracks = $(".track-checkbox:checked").map((_, el) => el.value).get();
    const modalidad = determinarModalidad(tracks, numero, fila);
    fila.find(".tipoJuego").text(modalidad);
    actualizarPlaceholders(modalidad, fila);
    calcularTotalJugada(fila);
    calcularTotal();
    resaltarDuplicados();
  });

  // ====================== DETERMINAR MODALIDAD ====================== //
  function determinarModalidad(tracks, numero, fila) {
    if (!numero) return "-";
    const esUSA = tracks.some(t => Object.keys(horariosCierre.USA).includes(t));
    const esSD = tracks.some(t => Object.keys(horariosCierre["Santo Domingo"]).includes(t));
    const veneOn = tracks.includes("Venezuela");
    const len = numero.length;
    const boxVal = fila.find(".box").val().trim();
    const boxValues = ["1", "2", "3"];
    const boxCombos = ["1,2", "2,3", "1,3", "1,2,3"];

    // Ejemplo de la lógica que tenías:
    if (veneOn && esUSA) {
      if (len === 2) return "Venezuela";
      if (len === 4) return "Venezuela-Pale";
    } else if (esUSA && !esSD) {
      if (len === 4) return "Win 4";
      if (len === 3) return "Peak 3";
      if (len === 2) {
        if (boxValues.includes(boxVal)) return "Pulito";
        if (boxCombos.includes(boxVal)) return "Pulito-Combinado";
      }
    } else if (esSD && !esUSA) {
      if (len === 2) return "RD-Quiniela";
      if (len === 4) return "RD-Pale";
    }
    return "-";
  }

  // ====================== ACTUALIZAR PLACEHOLDERS SEGÚN MODALIDAD ====================== //
  function actualizarPlaceholders(modalidad, fila) {
    if (limitesApuesta[modalidad]) {
      fila.find(".straight")
          .attr("placeholder", `Max $${limitesApuesta[modalidad].straight || 100}`)
          .prop("disabled", false);
    } else {
      fila.find(".straight").attr("placeholder", "E.g., 5.00").prop("disabled", false);
    }
    if (modalidad === "Pulito") {
      fila.find(".box").attr("placeholder", "1, 2 o 3").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad.startsWith("Venezuela") || modalidad.startsWith("RD-")) {
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      fila.find(".box").attr("placeholder", `Max $${limitesApuesta[modalidad].box || ''}`).prop("disabled", false);
      fila.find(".combo").attr("placeholder", `Max $${limitesApuesta[modalidad].combo || ''}`).prop("disabled", false);
    } else {
      fila.find(".box").attr("placeholder", "E.g., 2.50").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "E.g., 3.00").prop("disabled", false);
    }
  }

  // ====================== CALCULAR TOTAL DE CADA JUGADA ====================== //
  function calcularTotalJugada(fila) {
    const modalidad = fila.find(".tipoJuego").text();
    const numero = fila.find(".numeroApostado").val();
    if (!numero || numero.length < 2 || numero.length > 4) {
      fila.find(".total").text("0.00");
      return;
    }
    const combis = calcularCombinaciones(numero);
    let stVal = parseFloat(fila.find(".straight").val()) || 0;
    let boxVal = fila.find(".box").val().trim();
    let boxNum = boxVal ? parseFloat(boxVal) : 0;
    let comboVal = fila.find(".combo").val().trim();
    let comboNum = comboVal ? parseFloat(comboVal) : 0;

    // Ajustar según límites
    if (limitesApuesta[modalidad]) {
      if (limitesApuesta[modalidad].straight !== undefined) {
        stVal = Math.min(stVal, limitesApuesta[modalidad].straight);
      }
      if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito") {
        boxNum = Math.min(boxNum, limitesApuesta[modalidad].box);
      }
      if (limitesApuesta[modalidad].combo !== undefined) {
        comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo);
      }
    }

    let total = 0;
    if (modalidad === "Pulito" || modalidad.startsWith("Venezuela") || modalidad.startsWith("RD-")) {
      total = stVal;
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      total = stVal + boxNum + (comboNum * combis);
    } else {
      // Caso genérico
      total = stVal + boxNum + comboNum;
    }
    fila.find(".total").text(total.toFixed(2));
  }

  // ====================== CALCULAR COMBINACIONES (para combos) ====================== //
  function calcularCombinaciones(numero) {
    const counts = {};
    for (let ch of numero) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
    const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
    let totalDigits = numero.length;
    let denominator = 1;
    for (let digit in counts) {
      denominator *= factorial(counts[digit]);
    }
    return factorial(totalDigits) / denominator;
  }

  // ====================== CALCULAR TOTAL GLOBAL ====================== //
  function calcularTotal() {
    let t = 0;
    $(".total").each(function() {
      t += parseFloat($(this).text()) || 0;
    });
    // Multiplicar por #tracks y #days
    if (selectedDays === 0) {
      t = 0;
    } else {
      t = t * selectedTracks * selectedDays;
    }
    $("#totalJugadas").text(t.toFixed(2));
    totalJugadas = t;
  }

  // ====================== RESETEAR FORMULARIO ====================== //
  function resetForm() {
    $("#lotteryForm")[0].reset();
    $("#tablaJugadas").empty();
    jugadaCount    = 0;
    selectedTracks = 0;
    selectedDays   = 0;
    totalJugadas   = 0;
    ticketData     = {};
    $("#totalJugadas").text("0.00");
    $(".track-checkbox").prop("disabled", false).closest("label").removeClass("closed-track");
    agregarJugada();
  }

  // ====================== RESALTAR NÚMEROS DUPLICADOS ====================== //
  function resaltarDuplicados() {
    const campos = $('.numeroApostado');
    const vals = {};
    const dups = new Set();
    campos.each(function() {
      const v = $(this).val().trim();
      if (v) {
        if (vals[v]) dups.add(v);
        else vals[v] = true;
      }
    });
    campos.each(function() {
      if (dups.has($(this).val().trim())) {
        $(this).addClass("duplicado");
      } else {
        $(this).removeClass("duplicado");
      }
    });
    guardarEstadoFormulario();
  }

  function agregarListenersNumeroApostado() {
    const campos = document.querySelectorAll(".numeroApostado");
    campos.forEach(c => {
      c.removeEventListener("input", resaltarDuplicados);
      c.addEventListener("input", resaltarDuplicados);
    });
  }

  // ====================== ACTUALIZAR ESTADO DE TRACKS (Habilitar/Deshabilitar) ====================== //
  function actualizarEstadoTracks() {
    const fechaStr = $("#fecha").val().split(", ")[0];
    if (!fechaStr) return;
    const [mm, dd, yy] = fechaStr.split("-").map(Number);
    const fSel = new Date(yy, mm - 1, dd);
    const hoy = new Date();
    const esHoy = (fSel.toDateString() === hoy.toDateString());

    if (!esHoy) {
      $(".track-checkbox").prop("disabled", false).closest("label").removeClass("closed-track");
      return;
    }
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    for (let region in horariosCierre) {
      for (let track in horariosCierre[region]) {
        const [hC, mC] = horariosCierre[region][track].split(":").map(Number);
        const cutoff = hC * 60 + mC;
        if (nowMins >= cutoff) {
          $(`.track-checkbox[value="${track}"]`)
            .prop("disabled", true).prop("checked", false)
            .closest("label").addClass("closed-track");
        } else {
          $(`.track-checkbox[value="${track}"]`)
            .prop("disabled", false)
            .closest("label").removeClass("closed-track");
        }
      }
    }
  }

  setInterval(() => {
    const fStr = $("#fecha").val().split(", ")[0];
    if (!fStr) return;
    const [m, d, y] = fStr.split("-").map(Number);
    const sel = new Date(y, m - 1, d);
    const now = new Date();
    if (sel.toDateString() === now.toDateString()) {
      actualizarEstadoTracks();
    }
  }, 60000);

  // ====================== MOSTRAR HORAS LÍMITE (Cutoff) ====================== //
  function mostrarHorasLimite() {
    $(".cutoff-time").each(function() {
      const track = $(this).data("track");
      if (track === "Venezuela") {
        $(this).hide();
        return;
      }
      let cStr = "";
      if (horariosCierre.USA[track]) cStr = horariosCierre.USA[track];
      else if (horariosCierre["Santo Domingo"][track]) cStr = horariosCierre["Santo Domingo"][track];
      else if (horariosCierre.Venezuela[track]) cStr = horariosCierre.Venezuela[track];

      if (cStr) {
        const [hh, mm] = cStr.split(":").map(Number);
        const cutoff = new Date();
        cutoff.setHours(hh, mm - 5, 0, 0);
        const hh2 = String(cutoff.getHours()).padStart(2, "0");
        const mm2 = String(cutoff.getMinutes()).padStart(2, "0");
        $(this).text(`Cutoff Time: ${hh2}:${mm2}`);
      }
    });
    $(".form-check-label").css("font-size", "1.125rem");
    $(".cutoff-time").css("font-size", "1.125rem");
  }
  mostrarHorasLimite();

  // ====================== GUARDAR/CARGAR ESTADO FORMULARIO (localStorage) ====================== //
  function guardarEstadoFormulario() {
    const estado = {
      jugadaCount,
      selectedTracks,
      selectedDays,
      fecha: $("#fecha").val(),
      jugadas: []
    };
    $("#tablaJugadas tr").each(function() {
      const numero = $(this).find(".numeroApostado").val();
      const modalidad = $(this).find(".tipoJuego").text();
      const straight = $(this).find(".straight").val();
      const box = $(this).find(".box").val();
      const combo = $(this).find(".combo").val();
      const total = $(this).find(".total").text();
      estado.jugadas.push({
        numeroApostado: numero,
        tipoJuego: modalidad,
        straight: straight,
        box: box,
        combo: combo,
        total: total
      });
    });
    localStorage.setItem('estadoFormulario', JSON.stringify(estado));
  }

  function cargarEstadoFormulario() {
    const estado = JSON.parse(localStorage.getItem('estadoFormulario'));
    if (estado) {
      $("#fecha").val(estado.fecha);
      selectedDays   = estado.selectedDays;
      selectedTracks = estado.selectedTracks;
      jugadaCount    = estado.jugadaCount;
      $("#tablaJugadas").empty();

      estado.jugadas.forEach((jugada, index) => {
        if (index >= 100) return;
        const fila = `
          <tr>
            <td>${index + 1}</td>
            <td><input type="number" class="form-control numeroApostado" min="0" max="9999" required value="${jugada.numeroApostado}"></td>
            <td class="tipoJuego">${jugada.tipoJuego}</td>
            <td><input type="number" class="form-control straight" min="0" step="1" value="${jugada.straight}"></td>
            <td><input type="number" class="form-control box" min="0" step="1" value="${jugada.box}"></td>
            <td><input type="number" class="form-control combo" min="0" step="0.10" value="${jugada.combo}"></td>
            <td class="total">${jugada.total}</td>
          </tr>
        `;
        $("#tablaJugadas").append(fila);
      });
      calcularTotal();
      mostrarHorasLimite();
      actualizarEstadoTracks();
      resaltarDuplicados();
    }
  }
  cargarEstadoFormulario();

  $("#lotteryForm").on("reset", function(e) {
    if (!isProgrammaticReset && (!e.originalEvent || !$(e.originalEvent.submitter).hasClass("btn-reset"))) {
      e.preventDefault();
    }
  });

  // ====================== GENERAR TICKET: PREVISUALIZACIÓN INMEDIATA ====================== //
  const ticketModal = new bootstrap.Modal(document.getElementById("ticketModal"), {
    backdrop: "static",
    keyboard: false
  });

  $("#generarTicket").click(function() {
    const fecha = $("#fecha").val();
    if (!fecha) {
      alert("Por favor, selecciona una fecha.");
      return;
    }
    const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
    if (!tracks || tracks.length === 0) {
      alert("Por favor, selecciona al menos un track.");
      return;
    }
    selectedTracks = tracks.length;

    // Validar "Venezuela" + USA
    const tracksUSASeleccionados = tracks.filter(t => Object.keys(horariosCierre.USA).includes(t));
    if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
      alert("Para 'Venezuela' debes seleccionar al menos un track de USA además de 'Venezuela'.");
      return;
    }

    // Validar horario si es hoy
    const fechasArray = fecha.split(", ");
    const fechaActual = dayjs().startOf('day');
    for (let fSelStr of fechasArray) {
      const [m, d, y] = fSelStr.split('-').map(Number);
      const daySel = dayjs(new Date(y, m - 1, d));
      if (daySel.isSame(fechaActual, 'day')) {
        const ahora = dayjs();
        for (let track of tracks) {
          if (track === 'Venezuela') continue;
          const horaLimiteStr = obtenerHoraLimite(track);
          if (horaLimiteStr) {
            let cierreOriginal = dayjs(horaLimiteStr, "HH:mm");
            let cierreFinal = cierreOriginal.isAfter(dayjs("21:30", "HH:mm"))
                              ? dayjs("21:30", "HH:mm")
                              : cierreOriginal.subtract(10, 'minute');
            if (ahora.isAfter(cierreFinal) || ahora.isSame(cierreFinal)) {
              alert(`El track "${track}" ya ha cerrado para hoy. Selecciona otro track o una fecha futura.`);
              return;
            }
          }
        }
      }
    }

    // Validar jugadas
    let jugadasConErrores = [];
    jugadasData = [];
    const numeroTicket = generarNumeroUnico(); // Interno (no se mostrará aún)
    fechaTransaccion = dayjs().format('MM/DD/YYYY hh:mm A');
    const tracksTexto = tracks.join(", ");

    $("#tablaJugadas tr").each(function() {
      const numero = $(this).find(".numeroApostado").val();
      const modalidad = $(this).find(".tipoJuego").text();
      const straight = $(this).find(".straight").val();
      const box = $(this).find(".box").val();
      const combo = $(this).find(".combo").val();
      const total = $(this).find(".total").text();
      const jugadaNumero = parseInt($(this).find("td:first").text());
      let error = false;

      if (!numero || numero.length < 2 || numero.length > 4) {
        error = true;
        jugadasConErrores.push(jugadaNumero);
        $(this).find(".numeroApostado").addClass('error-field');
      } else {
        $(this).find(".numeroApostado").removeClass('error-field');
      }
      if (modalidad === "-") {
        error = true;
        jugadasConErrores.push(jugadaNumero);
      }
      if (parseFloat(total) <= 0) {
        error = true;
        jugadasConErrores.push(jugadaNumero);
      }

      if (!error) {
        jugadasData.push({
          "Ticket Number": numeroTicket, // no se muestra todavía
          "Transaction DateTime": fechaTransaccion,
          "Bet Dates": fecha,
          "Tracks": tracksTexto,
          "Bet Number": numero,
          "Game Mode": modalidad,
          "Straight ($)": straight ? parseFloat(straight).toFixed(2) : "",
          "Box ($)": box ? parseFloat(box).toFixed(2) : "",
          "Combo ($)": combo ? parseFloat(combo).toFixed(2) : "",
          "Total ($)": parseFloat(total).toFixed(2),
          "Jugada Number": generarNumeroUnico(),
          "Timestamp": dayjs().toISOString()
        });
      }
    });

    if (jugadasConErrores.length > 0) {
      const jugadasErrUnicas = [...new Set(jugadasConErrores)];
      alert(`Hay errores en las jugadas: ${jugadasErrUnicas.join(", ")}. Corrígelas antes de generar el ticket.`);
      return;
    }

    // Crear ticketData SIN ticketId
    ticketData = {
      fecha: fechasArray,
      tracks: tracks,
      jugadas: jugadasData,
      totalAmount: parseFloat($("#totalJugadas").text()) || 0,
      selectedDays,
      selectedTracks
    };
    console.log("Datos del Ticket (previsualización):", ticketData);

    // Previsualizar sin ticketId ni QR
    previsualizarSinConfirm(ticketData);
    ticketModal.show();
    guardarEstadoFormulario();
  });

  // ====================== OBTENER HORA LÍMITE (aux) ====================== //
  function obtenerHoraLimite(track) {
    for (let region in horariosCierre) {
      if (horariosCierre[region][track]) return horariosCierre[region][track];
    }
    return null;
  }

  // ====================== PREVISUALIZAR SIN CONFIRMACIÓN ====================== //
  function previsualizarSinConfirm(data) {
    $("#ticketAlerts").empty();
    $("#ticketFecha").text(data.fecha.join(", "));
    $("#ticketTracks").text(data.tracks.join(", "));
    $("#ticketTotal").text(data.totalAmount.toFixed(2));
    const tBody = $("#ticketJugadas");
    tBody.empty();

    data.jugadas.forEach((j, idx) => {
      const row = `
        <tr>
          <td>${idx + 1}</td>
          <td>${j["Bet Number"]}</td>
          <td>${j["Game Mode"]}</td>
          <td>${j["Straight ($)"]}</td>
          <td>${j["Box ($)"] || "-"}</td>
          <td>${j["Combo ($)"] || "-"}</td>
          <td>$${j["Total ($)"]}</td>
        </tr>
      `;
      tBody.append(row);
    });
    // Ocultar ticketId, fechaTransacción y QR
    $("#numeroTicket").text("").parent().hide();
    $("#ticketTransaccion").text("").parent().hide();
    $("#qrcode").empty().parent().parent().hide();
    // Asegurar botón Confirmar visible
    $("#confirmarTicketContainer").show();
  }

  // ====================== CONFIRMAR E IMPRIMIR ====================== //
  $("#confirmarTicket").click(async function() {
    try {
      $("#ticketAlerts").empty();
      // Generar ticketId y fecha
      const ticketId = generarNumeroUnico();
      const fechaTrans = dayjs().format("YYYY-MM-DD HH:mm:ss");
      ticketData.ticketId = ticketId;
      ticketData.fechaTransaccion = fechaTrans;
      ticketData.userEmail = userEmail;
      // Actualizar jugadas con ticketId real
      ticketData.jugadas.forEach(j => { j["Ticket Number"] = ticketId; });

      console.log("Ticket a confirmar:", ticketData);

      // Previsualizar con ticketId y QR
      previsualizarConConfirm(ticketData);

      // Preparar jugadas para envío a backend
      const jugadasAInsertar = ticketData.jugadas.map(j => ({
        ticketNumber: ticketId,
        transactionDateTime: fechaTrans,
        betDates: ticketData.fecha.join(", "),
        tracks: ticketData.tracks.join(", "),
        betNumber: j["Bet Number"],
        gameMode: j["Game Mode"],
        straight: j["Straight ($)"],
        box: j["Box ($)"] || null,
        combo: j["Combo ($)"] || null,
        total: j["Total ($)"],
        userEmail: userEmail
      }));

      // 1) Guardar en backend (colección "jugadas")
      const saveJResp = await fetch(`${BACKEND_API_URL}/tickets/save-jugadas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ jugadas: jugadasAInsertar, ticketId: ticketId })
      });
      const saveJjson = await saveJResp.json();
      if (!saveJResp.ok) {
        console.error("Error en /save-jugadas:", saveJjson);
        showAlert("Error al guardar en la colección 'jugadas'.", "danger");
      } else {
        console.log("Jugadas guardadas en Mongo (colección 'jugadas'):", saveJjson);
      }

      // 2) Guardar en SheetDB
      const payloadSheet = jugadasAInsertar.map(j => ({
        "Ticket Number": j.ticketNumber,
        "Transaction DateTime": j.transactionDateTime,
        "Bet Dates": j.betDates,
        "Tracks": j.tracks,
        "Bet Number": j.betNumber,
        "Game Mode": j.gameMode,
        "Straight ($)": j.straight,
        "Box ($)": j.box !== null ? j.box : "",
        "Combo ($)": j.combo !== null ? j.combo : "",
        "Total ($)": j.total,
        "Timestamp": new Date().toISOString(),
        "User": j.userEmail || "usuario@example.com"
      }));
      try {
        const sheetResp = await fetch(SHEETDB_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payloadSheet })
        });
        if (!sheetResp.ok) {
          const sheetErr = await sheetResp.text();
          throw new Error("SheetDB Error: " + sheetErr);
        }
        const sheetJson = await sheetResp.json();
        console.log("SheetDB response:", sheetJson);
      } catch (e) {
        console.error("Error al guardar en SheetDB:", e);
        showAlert("No se pudo guardar en Google Sheets.", "warning");
      }

      // 3) Descargar imagen del ticket
      await new Promise(r => setTimeout(r, 300));
      html2canvas(document.querySelector("#preTicket"), { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `ticket_${ticketId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }).catch(err => {
        console.error("Error al capturar el ticket:", err);
        showAlert("Error al generar la imagen del ticket.", "danger");
      });

      // 4) Cerrar modal y resetear
      ticketModal.hide();
      resetForm();

    } catch (error) {
      console.error("Error confirmTicket:", error);
      showAlert("Error al confirmar el ticket.", "danger");
    }
  });

  // ====================== PREVISUALIZAR CON CONFIRMACIÓN (TicketID + QR) ====================== //
  function previsualizarConConfirm(data) {
    $("#ticketFecha").text(data.fecha.join(", "));
    $("#ticketTracks").text(data.tracks.join(", "));
    $("#ticketTotal").text(data.totalAmount.toFixed(2));
    const tBody = $("#ticketJugadas");
    tBody.empty();

    data.jugadas.forEach((j, idx) => {
      const row = `
        <tr>
          <td>${idx + 1}</td>
          <td>${j["Bet Number"]}</td>
          <td>${j["Game Mode"]}</td>
          <td>${j["Straight ($)"]}</td>
          <td>${j["Box ($)"] || "-"}</td>
          <td>${j["Combo ($)"] || "-"}</td>
          <td>$${j["Total ($)"]}</td>
        </tr>
      `;
      tBody.append(row);
    });
    $("#numeroTicket").text(data.ticketId || "").parent().show();
    $("#ticketTransaccion").text(data.fechaTransaccion || "").parent().show();
    $("#qrcode").empty().parent().parent().show();
    new QRCode(document.getElementById("qrcode"), {
      text: data.ticketId || "",
      width: 120,
      height: 120
    });
  }

  // ====================== GENERAR NÚMERO ÚNICO ====================== //
  function generarNumeroUnico() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // ====================== MOSTRAR ALERTAS EN MODAL ====================== //
  function showAlert(msg, type) {
    const html = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
    $("#ticketAlerts").append(html);
  }

}); // Fin document.ready

 /***************************************************************************************
 * scripts.js
 * 
 * Flujo:
 * 1) Al hacer clic en "Generar Ticket":
 *    - Se recopila la información del formulario.
 *    - Se construye el objeto ticketData (sin ticketId, fechaTransaccion ni QR).
 *    - Se actualiza el contenido del modal mediante previsualizarSinConfirm(ticketData).
 *    - Se muestra el modal inmediatamente para que el usuario revise la información.
 * 2) Al hacer clic en "Confirmar e Imprimir":
 *    - Se generan ticketId y fechaTransaccion, se actualiza ticketData.
 *    - Se actualiza el modal con ticketId y código QR mediante previsualizarConConfirm(ticketData).
 *    - Se procede con el envío a backend/SheetDB, descarga de imagen, etc.
 ***************************************************************************************/

$(document).ready(function() {
  // ================= Configuraciones Generales ================= //
  const SHEETDB_API_URL  = "https://sheetdb.io/api/v1/bl57zyh73b0ev";  // Tu URL real
  const BACKEND_API_URL  = "https://loteria-backend-j1r3.onrender.com/api"; // Ruta base de tu backend
  const token            = localStorage.getItem("token");
  const userRole         = localStorage.getItem("userRole") || "user";
  console.log("User Role:", userRole);
  if (!token) {
    alert("Debes iniciar sesión para acceder a esta página.");
    window.location.href = "login.html";
    return;
  }

  // ================= Variables Globales ================= //
  let jugadaCount    = 0;
  let selectedDays   = 0;
  let selectedTracks = 0;
  let totalJugadas   = 0;
  let ticketData     = {};  // Contendrá la info del ticket para previsualizar (sin ticketId, etc.)
  let jugadasData    = [];  // Array de jugadas (para enviar a backend/SheetDB)
  let fechaTransaccion = "";
  let isProgrammaticReset = false;
  let userEmail = "";

  // ================= Horarios y Límites ================= //
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

  const limitesApuesta = {
    "Win 4":             { straight: 6,  box: 30, combo: 6 },
    "Peak 3":            { straight: 35, box: 50, combo: 35 },
    "Venezuela":         { straight: 100 },
    "Venezuela-Pale":    { straight: 100 },
    "Pulito":            { straight: 100 },
    "RD-Quiniela":       { straight: 100 },
    "RD-Pale":           { straight: 20 }
  };

  // ================= Inicializar Calendario (Flatpickr) ================= //
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

  // ================= Obtener Perfil del Usuario ================= //
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

  // ================= Funciones para Manejar Jugadas ================= //
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
  // Agregar jugada inicial
  agregarJugada();
  $("#agregarJugada").click(agregarJugada);
  $("#eliminarJugada").click(function() {
    if (jugadaCount === 0) {
      alert("No hay jugadas para eliminar.");
      return;
    }
    $("#tablaJugadas tr:last").remove();
    jugadaCount--;
    $("#tablaJugadas tr").each(function(index) {
      $(this).find("td:first").text(index + 1);
    });
    calcularTotal();
  });

  // ================= Eventos en la Tabla de Jugadas ================= //
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

  // ================= Tracks Seleccionados ================= //
  $(".track-checkbox").change(function() {
    const tracks = $(".track-checkbox:checked").map((_, el) => el.value).get();
    selectedTracks = tracks.length || 1;
    calcularTotal();
  });

  // ================= Función para Determinar Modalidad ================= //
  function determinarModalidad(tracks, numero, fila) {
    if (!numero) return "-";
    const esUSA = tracks.some(t => Object.keys(horariosCierre.USA).includes(t));
    const esSD = tracks.some(t => Object.keys(horariosCierre["Santo Domingo"]).includes(t));
    const incluyeVenezuela = tracks.includes("Venezuela");
    const len = numero.length;
    const boxVal = fila.find(".box").val().trim();
    const boxValues = ["1", "2", "3"];
    const boxCombos = ["1,2", "2,3", "1,3", "1,2,3"];
    if (incluyeVenezuela && esUSA) {
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

  // ================= Actualizar Placeholders según Modalidad ================= //
  function actualizarPlaceholders(modalidad, fila) {
    if (limitesApuesta[modalidad]) {
      fila.find(".straight")
        .attr("placeholder", `Max $${limitesApuesta[modalidad].straight}`)
        .prop("disabled", false);
    } else {
      fila.find(".straight")
        .attr("placeholder", "E.g., 5.00")
        .prop("disabled", false);
    }
    if (modalidad === "Pulito") {
      fila.find(".box").attr("placeholder", "1, 2 o 3").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      fila.find(".box").attr("placeholder", `Max $${limitesApuesta[modalidad].box}`).prop("disabled", false);
      fila.find(".combo").attr("placeholder", `Max $${limitesApuesta[modalidad].combo}`).prop("disabled", false);
    } else {
      fila.find(".box").attr("placeholder", "E.g., 2.50").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "E.g., 3.00").prop("disabled", false);
    }
  }

  // ================= Calcular Total de una Jugada ================= //
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
    if (limitesApuesta[modalidad]) {
      stVal = Math.min(stVal, limitesApuesta[modalidad].straight);
      if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito") {
        boxNum = Math.min(boxNum, limitesApuesta[modalidad].box);
      }
      if (limitesApuesta[modalidad].combo !== undefined) {
        comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo);
      }
    }
    let total = 0;
    if (modalidad === "Pulito") {
      total = stVal;
    } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
      total = stVal;
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      total = stVal + boxNum + (comboNum * combis);
    } else {
      total = stVal + boxNum + comboNum;
    }
    fila.find(".total").text(total.toFixed(2));
    calcularTotal();
  }

  function calcularCombinaciones(numero) {
    const counts = {};
    for (let ch of numero) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
    const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
    let totalDigits = numero.length;
    let denominator = 1;
    for (let digit in counts) {
      if (counts.hasOwnProperty(digit)) {
        denominator *= factorial(counts[digit]);
      }
    }
    return factorial(totalDigits) / denominator;
  }

  // ================= Calcular Total Global ================= //
  function calcularTotal() {
    let t = 0;
    $(".total").each(function() {
      t += parseFloat($(this).text()) || 0;
    });
    console.log("Total antes multiplicar:", t);
    console.log("Tracks:", selectedTracks, "Days:", selectedDays);
    if (selectedDays === 0) t = 0;
    else t = t * selectedTracks * selectedDays;
    $("#totalJugadas").text(t.toFixed(2));
    totalJugadas = t;
  }

  // ================= Resaltar Números Duplicados ================= //
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
      if (dups.has($(this).val().trim())) $(this).addClass("duplicado");
      else $(this).removeClass("duplicado");
    });
  }
  function agregarListenersNumeroApostado() {
    const campos = document.querySelectorAll(".numeroApostado");
    campos.forEach(c => {
      c.removeEventListener("input", resaltarDuplicados);
      c.addEventListener("input", resaltarDuplicados);
    });
  }

  // ================= Actualizar Estado de los Tracks ================= //
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
            .prop("disabled", true)
            .prop("checked", false)
            .closest("label").addClass("closed-track");
        } else {
          $(`.track-checkbox[value="${track}"]`)
            .prop("disabled", false)
            .closest("label").removeClass("closed-track");
        }
      }
    }
  }
  actualizarEstadoTracks();
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

  // ================= Mostrar Horas Límite ================= //
  function mostrarHorasLimite() {
    $(".cutoff-time").each(function() {
      const track = $(this).data("track");
      if (track === 'Venezuela') {
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
  }
  mostrarHorasLimite();

  // ================= Previsualización del Modal ================= //
  // Función para previsualizar SIN confirmación (versión preliminar sin ticketId, fechaTransacción ni QR)
  function previsualizarSinConfirm(data) {
    $("#ticketAlerts").empty();
    $("#ticketFecha").text(data.fecha.join(", "));
    $("#ticketTracks").text(data.tracks.join(", "));
    $("#ticketTotal").text(Number(data.totalAmount).toFixed(2));
    const tBody = $("#ticketJugadas");
    tBody.empty();
    if (data.jugadas && data.jugadas.length > 0) {
      data.jugadas.forEach((j, idx) => {
        const row = `
          <tr>
            <td>${idx + 1}</td>
            <td>${j["Bet Number"] || j.betNumber || ""}</td>
            <td>${j["Game Mode"] || j.gameMode || ""}</td>
            <td>${j["Straight ($)"] || j.straight || ""}</td>
            <td>${j["Box ($)"] || j.box || "-"}</td>
            <td>${j["Combo ($)"] || j.combo || "-"}</td>
            <td>$${j["Total ($)"] || j.total || ""}</td>
          </tr>
        `;
        tBody.append(row);
      });
    } else {
      tBody.append("<tr><td colspan='7' class='text-center'>No hay jugadas registradas</td></tr>");
    }
    // Ocultar elementos de confirmación (ticketId, fechaTransacción, QR)
    $("#numeroTicket").text("").parent().hide();
    $("#ticketTransaccion").text("").parent().hide();
    $("#qrcode").empty().parent().parent().hide();
    // Mostrar el contenedor del botón Confirmar
    $("#confirmarTicketContainer").show();
    // Mostrar el modal inmediatamente (usamos setTimeout para permitir que el DOM se actualice)
    setTimeout(() => {
      ticketModal.show();
    }, 50);
  }

  // Función para previsualizar CON confirmación (se muestra ticketId, fechaTransacción y QR)
  function previsualizarConConfirm(data) {
    $("#ticketFecha").text(data.fecha.join(", "));
    $("#ticketTracks").text(data.tracks.join(", "));
    $("#ticketTotal").text(Number(data.totalAmount).toFixed(2));
    const tBody = $("#ticketJugadas");
    tBody.empty();
    data.jugadas.forEach((j, idx) => {
      const row = `
        <tr>
          <td>${idx + 1}</td>
          <td>${j["Bet Number"] || j.betNumber || ""}</td>
          <td>${j["Game Mode"] || j.gameMode || ""}</td>
          <td>${j["Straight ($)"] || j.straight || ""}</td>
          <td>${j["Box ($)"] || j.box || "-"}</td>
          <td>${j["Combo ($)"] || j.combo || "-"}</td>
          <td>$${j["Total ($)"] || j.total || ""}</td>
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

  // ================= Evento "Generar Ticket" (Previsualización Inmediata) ================= //
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
    // Validaciones adicionales sobre tracks y horarios se realizan aquí...
    const fechasArray = fecha.split(", ");
    const fechaActual = dayjs().startOf('day');
    for (let fStr of fechasArray) {
      const [m, d, y] = fStr.split('-').map(Number);
      const fSel = dayjs(new Date(y, m - 1, d));
      if (fSel.isSame(fechaActual, 'day')) {
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
              alert(`El track "${track}" ya ha cerrado para hoy. Por favor, selecciona otro track o una fecha futura.`);
              return;
            }
          }
        }
      }
    }
    // Se supone que las validaciones de las jugadas ya se hicieron y se han recopilado en jugadasData
    // En este ejemplo, asumimos que ticketData ya se llenó con: fecha, tracks, jugadas, totalAmount, selectedDays, selectedTracks
    console.log("Datos del Ticket (previsualización):", ticketData);
    // Llamamos a la función de previsualización sin confirmación
    previsualizarSinConfirm(ticketData);
    // Guardamos el estado (opcional)
    guardarEstadoFormulario();
  });

  // ================= Evento "Confirmar e Imprimir" ================= //
  $("#confirmarTicket").click(async function() {
    try {
      $("#ticketAlerts").empty();
      const ticketId = generarNumeroUnico();
      const fechaTrans = dayjs().format("YYYY-MM-DD HH:mm:ss");
      ticketData.ticketId = ticketId;
      ticketData.fechaTransaccion = fechaTrans;
      ticketData.userEmail = userEmail;
      ticketData.jugadas.forEach(j => { j["Ticket Number"] = ticketId; });
      console.log("Ticket a confirmar:", ticketData);
      previsualizarConConfirm(ticketData);
      // Aquí se llamarían funciones para enviar datos al backend/SheetDB, descargar imagen, etc.
      // ...
      ticketModal.hide();
      resetForm();
    } catch (error) {
      console.error("Error al confirmar el ticket:", error);
      showAlert("Error al confirmar el ticket.", "danger");
    }
  });

  // ================= Función para Obtener Hora Límite ================= //
  function obtenerHoraLimite(track) {
    for (let region in horariosCierre) {
      if (horariosCierre[region][track]) return horariosCierre[region][track];
    }
    return null;
  }

  // ================= Función para Generar Número Único ================= //
  function generarNumeroUnico() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // ================= Funciones para Guardar/Cargar Estado del Formulario ================= //
  function guardarEstadoFormulario() {
    const estado = {
      jugadaCount: jugadaCount,
      selectedTracks: selectedTracks,
      selectedDays: selectedDays,
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
      selectedDays = estado.selectedDays;
      selectedTracks = estado.selectedTracks;
      jugadaCount = estado.jugadaCount;
      $("#tablaJugadas").empty();
      estado.jugadas.forEach((jugada, index) => {
        if (index >= 100) return;
        const fila = `
          <tr>
            <td>${index + 1}</td>
            <td><input type="number" class="form-control numeroApostado" min="0" max="9999" required value="${jugada.numeroApostado}"></td>
            <td class="tipoJuego">${jugada.tipoJuego}</td>
            <td><input type="number" class="form-control straight" step="1" placeholder="E.g., 5" value="${jugada.straight}"></td>
            <td><input type="number" class="form-control box" step="1" placeholder="1, 2 o 3" value="${jugada.box}"></td>
            <td><input type="number" class="form-control combo" step="0.10" placeholder="E.g., 3.00" value="${jugada.combo}"></td>
            <td class="total">${jugada.total}</td>
          </tr>
        `;
        $("#tablaJugadas").append(fila);
      });
      jugadaCount = estado.jugadaCount;
      calcularTotal();
      mostrarHorasLimite();
      actualizarEstadoTracks();
      resaltarDuplicados();
    }
  }
  cargarEstadoFormulario();

  // ================= Prevenir Reseteo Involuntario del Formulario ================= //
  $("#lotteryForm").on("reset", function(e) {
    if (!isProgrammaticReset && (!e.originalEvent || !$(e.originalEvent.submitter).hasClass("btn-reset"))) {
      e.preventDefault();
    }
  });

  // ================= Inicializar Modal de Bootstrap ================= //
  const ticketModal = new bootstrap.Modal(document.getElementById("ticketModal"), {});

  // ================= Función para Mostrar Alertas ================= //
  function showAlert(msg, type) {
    const html = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    $("#ticketAlerts").append(html);
  }

  // ================= Función para Resetear el Formulario ================= //
  function resetForm() {
    $("#lotteryForm")[0].reset();
    $("#tablaJugadas").empty();
    jugadaCount = 0;
    selectedTracks = 0;
    selectedDays = 0;
    totalJugadas = 0;
    ticketData = {};
    $("#totalJugadas").text("0.00");
    $(".track-checkbox").prop("disabled", false).closest("label").removeClass("closed-track");
    agregarJugada();
  }

  // ================= Intervalo para Actualizar Estado de los Tracks ================= //
  setInterval(actualizarEstadoTracks, 60000);

});

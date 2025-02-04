 /***************************************************************************************
 * scripts.js - Versión consolidada
 * 
 * - Se mantiene la lista completa de tracks (USA, Santo Domingo, Venezuela).
 * - Se arregla el modal de previsualización (#preTicket) para que NO se oculte/vacíe.
 * - Se corrige la lógica de descarga con html2canvas (scale:3 + setTimeout).
 * - Se da un pequeño retardo adicional para que el usuario vea el ticket antes de cerrarlo.
 ***************************************************************************************/

$(document).ready(function() {
  // =================== Configuraciones Generales =================== //
  const SHEETDB_API_URL = "https://sheetdb.io/api/v1/gect4lbs5bwvr"; 
  const BACKEND_API_URL = "https://loteria-backend-j1r3.onrender.com/api/tickets"; 
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole") || "user";
  console.log("User Role:", userRole);

  if (!token) {
    alert("Debes iniciar sesión para acceder a esta página.");
    window.location.href = "login.html";
    return;
  }

  // -------------------- Variables Globales -------------------- //
  let jugadaCount = 0;
  let selectedDays = 0;
  let selectedTracks = 0;
  let totalJugadasGlobal = 0;
  let ticketData = {};
  let ticketId = null;
  let userEmail = ""; // se llenará con getProfile

  // =================== Horarios de cierre (completos) =================== //
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

  // =================== Límites de apuesta (versión larga) =================== //
  const limitesApuesta = {
    "Win 4": { "straight": 6,  "box": 30, "combo": 50 },
    "Peak 3": { "straight": 35, "box": 50, "combo": 70 },
    "Venezuela":       { "straight": 100 },
    "Venezuela-Pale":  { "straight": 20 },
    "Pulito":          { "straight": 100 },
    "Pulito-Combinado":{ "straight": 100 },
    "RD-Quiniela":     { "straight": 100 },
    "RD-Pale":         { "straight": 20 },
    "Combo":           { "combo": 50 }
  };

  // =================== Inicializar Flatpickr =================== //
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

  // =================== Obtener Perfil del Usuario =================== //
  async function obtenerPerfilUsuario() {
    try {
      const response = await fetch("https://loteria-backend-j1r3.onrender.com/api/auth/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        userEmail = data.email;
        console.log("Email del usuario:", userEmail);
      } else {
        console.error("Error al obtener el perfil:", data.msg);
      }
    } catch (error) {
      console.error("Error al obtener el perfil:", error);
    }
  }
  obtenerPerfilUsuario();

  // =================== Manejo de Jugadas =================== //
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
    // Recontar
    $("#tablaJugadas tr").each(function(index) {
      $(this).find("td:first").text(index + 1);
    });
    calcularTotal();
  });

  // =================== Tracks =================== //
  $(".track-checkbox").change(function() {
    const tracks = $(".track-checkbox:checked").map(function() {
      return $(this).val();
    }).get();
    selectedTracks = tracks.length || 1;
    calcularTotal();
  });

  // =================== Detectar cambios en tabla Jugadas =================== //
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

  // =================== Determinar Modalidad =================== //
  function determinarModalidad(tracks, numero, fila) {
    if (!numero) return "-";

    const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
    const esSD  = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
    const incluyeVenezuela = tracks.includes("Venezuela");
    const longitud = numero.length;
    const boxValue = fila.find(".box").val().trim();
    const acceptableBoxValues        = ["1", "2", "3"];
    const acceptableBoxCombinations  = ["1,2", "2,3", "1,3", "1,2,3"];

    // Lógica
    if (incluyeVenezuela && esUSA) {
      if (longitud === 2) return "Venezuela";
      else if (longitud === 4) return "Venezuela-Pale";
    } else if (esUSA && !esSD) {
      if (longitud === 4) return "Win 4";
      if (longitud === 3) return "Peak 3";
      if (longitud === 2) {
        if (acceptableBoxValues.includes(boxValue)) return "Pulito";
        if (acceptableBoxCombinations.includes(boxValue)) return "Pulito-Combinado";
      }
    } else if (esSD && !esUSA) {
      if (longitud === 2) return "RD-Quiniela";
      else if (longitud === 4) return "RD-Pale";
    }
    return "-";
  }

  // =================== Actualizar Placeholders =================== //
  function actualizarPlaceholders(modalidad, fila) {
    if (limitesApuesta[modalidad]) {
      fila.find(".straight")
        .attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight ?? "?"}`)
        .prop("disabled", false);
    } else {
      fila.find(".straight")
        .attr("placeholder", "Ej: 5.00")
        .prop("disabled", false);
    }

    if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
      fila.find(".box").attr("placeholder", "1,2,3").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (
      modalidad === "Venezuela" ||
      modalidad === "Venezuela-Pale" ||
      modalidad.startsWith("RD-")
    ) {
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      fila.find(".box")
        .attr("placeholder", `Máx $${limitesApuesta[modalidad].box ?? "?"}`)
        .prop("disabled", false);
      fila.find(".combo")
        .attr("placeholder", `Máx $${limitesApuesta[modalidad].combo ?? "?"}`)
        .prop("disabled", false);
    } else if (modalidad === "Combo") {
      fila.find(".straight").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo")
        .attr("placeholder", `Máx $${limitesApuesta["Combo"].combo}`)
        .prop("disabled", false);
    } else {
      fila.find(".box")
        .attr("placeholder", "Ej: 2.00")
        .prop("disabled", false);
      fila.find(".combo")
        .attr("placeholder", "Ej: 3.00")
        .prop("disabled", false);
    }
  }

  // =================== Calcular Total de Jugada =================== //
  function calcularTotalJugada(fila) {
    const modalidad = fila.find(".tipoJuego").text();
    const numero = fila.find(".numeroApostado").val();
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

    if (limitesApuesta[modalidad]) {
      straight = Math.min(straight, limitesApuesta[modalidad].straight);
      if (
        limitesApuesta[modalidad].box !== undefined &&
        modalidad !== "Pulito" && modalidad !== "Pulito-Combinado"
      ) {
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

  // =================== Calcular Combinaciones =================== //
  function calcularCombinaciones(numero) {
    const counts = {};
    for (let ch of numero) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
    function factorial(n) {
      return n <= 1 ? 1 : n * factorial(n - 1);
    }
    let totalDigits = numero.length;
    let denominator = 1;
    for (let digit in counts) {
      denominator *= factorial(counts[digit]);
    }
    return factorial(totalDigits) / denominator;
  }

  // =================== Calcular Total Global =================== //
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
      total *= (selectedTracks * selectedDays);
    }
    console.log("Total después de multiplicar:", total.toFixed(2));
    $("#totalJugadas").text(total.toFixed(2));
  }

  // =================== ResaltarDuplicados =================== //
  function resaltarDuplicados() {
    const campos = document.querySelectorAll(".numeroApostado");
    const valores = {};
    const duplicados = new Set();

    campos.forEach(campo => {
      const val = campo.value.trim();
      if (val) {
        if (valores[val]) {
          duplicados.add(val);
        } else {
          valores[val] = true;
        }
      }
    });

    campos.forEach(campo => {
      if (duplicados.has(campo.value.trim())) {
        campo.classList.add("duplicado");
      } else {
        campo.classList.remove("duplicado");
      }
    });
  }

  function agregarListenersNumeroApostado() {
    const campos = document.querySelectorAll(".numeroApostado");
    campos.forEach(campo => {
      campo.removeEventListener("input", resaltarDuplicados);
      campo.addEventListener("input", resaltarDuplicados);
    });
  }

  // =================== Actualizar Estado de Tracks =================== //
  function actualizarEstadoTracks() {
    const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
    if (!fechaSeleccionadaStr) return;

    const [mm, dd, yy] = fechaSeleccionadaStr.split("-").map(Number);
    const fechaSeleccionada = new Date(yy, mm - 1, dd);
    const fechaActual = new Date();
    const esMismoDia = (fechaSeleccionada.toDateString() === fechaActual.toDateString());

    if (!esMismoDia) {
      $(".track-checkbox").prop("disabled", false).closest("label").removeClass("closed-track");
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
    const fechaSeleccionadaStr = $("#fecha").val().split(", ")[0];
    if (!fechaSeleccionadaStr) return;

    const [m, d, y] = fechaSeleccionadaStr.split("-").map(Number);
    const fechaSeleccionada = new Date(y, m - 1, d);
    const fechaActual = new Date();
    if (fechaSeleccionada.toDateString() === fechaActual.toDateString()) {
      actualizarEstadoTracks();
    }
  }, 60000);

  // =================== Mostrar Horas Límite =================== //
  function mostrarHorasLimite() {
    $(".cutoff-time").each(function() {
      const track = $(this).data("track");
      if (track === "Venezuela") {
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
        const horas = cutoff.getHours().toString().padStart(2, "0");
        const minutos = cutoff.getMinutes().toString().padStart(2, "0");
        $(this).text("Hora límite: " + horas + ":" + minutos);
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

  // =================== Modal de Bootstrap =================== //
  const ticketModal = new bootstrap.Modal(document.getElementById("ticketModal"));

  // =================== mostrarPreTicketModal =================== //
  // (Ajuste modal) -> NO se oculta #preTicket, solo llenamos
  function mostrarPreTicketModal(tData, isConfirmed) {
    $("#ticketAlerts").empty();

    // Llenar #ticketFecha, #ticketTracks, #ticketTotal
    $("#ticketFecha").text(tData.fecha.join(", "));
    $("#ticketTracks").text(tData.tracks.join(", "));
    $("#ticketTotal").text(tData.totalAmount.toFixed(2));

    // Llenar tabla
    const tbody = $("#ticketJugadas");
    tbody.empty();

    tData.jugadas.forEach((jug, index) => {
      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${jug.numero}</td>
          <td>${jug.modalidad}</td>
          <td>${(jug.straight || 0).toFixed(2)}</td>
          <td>${(jug.box !== null && jug.box !== undefined) ? jug.box.toFixed(2) : "-"}</td>
          <td>${(jug.combo !== null && jug.combo !== undefined) ? jug.combo.toFixed(2) : "-"}</td>
          <td>$${(jug.total || 0).toFixed(2)}</td>
        </tr>
      `;
      tbody.append(row);
    });

    if (!isConfirmed) {
      $("#numeroTicket").text("").parent().hide();
      $("#ticketTransaccion").text("").parent().hide();
      $("#qrcode").empty().parent().parent().hide();
    } else {
      $("#numeroTicket").parent().show();
      $("#ticketTransaccion").parent().show();
      $("#qrcode").parent().parent().show();
    }

    // Asegurar contenedor de confirmar es visible
    $("#confirmarTicketContainer").show();
  }

  // =================== Generar Ticket (Previsualización) =================== //
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
      const numero    = $(this).find(".numeroApostado").val();
      const modalidad = $(this).find(".tipoJuego").text();
      const straight  = parseFloat($(this).find(".straight").val()) || 0;
      const boxVal    = $(this).find(".box").val();
      const comboVal  = $(this).find(".combo").val();
      const totalFila = parseFloat($(this).find(".total").text()) || 0;

      if (!numero || numero.length < 2 || numero.length > 4) {
        jugadasValidas = false;
        showAlert("Ingresa números válidos (2, 3 o 4 dígitos).", "danger");
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

      let boxNum   = (boxVal && !isNaN(boxVal)) ? parseFloat(boxVal) : null;
      let comboNum = (comboVal && !isNaN(comboVal)) ? parseFloat(comboVal) : null;

      jugadasArray.push({
        "Ticket Number": "PEND-XXXX",
        numero: numero,
        modalidad: modalidad,
        straight: straight,
        box: boxNum,
        combo: comboNum,
        total: totalFila
      });
    });

    if (!jugadasValidas) return;

    totalJugadasGlobal = parseFloat($("#totalJugadas").text());

    // Transformar fechas
    const fechasSeleccionadas = fecha.split(", ").map(fStr => {
      const [mm, dd, yy] = fStr.split("-").map(Number);
      return `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    });

    // Construir ticketData
    ticketData = {
      fecha: fechasSeleccionadas,
      tracks: tracks,
      jugadas: jugadasArray,
      totalAmount: totalJugadasGlobal,
      selectedDays: selectedDays,
      selectedTracks: selectedTracks
    };

    console.log("Datos del Ticket (pre-confirmación):", ticketData);

    // (Ajuste modal) -> Llamar a mostrarPreTicketModal + modal.show()
    mostrarPreTicketModal(ticketData, false);
    ticketModal.show();
  });

  // =================== Confirmar e Imprimir Ticket =================== //
  $("#confirmarTicket").click(async function() {
    try {
      $("#ticketAlerts").empty();

      // Generar un ticketId
      const numeroTicket = generarNumeroUnico();
      const fechaTransaccion = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // Actualizar modal con los datos finales
      $("#numeroTicket").text(numeroTicket);
      $("#ticketTransaccion").text(fechaTransaccion);
      $("#qrcode").empty().parent().parent().show();

      new QRCode(document.getElementById("qrcode"), numeroTicket);

      // Ajustar ticketData con la info final
      if (ticketData.jugadas) {
        ticketData.jugadas.forEach(j => {
          j["Ticket Number"] = numeroTicket;
        });
      }

      ticketData.ticketId = numeroTicket;
      ticketData.fechaTransaccion = fechaTransaccion;
      ticketData.userEmail = userEmail;

      console.log("Ticket a confirmar:", ticketData);

      // Enviar al backend (Mongo)
      const resp = await fetch(`${BACKEND_API_URL}/store-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(ticketData)
      });
      const data = await resp.json();

      if (!resp.ok) {
        const msg = data.error || "Error al guardar el ticket en backend.";
        showAlert(msg, "danger");
        return;
      }

      console.log("Ticket almacenado en backend:", data);

      // Enviar a SheetDB
      const sheetPayload = data.jugadas.map(j => ({
        "Ticket Number": data.ticketId,
        "Transaction DateTime": dayjs(data.fechaTransaccion).format("YYYY-MM-DD HH:mm:ss"),
        "Bet Dates": data.fecha.join(", "),
        "Tracks": data.tracks.join(", "),
        "Bet Number": j.numero,
        "Game Mode": j.modalidad,
        "Straight ($)": j.straight,
        "Box ($)": j.box !== null ? j.box : "",
        "Combo ($)": j.combo !== null ? j.combo : "",
        "Total ($)": j.total,
        "Timestamp": new Date().toISOString(),
        "User": data.userEmail || "usuario@example.com"
      }));

      console.log("Payload para SheetDB:", sheetPayload);

      try {
        const sheetRes = await fetch(SHEETDB_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sheetPayload })
        });
        if (!sheetRes.ok) {
          const sheetErrText = await sheetRes.text();
          throw new Error("SheetDB Error: " + sheetErrText);
        }
        const sheetJson = await sheetRes.json();
        console.log("SheetDB response:", sheetJson);
      } catch (sheetErr) {
        console.error("Error al enviar a SheetDB:", sheetErr);
        showAlert("No se pudo enviar a Google Sheets. Revisa la consola.", "warning");
      }

      // (Ajuste modal) -> Actualizar en modo isConfirmed
      mostrarPreTicketModal(data, true);

      // (Ajuste descarga) -> Esperar 800ms (para ver el ticket un momento) y luego capturar
      await new Promise(r => setTimeout(r, 800));

      const preTicketEl = document.querySelector("#preTicket");
      // scale:3 para más nitidez
      html2canvas(preTicketEl, { scale: 3 }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `ticket_${data.ticketId || 'sinID'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      // Esperar un poco más antes de cerrar (1.5s)
      setTimeout(() => {
        ticketModal.hide();
        resetForm();
      }, 1500);

    } catch (error) {
      console.error("Error al confirmar ticket:", error);
      showAlert("Ocurrió un error al confirmar el ticket. Revisa la consola.", "danger");
    }
  });

  // =================== Generar un Número de Ticket =================== //
  function generarNumeroUnico() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // =================== Reset Form =================== //
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
    localStorage.removeItem("ticketId");

    $(".track-checkbox").prop("disabled", false).closest("label").removeClass("closed-track");
    console.log("Formulario reseteado.");
  }

  // =================== Recuperar Ticket Previo (opcional) =================== //
  $(window).on("load", function() {
    ticketId = localStorage.getItem("ticketId");
    if (ticketId) {
      $.ajax({
        url: `${BACKEND_API_URL}/retrieve-ticket`,
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({ ticketId: ticketId }),
        headers: {
          "Authorization": `Bearer ${token}`
        },
        success: function(response) {
          if (response.ticketData) {
            showAlert("Se recuperó el ticket.", "info");
          } else {
            showAlert("Error al recuperar los datos del ticket.", "danger");
            localStorage.removeItem("ticketId");
          }
        },
        error: function(err) {
          console.error("Error al recuperar datos del ticket:", err);
          showAlert("Error al recuperar datos del ticket.", "danger");
          localStorage.removeItem("ticketId");
        }
      });
    }
  });

});

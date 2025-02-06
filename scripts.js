 /***************************************************************************************
 * scripts.js
 *
 * Flujo:
 *   1) Al hacer clic en "Generar Ticket", se abre un modal de previsualización que muestra
 *      las jugadas, fechas, tracks y el total (sin ticketId, fecha de transacción ni QR).
 *   2) El modal presenta dos botones: "Editar" (para volver al formulario) y "Confirmar e Imprimir".
 *   3) Al confirmar, se genera el ticketId, se crea el QR (120x120), se envían las jugadas al
 *      backend (guardándose en la colección "jugadas"), se envían a Google Sheets, se descarga
 *      la imagen del ticket y el modal permanece abierto para que el usuario pueda compartir la imagen.
 ***************************************************************************************/

$(document).ready(function() {
  // ================= Configuraciones Generales ================= //
  // Asegúrate de que BACKEND_API_URL incluya la ruta correcta (por ejemplo, "/api/tickets")
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

  // ================= Variables Globales ================= //
  let jugadaCount = 0;
  let selectedDays = 0;
  let selectedTracks = 0;
  let totalJugadas = 0;
  let ticketData = {}; // Objeto que contendrá la info del ticket (pre-confirmación)
  let userEmail = "";  // Se obtendrá del perfil

  // ================= Horarios y Límites ================= //
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
    "Win 4": { straight: 6, box: 30, combo: 50 },
    "Peak 3": { straight: 35, box: 50, combo: 70 },
    "Venezuela": { straight: 100 },
    "Venezuela-Pale": { straight: 20 },
    "Pulito": { straight: 100 },
    "Pulito-Combinado": { straight: 100 },
    "RD-Quiniela": { straight: 100 },
    "RD-Pale": { straight: 20 },
    "Combo": { combo: 50 }
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
      const resp = await fetch(`${BACKEND_API_URL.replace('/tickets','')}/auth/profile`, {
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

  // ================= Funciones de Jugadas ================= //
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
        <td><input type="number" class="form-control straight" step="1" placeholder="Ej: 5"></td>
        <td><input type="number" class="form-control box" step="1" placeholder="Ej: 2"></td>
        <td><input type="number" class="form-control combo" step="0.10" placeholder="Ej: 3.00"></td>
        <td class="total">0.00</td>
      </tr>
    `;
    $("#tablaJugadas").append(row);
    agregarListenersNumeroApostado();
    resaltarDuplicados();
  }
  // Agregar la jugada inicial
  agregarJugada();

  $("#agregarJugada").click(() => agregarJugada());
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

  // ================= Manejo de Tracks ================= //
  $(".track-checkbox").change(function() {
    const tracks = $(".track-checkbox:checked").map((_, el) => el.value).get();
    selectedTracks = tracks.length || 1;
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

  // ================= Determinar Modalidad ================= //
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

  // ================= Actualizar Placeholders ================= //
  function actualizarPlaceholders(modalidad, fila) {
    if (limitesApuesta[modalidad]) {
      const stMax = limitesApuesta[modalidad].straight || "";
      fila.find(".straight")
        .attr("placeholder", `Máx $${stMax}`)
        .prop("disabled", false);
    } else {
      fila.find(".straight")
        .attr("placeholder", "Ej: 5")
        .prop("disabled", false);
    }

    if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
      fila.find(".box").attr("placeholder", "1,2,3").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo").attr("placeholder", "No aplica").prop("disabled", true).val("");
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      fila.find(".box")
          .attr("placeholder", `Máx $${limitesApuesta[modalidad].box || "?"}`)
          .prop("disabled", false);
      fila.find(".combo")
          .attr("placeholder", `Máx $${limitesApuesta[modalidad].combo || "?"}`)
          .prop("disabled", false);
    } else if (modalidad === "Combo") {
      fila.find(".straight").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".box").attr("placeholder", "No aplica").prop("disabled", true).val("");
      fila.find(".combo")
          .attr("placeholder", `Máx $${limitesApuesta.Combo.combo}`)
          .prop("disabled", false);
    } else {
      fila.find(".box").attr("placeholder", "Ej: 2.00").prop("disabled", false);
      fila.find(".combo").attr("placeholder", "Ej: 3.00").prop("disabled", false);
    }
  }

  // ================= Calcular Total de Jugada ================= //
  function calcularTotalJugada(fila) {
    const modalidad = fila.find(".tipoJuego").text();
    const numero = fila.find(".numeroApostado").val();
    if (!numero || numero.length < 2 || numero.length > 4) {
      fila.find(".total").text("0.00");
      return;
    }
    const combinaciones = calcularCombinaciones(numero);
    let stVal = parseFloat(fila.find(".straight").val()) || 0;
    let boxVal = fila.find(".box").val().trim();
    let boxNum = boxVal ? parseFloat(boxVal) : 0;
    let coVal = fila.find(".combo").val().trim();
    let comboNum = coVal ? parseFloat(coVal) : 0;

    if (limitesApuesta[modalidad]) {
      stVal = Math.min(stVal, limitesApuesta[modalidad].straight);
      if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
        boxNum = Math.min(boxNum, limitesApuesta[modalidad].box);
      }
      if (limitesApuesta[modalidad].combo !== undefined) {
        comboNum = Math.min(comboNum, limitesApuesta[modalidad].combo);
      }
    }

    let total = 0;
    if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
      const values = boxVal.split(",").filter(v => v !== "");
      total = stVal * values.length;
    } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
      total = stVal;
    } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
      total = stVal + boxNum + (comboNum * combinaciones);
    } else if (modalidad === "Combo") {
      total = comboNum;
    } else {
      total = stVal + boxNum + comboNum;
    }

    fila.find(".total").text(total.toFixed(2));
  }

  function calcularCombinaciones(numero) {
    const counts = {};
    for (let ch of numero) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
    const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
    let totalDigits = numero.length;
    let denom = 1;
    for (let d in counts) {
      denom *= factorial(counts[d]);
    }
    return factorial(totalDigits) / denom;
  }

  // ================= Calcular Total Global ================= //
  function calcularTotal() {
    let t = 0;
    $(".total").each(function() {
      t += parseFloat($(this).text()) || 0;
    });
    console.log("Total antes:", t);
    console.log("Tracks:", selectedTracks, "Days:", selectedDays);
    if (selectedDays === 0) t = 0;
    else t = t * selectedTracks * selectedDays;
    $("#totalJugadas").text(t.toFixed(2));
    totalJugadas = t;
  }

  // ================= Resaltar Duplicados ================= //
  function resaltarDuplicados() {
    const campos = document.querySelectorAll(".numeroApostado");
    const valores = {};
    const duplicados = new Set();
    campos.forEach(c => {
      const v = c.value.trim();
      if (v) {
        if (valores[v]) duplicados.add(v);
        else valores[v] = true;
      }
    });
    campos.forEach(c => {
      if (duplicados.has(c.value.trim())) c.classList.add("duplicado");
      else c.classList.remove("duplicado");
    });
  }

  function agregarListenersNumeroApostado() {
    const campos = document.querySelectorAll(".numeroApostado");
    campos.forEach(c => {
      c.removeEventListener("input", resaltarDuplicados);
      c.addEventListener("input", resaltarDuplicados);
    });
  }

  // ================= Actualizar Estado de Tracks ================= //
  function actualizarEstadoTracks() {
    const fechaStr = $("#fecha").val().split(", ")[0];
    if (!fechaStr) return;
    const [m, d, y] = fechaStr.split("-").map(Number);
    const fSel = new Date(y, m - 1, d);
    const hoy = new Date();
    const esHoy = fSel.toDateString() === hoy.toDateString();
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
      if (track === "Venezuela") {
        $(this).hide();
        return;
      }
      let cStr = "";
      if (horariosCierre.USA[track]) {
        cStr = horariosCierre.USA[track];
      } else if (horariosCierre["Santo Domingo"][track]) {
        cStr = horariosCierre["Santo Domingo"][track];
      } else if (horariosCierre.Venezuela[track]) {
        cStr = horariosCierre.Venezuela[track];
      }
      if (cStr) {
        const [hh, mm] = cStr.split(":").map(Number);
        const cutoff = new Date();
        cutoff.setHours(hh, mm - 5, 0, 0);
        const hh2 = String(cutoff.getHours()).padStart(2, "0");
        const mm2 = String(cutoff.getMinutes()).padStart(2, "0");
        $(this).text(`Hora límite: ${hh2}:${mm2}`);
      }
    });
  }
  mostrarHorasLimite();

  // ================= Mostrar Alertas ================= //
  function showAlert(msg, type) {
    const html = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    $("#ticketAlerts").append(html);
  }

  // ================= Modal Bootstrap ================= //
  const ticketModal = new bootstrap.Modal(document.getElementById("ticketModal"), {});

  // ================= Previsualizar sin Confirmar (Modal) ================= //
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
          <td>${j.numero}</td>
          <td>${j.modalidad}</td>
          <td>${j.straight.toFixed(2)}</td>
          <td>${(j.box != null) ? j.box.toFixed(2) : "-"}</td>
          <td>${(j.combo != null) ? j.combo.toFixed(2) : "-"}</td>
          <td>$${j.total.toFixed(2)}</td>
        </tr>
      `;
      tBody.append(row);
    });
    // En la previsualización inicial, ocultamos ticketId, transacción y QR.
    $("#numeroTicket").text("").parent().hide();
    $("#ticketTransaccion").text("").parent().hide();
    $("#qrcode").empty().parent().parent().hide();
    // Aseguramos que el botón "Confirmar e Imprimir" se muestre.
    $("#confirmarTicketContainer").show();
  }

  // ================= Generar Ticket (Previsualización) ================= //
  $("#generarTicket").click(function() {
    $("#ticketAlerts").empty();
    const fechaVal = $("#fecha").val();
    if (!fechaVal) {
      showAlert("Por favor, selecciona una fecha.", "warning");
      return;
    }
    const tracks = $(".track-checkbox:checked").map((_, el) => el.value).get();
    if (!tracks.length) {
      showAlert("Selecciona al menos un track.", "warning");
      return;
    }

    let jugadasValidas = true;
    const jugadasArr = [];
    $("#tablaJugadas tr").each(function() {
      const numero = $(this).find(".numeroApostado").val();
      const modalidad = $(this).find(".tipoJuego").text();
      const straight = parseFloat($(this).find(".straight").val()) || 0;
      const boxVal = $(this).find(".box").val();
      const comboVal = $(this).find(".combo").val();
      const filaTotal = parseFloat($(this).find(".total").text()) || 0;

      if (!numero || numero.length < 2 || numero.length > 4) {
        showAlert("Ingresa un número válido (2-4 dígitos).", "danger");
        jugadasValidas = false;
        return false;
      }
      if (modalidad === "-") {
        showAlert("Modalidad de juego no válida.", "danger");
        jugadasValidas = false;
        return false;
      }
      if (filaTotal <= 0) {
        showAlert("Apuesta inválida, revisa montos.", "danger");
        jugadasValidas = false;
        return false;
      }

      let boxNum = (boxVal && !isNaN(boxVal)) ? parseFloat(boxVal) : null;
      let comboNum = (comboVal && !isNaN(comboVal)) ? parseFloat(comboVal) : null;

      jugadasArr.push({
        numero,
        modalidad,
        straight,
        box: boxNum,
        combo: comboNum,
        total: filaTotal
      });
    });
    if (!jugadasValidas) return;

    const totalFinal = parseFloat($("#totalJugadas").text()) || 0;
    const fechasArray = fechaVal.split(", ").map(fStr => {
      const [m, d, y] = fStr.split("-").map(Number);
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });

    ticketData = {
      fecha: fechasArray,
      tracks,
      jugadas: jugadasArr,
      totalAmount: totalFinal,
      selectedDays,
      selectedTracks
    };

    console.log("Datos del Ticket (previsualización):", ticketData);
    previsualizarSinConfirm(ticketData);
    ticketModal.show();
  });

  // ================= Confirmar e Imprimir Ticket ================= //
  $("#confirmarTicket").click(async function() {
    try {
      $("#ticketAlerts").empty();
      // Generar ticketId y fechaTransaccion
      const ticketId = generarTicketId();
      const fechaTrans = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // Actualizar ticketData con estos campos
      ticketData.ticketId = ticketId;
      ticketData.fechaTransaccion = fechaTrans;
      ticketData.userEmail = userEmail;

      // Insertar ticketId en cada jugada (si es necesario para referencia)
      ticketData.jugadas.forEach(j => {
        j["Ticket Number"] = ticketId;
      });

      // Previsualizar con ticketId, fecha y QR
      previsualizarConConfirm(ticketData);

      // Enviar las jugadas al backend para guardarlas en la colección "jugadas"
      const jugadasPayload = ticketData.jugadas.map(j => ({
        ticketNumber: ticketId,
        transactionDateTime: fechaTrans,
        betDates: ticketData.fecha.join(", "),
        tracks: ticketData.tracks.join(", "),
        betNumber: j.numero,
        gameMode: j.modalidad,
        straight: j.straight,
        box: j.box,
        combo: j.combo,
        total: j.total,
        userEmail: userEmail
      }));

      const saveResp = await fetch(`${BACKEND_API_URL}/save-jugadas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ jugadas: jugadasPayload })
      });
      const saveJson = await saveResp.json();
      if (!saveResp.ok) {
        console.error("Error en /save-jugadas:", saveJson);
        showAlert("Error al guardar en la colección 'jugadas'.", "danger");
        return;
      }
      console.log("Jugadas guardadas en Mongo (colección jugadas):", saveJson);

      // Guardar en Google Sheets
      const sheetPayload = jugadasPayload.map(j => ({
        "Ticket Number": j.ticketNumber,
        "Transaction DateTime": j.transactionDateTime,
        "Bet Dates": j.betDates,
        "Tracks": j.tracks,
        "Bet Number": j.betNumber,
        "Game Mode": j.gameMode,
        "Straight ($)": j.straight,
        "Box ($)": (j.box != null) ? j.box : "",
        "Combo ($)": (j.combo != null) ? j.combo : "",
        "Total ($)": j.total,
        "Timestamp": new Date().toISOString(),
        "User": j.userEmail || "usuario@example.com"
      }));
      console.log("Payload para SheetDB:", sheetPayload);
      try {
        const sheetResp = await fetch(SHEETDB_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sheetPayload })
        });
        if (!sheetResp.ok) {
          const sheetErr = await sheetResp.text();
          throw new Error("SheetDB Error: " + sheetErr);
        }
        const sheetJson = await sheetResp.json();
        console.log("SheetDB response:", sheetJson);
      } catch (sheetError) {
        console.error("Error al guardar en SheetDB:", sheetError);
        showAlert("No se pudo guardar en Google Sheets.", "warning");
      }

      // Esperar brevemente para que se actualicen los estilos y capturar el modal en imagen
      await new Promise(resolve => setTimeout(resolve, 300));
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

      // No se cierra automáticamente el modal; el usuario puede revisarlo y compartir la imagen.
      // Puedes, si lo deseas, habilitar una opción para cerrar y resetear el formulario.

    } catch (error) {
      console.error("Error en Confirmar e Imprimir:", error);
      showAlert("Ocurrió un error al confirmar el ticket.", "danger");
    }
  });

  // ================= Previsualizar con Confirmación ================= //
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
          <td>${j.numero}</td>
          <td>${j.modalidad}</td>
          <td>${(j.straight || 0).toFixed(2)}</td>
          <td>${(j.box != null) ? j.box.toFixed(2) : "-"}</td>
          <td>${(j.combo != null) ? j.combo.toFixed(2) : "-"}</td>
          <td>$${(j.total || 0).toFixed(2)}</td>
        </tr>
      `;
      tBody.append(row);
    });
    $("#numeroTicket").text(data.ticketId).parent().show();
    $("#ticketTransaccion").text(data.fechaTransaccion).parent().show();
    $("#qrcode").empty().parent().parent().show();
    new QRCode(document.getElementById("qrcode"), {
      text: data.ticketId,
      width: 120,
      height: 120
    });
  }

  // ================= Generar un Número Único ================= //
  function generarTicketId() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // ================= Resetear Formulario ================= //
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

  // ================= (Opcional) Recuperar Ticket Previo ================= //
  $(window).on("load", function() {
    const savedTicketId = localStorage.getItem("ticketId");
    if (savedTicketId) {
      $.ajax({
        url: `${BACKEND_API_URL}/retrieve-ticket`,
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({ ticketId: savedTicketId }),
        headers: { "Authorization": `Bearer ${token}` },
        success: function(response) {
          if (response.ticketData) {
            showAlert("Se recuperó el ticket.", "info");
          } else {
            showAlert("Error al recuperar los datos del ticket.", "danger");
            localStorage.removeItem("ticketId");
          }
        },
        error: function(err) {
          console.error("Error al recuperar ticket:", err);
          showAlert("Error al recuperar el ticket.", "danger");
          localStorage.removeItem("ticketId");
        }
      });
    }
  });
});

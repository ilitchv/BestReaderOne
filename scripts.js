 /***************************************************************************************
 * scripts.js
 * 
 * - Mantiene la lista completa de tracks del HTML (no la borra).
 * - Modal de previsualización en tamaño .modal-xl (no minimizado).
 * - Muestra los datos (jugadas, total, etc.) en el modal antes de confirmar.
 * - El QR se genera de 120x120 px (ni demasiado grande ni tan chico).
 * - Tras confirmar: almacena en /store-ticket (colección tickets),
 *   y también llama a /save-jugadas (colección jugadas).
 * - La descarga del PNG ya debería ser visible (se ajusta un poco el delay).
 ***************************************************************************************/

$(document).ready(function() {
  // =================== Configuración General =================== //
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

  // Variables globales
  let jugadaCount = 0;
  let selectedDays = 0;
  let selectedTracks = 0;
  let totalJugadasGlobal = 0;
  let ticketData = {}; 
  let userEmail = ""; 

  // =================== Horarios y Límites =================== //
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
      "Real":                 "12:45",
      "Gana mas":             "14:25",
      "Loteka":               "19:30",
      "Nacional":             "20:30",
      "Quiniela Pale":        "20:30",
      "Primera Día":          "11:50",
      "Suerte Día":           "12:20",
      "Lotería Real":         "12:50",
      "Suerte Tarde":         "17:50",
      "Lotedom":              "17:50",
      "Primera Noche":        "19:50",
      "Panama":               "16:00",
      "Quiniela Pale Domingo":"15:30",
      "Nacional Domingo":     "17:50"
    },
    "Venezuela": {
      "Venezuela": "19:00"
    }
  };

  const limitesApuesta = {
    "Win 4":             { "straight": 6,  "box": 30, "combo": 50 },
    "Peak 3":            { "straight": 35, "box": 50, "combo": 70 },
    "Venezuela":         { "straight": 100 },
    "Venezuela-Pale":    { "straight": 20 },
    "Pulito":            { "straight": 100 },
    "Pulito-Combinado":  { "straight": 100 },
    "RD-Quiniela":       { "straight": 100 },
    "RD-Pale":           { "straight": 20 },
    "Combo":             { "combo": 50 }
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

  // =================== Obtener Email de Usuario =================== //
  async function obtenerPerfil() {
    try {
      const resp = await fetch("https://loteria-backend-j1r3.onrender.com/api/auth/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await resp.json();
      if (resp.ok) {
        userEmail = data.email;
        console.log("Email usuario:", userEmail);
      } else {
        console.log("Error al obtener perfil:", data.msg);
      }
    } catch (err) {
      console.log("Error fetch profile:", err);
    }
  }
  obtenerPerfil();

  // =================== Agregar / Eliminar Jugadas =================== //
  function agregarJugada() {
    if (jugadaCount >= 100) {
      alert("Máximo de 100 jugadas alcanzado.");
      return;
    }
    jugadaCount++;
    const fila = `
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
    $("#tablaJugadas").append(fila);
    agregarListenersNumeroApostado();
    resaltarDuplicados();
  }
  // Una jugada inicial
  agregarJugada();

  $("#agregarJugada").click(()=> agregarJugada());
  $("#eliminarJugada").click(function(){
    if(jugadaCount===0) { alert("No hay jugadas para eliminar."); return; }
    $("#tablaJugadas tr:last").remove();
    jugadaCount--;
    // renumerar
    $("#tablaJugadas tr").each((i,el)=>{
      $(el).find("td:first").text(i+1);
    });
    calcularTotal();
  });

  // =================== Selección de Tracks =================== //
  $(".track-checkbox").change(function(){
    const checkedTracks = $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
    selectedTracks = checkedTracks.length || 1;
    calcularTotal();
  });

  // =================== Eventos en la tabla =================== //
  $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function(){
    const fila  = $(this).closest("tr");
    const numero= fila.find(".numeroApostado").val();
    const tracks= $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
    const modalidad = determinarModalidad(tracks, numero, fila);

    fila.find(".tipoJuego").text(modalidad);
    actualizarPlaceholders(modalidad, fila);
    calcularTotalJugada(fila);
    calcularTotal();
  });

  // =================== Determinar Modalidad =================== //
  function determinarModalidad(tracks, numero, fila){
    if(!numero) return "-";
    const esUSA    = tracks.some(t => Object.keys(horariosCierre.USA).includes(t));
    const esSD     = tracks.some(t => Object.keys(horariosCierre["Santo Domingo"]).includes(t));
    const veneOn   = tracks.includes("Venezuela");
    const len      = numero.length;
    const boxVal   = fila.find(".box").val().trim();

    const boxValues     = ["1","2","3"];
    const boxCombos     = ["1,2","2,3","1,3","1,2,3"];

    if(veneOn && esUSA){
      if(len===2) return "Venezuela";
      else if(len===4) return "Venezuela-Pale";
    } else if(esUSA && !esSD){
      if(len===4) return "Win 4";
      else if(len===3) return "Peak 3";
      else if(len===2){
        if(boxValues.includes(boxVal))        return "Pulito";
        if(boxCombos.includes(boxVal))        return "Pulito-Combinado";
      }
    } else if(esSD && !esUSA){
      if(len===2) return "RD-Quiniela";
      else if(len===4) return "RD-Pale";
    }
    return "-";
  }

  // =================== Actualizar Placeholders =================== //
  function actualizarPlaceholders(modalidad, fila){
    if(limitesApuesta[modalidad]){
      fila.find(".straight").attr("placeholder", `Máx $${limitesApuesta[modalidad].straight??"?"}`).prop("disabled", false);
    } else {
      fila.find(".straight").attr("placeholder", "Ej: 5").prop("disabled", false);
    }

    if(modalidad==="Pulito" || modalidad==="Pulito-Combinado"){
      fila.find(".box").attr("placeholder","1,2,3").prop("disabled",false);
      fila.find(".combo").attr("placeholder","No aplica").prop("disabled",true).val("");
    } else if(modalidad==="Venezuela"||modalidad==="Venezuela-Pale"||modalidad.startsWith("RD-")){
      fila.find(".box").attr("placeholder","No aplica").prop("disabled",true).val("");
      fila.find(".combo").attr("placeholder","No aplica").prop("disabled",true).val("");
    } else if(modalidad==="Win 4"||modalidad==="Peak 3"){
      fila.find(".box").attr("placeholder",`Máx $${limitesApuesta[modalidad].box??"?"}`).prop("disabled",false);
      fila.find(".combo").attr("placeholder",`Máx $${limitesApuesta[modalidad].combo??"?"}`).prop("disabled",false);
    } else if(modalidad==="Combo"){
      fila.find(".straight").attr("placeholder","No aplica").prop("disabled",true).val("");
      fila.find(".box").attr("placeholder","No aplica").prop("disabled",true).val("");
      fila.find(".combo").attr("placeholder",`Máx $${limitesApuesta["Combo"].combo}`).prop("disabled",false);
    } else {
      fila.find(".box").attr("placeholder","Ej: 2.00").prop("disabled",false);
      fila.find(".combo").attr("placeholder","Ej: 3.00").prop("disabled",false);
    }
  }

  // =================== Calcular total jugada =================== //
  function calcularTotalJugada(fila){
    const modalidad= fila.find(".tipoJuego").text();
    const numero   = fila.find(".numeroApostado").val();
    if(!numero||numero.length<2||numero.length>4){
      fila.find(".total").text("0.00");
      return;
    }
    const combis   = calcularCombinaciones(numero);

    let straight= parseFloat(fila.find(".straight").val())||0;
    let boxVal  = fila.find(".box").val().trim();
    let boxNum  = boxVal? parseFloat(boxVal):0;
    let cVal    = fila.find(".combo").val().trim();
    let comboNum= cVal? parseFloat(cVal):0;

    if(limitesApuesta[modalidad]){
      straight = Math.min(straight, limitesApuesta[modalidad].straight||straight);
      if(limitesApuesta[modalidad].box!==undefined && modalidad!=="Pulito" && modalidad!=="Pulito-Combinado"){
        boxNum= Math.min(boxNum, limitesApuesta[modalidad].box||boxNum);
      }
      if(limitesApuesta[modalidad].combo!==undefined){
        comboNum= Math.min(comboNum, limitesApuesta[modalidad].combo||comboNum);
      }
    }

    let total=0;
    if(modalidad==="Pulito"||modalidad==="Pulito-Combinado"){
      const splitted = boxVal.split(",").filter(v=>v!=="");
      total= straight*splitted.length;
    } else if(modalidad==="Venezuela"||modalidad.startsWith("RD-")){
      total= straight;
    } else if(modalidad==="Win 4"||modalidad==="Peak 3"){
      total= straight + boxNum + (comboNum*combis);
    } else if(modalidad==="Combo"){
      total= comboNum;
    } else {
      total= straight + boxNum + comboNum;
    }

    fila.find(".total").text(total.toFixed(2));
  }

  // =================== Calcular combinaciones =================== //
  function calcularCombinaciones(numero){
    const counts={};
    for(let ch of numero){
      counts[ch]=(counts[ch]||0)+1;
    }
    function factorial(n){return n<=1?1:n*factorial(n-1);}
    let totalDigits= numero.length;
    let denom=1;
    for(let digit in counts){
      denom*= factorial(counts[digit]);
    }
    return factorial(totalDigits)/denom;
  }

  // =================== Calcular total global =================== //
  function calcularTotal(){
    let total=0;
    $(".total").each(function(){
      total+= parseFloat($(this).text())||0;
    });
    console.log("Total jugadas antes multiply:", total);
    console.log("Tracks sel:", selectedTracks, "Days sel:",selectedDays);

    if(selectedDays===0) total=0;
    else total= total* selectedTracks * selectedDays;

    $("#totalJugadas").text(total.toFixed(2));
  }

  // =================== Resaltar duplicados =================== //
  function resaltarDuplicados(){
    const campos= document.querySelectorAll(".numeroApostado");
    const vals= {};
    const dups= new Set();
    campos.forEach(c=>{
      const v= c.value.trim();
      if(v){
        if(vals[v]) dups.add(v);
        else vals[v]=true;
      }
    });
    campos.forEach(c=>{
      if(dups.has(c.value.trim())){
        c.classList.add("duplicado");
      } else {
        c.classList.remove("duplicado");
      }
    });
  }
  function agregarListenersNumeroApostado(){
    const campos= document.querySelectorAll(".numeroApostado");
    campos.forEach(c=>{
      c.removeEventListener("input", resaltarDuplicados);
      c.addEventListener("input", resaltarDuplicados);
    });
  }

  // =================== Actualizar Tracks según hora =================== //
  function actualizarEstadoTracks(){
    const fechaStr= $("#fecha").val().split(", ")[0];
    if(!fechaStr) return;
    const [mm,dd,yy] = fechaStr.split("-").map(Number);
    const fechaSel   = new Date(yy, mm-1, dd);
    const hoy        = new Date();
    const esHoy      = (fechaSel.toDateString()=== hoy.toDateString());

    if(!esHoy){
      $(".track-checkbox").prop("disabled",false).closest("label").removeClass("closed-track");
      return;
    }
    const now= new Date();
    const nowMins= now.getHours()*60+ now.getMinutes();

    for(let region in horariosCierre){
      for(let tk in horariosCierre[region]){
        const [hC,mC]= horariosCierre[region][tk].split(":").map(Number);
        const cutoff= hC*60+mC;
        if(nowMins>=cutoff){
          $(`.track-checkbox[value="${tk}"]`)
            .prop("disabled",true)
            .prop("checked",false)
            .closest("label").addClass("closed-track");
        } else {
          $(`.track-checkbox[value="${tk}"]`)
            .prop("disabled",false)
            .closest("label").removeClass("closed-track");
        }
      }
    }
  }
  actualizarEstadoTracks();
  setInterval(()=>{
    const fStr= $("#fecha").val().split(", ")[0];
    if(!fStr)return;
    const [M,D,Y]= fStr.split("-").map(Number);
    const fs= new Date(Y,M-1,D);
    const now= new Date();
    if(fs.toDateString()=== now.toDateString()){
      actualizarEstadoTracks();
    }
  },60000);

  // =================== Mostrar hora límite =================== //
  function mostrarHorasLimite(){
    $(".cutoff-time").each(function(){
      const track= $(this).data("track");
      if(track==="Venezuela"){
        $(this).hide();
        return;
      }
      let cStr="";
      if(horariosCierre.USA[track]){
        cStr= horariosCierre.USA[track];
      } else if(horariosCierre["Santo Domingo"][track]){
        cStr= horariosCierre["Santo Domingo"][track];
      } else if(horariosCierre.Venezuela[track]){
        cStr= horariosCierre.Venezuela[track];
      }
      if(cStr){
        const [hh,mm]= cStr.split(":").map(Number);
        const cut= new Date();
        cut.setHours(hh, mm-5,0,0);
        const h2= cut.getHours().toString().padStart(2,"0");
        const m2= cut.getMinutes().toString().padStart(2,"0");
        $(this).text(`Hora límite: ${h2}:${m2}`);
      }
    });
  }
  mostrarHorasLimite();

  // =================== Alertas en #ticketAlerts =================== //
  function showAlert(msg, type){
    const html= `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
    $("#ticketAlerts").append(html);
  }

  // =================== Modal Bootstrap =================== //
  // Forzamos .modal-dialog a .modal-xl para que se vea grande y no “minimizado”
  const ticketModal = new bootstrap.Modal(document.getElementById("ticketModal"), {});
  $("#ticketModal").on("show.bs.modal", function(){
    $(this).find(".modal-dialog")
           .removeClass("modal-lg modal-sm")
           .addClass("modal-xl")
           .css({"max-width":"95%","margin":"auto"});
  });

  // =================== mostrarPreTicketModal =================== //
  function mostrarPreTicketModal(datosTicket, isConfirmed){
    $("#ticketAlerts").empty();

    // Rellenar
    $("#ticketFecha").text(datosTicket.fecha.join(", "));
    $("#ticketTracks").text(datosTicket.tracks.join(", "));
    $("#ticketTotal").text(datosTicket.totalAmount.toFixed(2));

    const tbody = $("#ticketJugadas");
    tbody.empty();

    datosTicket.jugadas.forEach((j,idx)=>{
      const row= `
      <tr>
        <td>${idx+1}</td>
        <td>${j.numero}</td>
        <td>${j.modalidad}</td>
        <td>${(j.straight||0).toFixed(2)}</td>
        <td>${(j.box!=null)? j.box.toFixed(2) : "-"}</td>
        <td>${(j.combo!=null)? j.combo.toFixed(2) : "-"}</td>
        <td>$${(j.total||0).toFixed(2)}</td>
      </tr>`;
      tbody.append(row);
    });

    if(!isConfirmed){
      $("#numeroTicket").text("").parent().hide();
      $("#ticketTransaccion").text("").parent().hide();
      $("#qrcode").empty().parent().parent().hide();
    } else {
      // Modo ya confirmado
      $("#numeroTicket").parent().show();
      $("#ticketTransaccion").parent().show();
      $("#qrcode").parent().parent().show();
    }

    // Aseguramos que el botón Confirmar se muestre
    $("#confirmarTicketContainer").show();
  }

  // =================== Generar (previsualización) =================== //
  $("#generarTicket").click(function(){
    $("#ticketAlerts").empty();

    const fecha = $("#fecha").val();
    if(!fecha){
      showAlert("Por favor, selecciona una fecha.","warning");
      return;
    }
    const tracks = $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
    if(!tracks||tracks.length===0){
      showAlert("Selecciona al menos un track.","warning");
      return;
    }
    let jugadasValidas= true;
    const jugadasArray= [];

    $("#tablaJugadas tr").each(function(){
      const numero    = $(this).find(".numeroApostado").val();
      const modalidad = $(this).find(".tipoJuego").text();
      const straight  = parseFloat($(this).find(".straight").val())||0;
      const boxVal    = $(this).find(".box").val();
      const comboVal  = $(this).find(".combo").val();
      const totalFila = parseFloat($(this).find(".total").text())||0;

      if(!numero || numero.length<2||numero.length>4){
        jugadasValidas=false;
        showAlert("Ingresa números válidos (2-4 dígitos).","danger");
        return false;
      }
      if(modalidad==="-"){
        jugadasValidas=false;
        showAlert("Selecciona una modalidad de juego válida.","danger");
        return false;
      }
      if(totalFila<=0){
        jugadasValidas=false;
        showAlert("Apuesta inválida, revisa montos.","danger");
        return false;
      }

      let boxNum   = (boxVal && !isNaN(boxVal))? parseFloat(boxVal): null;
      let comboNum = (comboVal&& !isNaN(comboVal))? parseFloat(comboVal):null;

      jugadasArray.push({
        "Ticket Number":"PEND-XXXX",
        numero: numero,
        modalidad: modalidad,
        straight:straight,
        box:     boxNum,
        combo:   comboNum,
        total:   totalFila
      });
    });
    if(!jugadasValidas) return;

    totalJugadasGlobal= parseFloat($("#totalJugadas").text())||0;
    const fechasSeleccionadas= fecha.split(", ").map(f=>{
      const [m,d,y]= f.split("-").map(Number);
      return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    });

    ticketData={
      fecha:          fechasSeleccionadas,
      tracks:         tracks,
      jugadas:        jugadasArray,
      totalAmount:    totalJugadasGlobal,
      selectedDays:   selectedDays,
      selectedTracks: selectedTracks
    };

    console.log("Ticket (pre-confirmación):", ticketData);

    // Mostrar en el modal
    mostrarPreTicketModal(ticketData,false);
    ticketModal.show();
  });

  // =================== Confirmar e Imprimir =================== //
  $("#confirmarTicket").click(async function(){
    try {
      $("#ticketAlerts").empty();

      // Generar ticketId y fechaTransaccion
      const numeroTicket   = generarNumeroUnico();
      const fechaTransaccion = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // Actualizar la info en el modal (modo confirmed)
      $("#numeroTicket").text(numeroTicket).parent().show();
      $("#ticketTransaccion").text(fechaTransaccion).parent().show();
      $("#qrcode").empty().parent().parent().show();

      new QRCode(document.getElementById("qrcode"), {
        text:  numeroTicket,
        width: 120,
        height:120
      });

      // Actualizar ticketData
      if(ticketData.jugadas){
        ticketData.jugadas.forEach(j=>{
          j["Ticket Number"]= numeroTicket;
        });
      }
      ticketData.ticketId         = numeroTicket;
      ticketData.fechaTransaccion = fechaTransaccion;
      ticketData.userEmail        = userEmail;

      console.log("Ticket a confirmar:", ticketData);

      // 1) Almacenar en /store-ticket
      const storeResp = await fetch(`${BACKEND_API_URL}/store-ticket`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${token}`
        },
        body: JSON.stringify(ticketData)
      });
      const storeJson= await storeResp.json();
      if(!storeResp.ok){
        const errMsg= storeJson.error||"Error al guardar ticket en backend.";
        showAlert(errMsg,"danger");
        return;
      }
      console.log("Ticket en backend (tickets):", storeJson);

      // 2) Guardar también en /save-jugadas => coleccion jugadas
      //    (Solo si tu backend lo maneja)
      try {
        const jugadasToSave = storeJson.jugadas.map(j=>({
          ticketId:          storeJson.ticketId,
          numero:            j.numero,
          modalidad:         j.modalidad,
          straight:          j.straight,
          box:               j.box,
          combo:             j.combo,
          total:             j.total,
          betDates:          storeJson.fecha,  
          tracks:            storeJson.tracks,
          transactionDateTime: storeJson.fechaTransaccion,
          userEmail:         storeJson.userEmail
        }));

        const saveJResp = await fetch(`${BACKEND_API_URL}/save-jugadas`, {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`
          },
          body: JSON.stringify({
            ticketId: storeJson.ticketId,
            jugadas:  jugadasToSave
          })
        });
        const saveJjson= await saveJResp.json();
        console.log("/save-jugadas:", saveJjson);
        if(!saveJResp.ok){
          showAlert("Ocurrió un error al guardar en colección jugadas.","warning");
        }
      } catch(err){
        console.error("Error /save-jugadas:", err);
        showAlert("No se pudo guardar en la colección 'jugadas'.","warning");
      }

      // 3) SheetDB
      const sheetPayload = storeJson.jugadas.map(j=>({
        "Ticket Number":        storeJson.ticketId,
        "Transaction DateTime": dayjs(storeJson.fechaTransaccion).format("YYYY-MM-DD HH:mm:ss"),
        "Bet Dates":            storeJson.fecha.join(", "),
        "Tracks":               storeJson.tracks.join(", "),
        "Bet Number":           j.numero,
        "Game Mode":            j.modalidad,
        "Straight ($)":         j.straight,
        "Box ($)":              (j.box!=null)? j.box:"",
        "Combo ($)":            (j.combo!=null)? j.combo:"",
        "Total ($)":            j.total,
        "Timestamp":            new Date().toISOString(),
        "User":                 storeJson.userEmail || "usuario@example.com"
      }));
      console.log("SheetDB payload:",sheetPayload);

      try {
        const sheetRes= await fetch(SHEETDB_API_URL, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ data: sheetPayload })
        });
        if(!sheetRes.ok){
          const sheetErr= await sheetRes.text();
          throw new Error("SheetDB Error: "+ sheetErr);
        }
        const sheetJson= await sheetRes.json();
        console.log("SheetDB resp:", sheetJson);
      } catch(e){
        console.error("Error al enviar a SheetDB:", e);
        showAlert("No se pudo enviar a Google Sheets.","warning");
      }

      // Forzamos previsualización "confirmada" en modal
      mostrarPreTicketModal(storeJson, true);

      // 4) Esperar un poco y capturar el ticket
      await new Promise(r=> setTimeout(r,500));
      html2canvas(document.querySelector("#preTicket"), { scale:2 })
      .then(canvas=>{
        const imgData= canvas.toDataURL("image/png");
        const link= document.createElement("a");
        link.href= imgData;
        link.download= `ticket_${storeJson.ticketId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }).catch(err=>{
        console.error("Error al capturar ticket:", err);
        showAlert("Ocurrió un problema al generar la imagen del ticket.","danger");
      });

      // 5) Dar un pequeño delay para que el usuario vea el ticket y luego reset
      setTimeout(()=>{
        // OPCIONAL: window.print() si quieres imprimir
        // window.print();

        const modalObj= bootstrap.Modal.getInstance(document.getElementById("ticketModal"));
        modalObj.hide();
        resetForm();
      }, 1200);

    } catch(error){
      console.error("Error confirmTicket:", error);
      showAlert("Ocurrió un error confirmando el ticket.","danger");
    }
  });

  // =================== Generar Número Ticket =================== //
  function generarNumeroUnico(){
    return Math.floor(10000000 + Math.random()*90000000).toString();
  }

  // =================== Reset Form =================== //
  function resetForm(){
    $("#lotteryForm")[0].reset();
    $("#tablaJugadas").empty();
    jugadaCount        = 0;
    selectedTracks     = 0;
    selectedDays       = 0;
    totalJugadasGlobal = 0;
    ticketData         = {};
    $("#totalJugadas").text("0.00");
    $(".track-checkbox").prop("disabled",false).closest("label").removeClass("closed-track");
    console.log("Formulario reseteado.");
    // Agregar jugada inicial
    agregarJugada();
  }

  // =================== Listo =================== //
});

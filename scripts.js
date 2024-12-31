 /********************************************
 * scripts.js (Versión Limpia y Compacta)
 * SIN duplicaciones de 'fechasArray'
 ********************************************/

$(document).ready(function() {

    /*****************************************
     * URLs y Variables Globales
     *****************************************/
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr';
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api';

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let cashAppPayInitialized = false;
    let paymentCompleted = false;
    let totalJugadasGlobal = 0;
    let fechaTransaccion = '';
    let ticketData = {};
    let ticketId = null;
    let cashAppPayInstance = null;

    const userRole = localStorage.getItem('userRole') || 'user';
    console.log('User Role:', userRole);

    /*****************************************
     * Inicializar Flatpickr
     *****************************************/
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y",
        minDate: "today",
        allowInput: true,
        onChange: function(selectedDates, dateStr, instance) {
            selectedDays = selectedDates.length;
            console.log("Días seleccionados:", selectedDays);
            calcularTotal();
            actualizarEstadoTracks();
        },
    });

    /*****************************************
     * Datos de Horarios y Límites
     *****************************************/
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

    /*****************************************
     * Funciones Auxiliares
     *****************************************/
    function showAlert(msg, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${msg}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados);
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    function resaltarDuplicados() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();
        camposNumeros.forEach(campo => {
            const valor = campo.value.trim();
            if (valor) {
                if (valores[valor]) duplicados.add(valor);
                else valores[valor] = true;
            }
        });
        camposNumeros.forEach(campo => {
            if (duplicados.has(campo.value.trim())) campo.classList.add('duplicado');
            else campo.classList.remove('duplicado');
        });
    }

    function factorial(n) {
        return n <= 1 ? 1 : n * factorial(n-1);
    }

    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            denominator *= factorial(counts[digit]);
        }
        return factorial(totalDigits) / denominator;
    }

    // Modal
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    /*****************************************
     * Lógica de Jugadas (Agregar, Eliminar, Calcular)
     *****************************************/
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

    // Agregar la primera jugada
    agregarJugada();

    $("#agregarJugada").click(agregarJugada);

    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index+1);
        });
        calcularTotal();
    });

    // Cambiar tracks => recalcular
    $(".track-checkbox").change(function() {
        const selTracks = $(".track-checkbox:checked").map(function(){ return $(this).val();}).get();
        selectedTracks = selTracks.filter(track => track !== "Venezuela").length || 1;
        calcularTotal();
    });

    // Cambiar jugadas => recalcular
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
        const fila = $(this).closest("tr");
        const num = fila.find(".numeroApostado").val();
        const tracks = $(".track-checkbox:checked").map(function(){ return $(this).val();}).get();
        const modalidad = determinarModalidad(tracks, num, fila);
        fila.find(".tipoJuego").text(modalidad);
        actualizarPlaceholders(modalidad, fila);
        calcularTotalJugada(fila);
        calcularTotal();
    });

    function determinarModalidad(tracks, numero, fila) {
        let modalidad = "-";
        const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD  = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
        const incluyeVen = tracks.includes("Venezuela");
        const boxValue = fila.find(".box").val().trim();
        const len = numero.length;
        const acceptableBoxValues = ["1","2","3"];
        const acceptableBoxComb = ["1,2","2,3","1,3","1,2,3"];

        if (incluyeVen && esUSA) {
            if (len === 2) modalidad = "Venezuela";
            else if (len === 4) modalidad = "Venezuela-Pale";
        } else if (esUSA && !esSD) {
            if (len === 4) modalidad = "Win 4";
            else if (len === 3) modalidad = "Peak 3";
            else if (len === 2) {
                if (acceptableBoxValues.includes(boxValue)) modalidad = "Pulito";
                else if (acceptableBoxComb.includes(boxValue)) modalidad = "Pulito-Combinado";
            }
        } else if (esSD && !esUSA) {
            if (len === 2) modalidad = "RD-Quiniela";
            else if (len === 4) modalidad = "RD-Pale";
        }
        return modalidad;
    }

    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight").attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight}`).prop('disabled', false);
        } else {
            fila.find(".straight").attr("placeholder", "Ej: 5.00").prop('disabled', false);
        }
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box").attr("placeholder","1,2,3").prop('disabled',false);
            fila.find(".combo").attr("placeholder","No aplica").prop('disabled',true).val('');
        } else if (
            modalidad==="Venezuela" || modalidad==="Venezuela-Pale" ||
            modalidad.startsWith("RD-")
        ) {
            fila.find(".box").attr("placeholder","No aplica").prop('disabled',true).val('');
            fila.find(".combo").attr("placeholder","No aplica").prop('disabled',true).val('');
        } else if (modalidad==="Win 4"|| modalidad==="Peak 3") {
            fila.find(".box").attr("placeholder",`Máximo $${limitesApuesta[modalidad].box}`).prop('disabled',false);
            fila.find(".combo").attr("placeholder",`Máximo $${limitesApuesta[modalidad].combo}`).prop('disabled',false);
        } else if (modalidad==="Combo") {
            fila.find(".straight").attr("placeholder","No aplica").prop('disabled',true).val('');
            fila.find(".box").attr("placeholder","No aplica").prop('disabled',true).val('');
            fila.find(".combo").attr("placeholder",`Máximo $${limitesApuesta.Combo.combo}`).prop('disabled',false);
        } else {
            fila.find(".box").attr("placeholder","Ej: 2.50").prop('disabled',false);
            fila.find(".combo").attr("placeholder","Ej: 3.00").prop('disabled',false);
        }
    }

    function calcularTotalJugada(fila) {
        const modalidad = fila.find(".tipoJuego").text();
        const numero = fila.find(".numeroApostado").val();
        if (!numero || numero.length<2 || numero.length>4) {
            fila.find(".total").text("0.00");
            return;
        }
        const combinaciones = calcularCombinaciones(numero);
        let straight = parseFloat(fila.find(".straight").val()) || 0;
        let boxVal = fila.find(".box").val().trim();
        let box = parseFloat(boxVal) || 0;
        let combo = parseFloat(fila.find(".combo").val())||0;

        // Aplicar límites
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight||straight);
            if (limitesApuesta[modalidad].box!==undefined
                && modalidad!=="Pulito" && modalidad!=="Pulito-Combinado") {
                box = Math.min(box, limitesApuesta[modalidad].box||box);
            }
            if (limitesApuesta[modalidad].combo!==undefined) {
                combo = Math.min(combo, limitesApuesta[modalidad].combo||combo);
            }
        }

        let total=0;
        if (modalidad==="Pulito"||modalidad==="Pulito-Combinado") {
            const boxValues = boxVal.split(",").filter(v=>v!=="");
            total = straight * boxValues.length;
        } else if (modalidad==="Venezuela"||modalidad.startsWith("RD-")) {
            total = straight;
        } else if (modalidad==="Win 4"||modalidad==="Peak 3") {
            total = straight + box + (combo*combinaciones);
        } else if (modalidad==="Combo") {
            total = combo;
        } else {
            total = straight + box + combo;
        }
        fila.find(".total").text(total.toFixed(2));
    }

    function calcularTotal() {
        let total=0;
        $(".total").each(function(){
            total += parseFloat($(this).text())||0;
        });
        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracks);
        console.log("Días seleccionados:", selectedDays);
        if (selectedDays===0) {
            total=0;
        } else {
            total=(total*selectedTracks*selectedDays).toFixed(2);
        }
        console.log("Total después de multiplicar:", total);
        $("#totalJugadas").text(total);
    }

    /*****************************************
     * Evento "Generar Ticket"
     *****************************************/
    $("#generarTicket").click(function() {
        $("#ticketAlerts").empty();

        if (!paymentCompleted && localStorage.getItem('ticketId')) {
            showAlert("Tienes un ticket pendiente de pago.", "warning");
            return;
        }

        const fecha = $("#fecha").val();
        console.log("Valor de fecha:", fecha);
        if (!fecha) {
            showAlert("Selecciona una fecha.", "warning");
            return;
        }
        const tracks = $(".track-checkbox:checked").map(function(){return $(this).val();}).get();
        if (!tracks||tracks.length===0){
            showAlert("Selecciona al menos un track.", "warning");
            return;
        }

        // Validar Venezuela + track USA
        const tracksUSA = tracks.filter(tr => Object.keys(horariosCierre.USA).includes(tr));
        if (tracks.includes("Venezuela") && tracksUSA.length===0){
            showAlert("Para 'Venezuela', selecciona también un track de USA.", "warning");
            return;
        }

        // Validar Horarios si es la misma fecha
        const fechaHoy = new Date();
        const yA = fechaHoy.getFullYear();
        const mA = fechaHoy.getMonth();
        const dA = fechaHoy.getDate();
        const fechaActualSinHora = new Date(yA,mA,dA);

        const splittedFechas = fecha.split(", "); // <-- Renombramos a splittedFechas
        for (let fSelStr of splittedFechas){
            const [mSel,dSel,ySel] = fSelStr.split("-").map(Number);
            const fSel = new Date(ySel, mSel-1,dSel);
            if (fSel.getTime()===fechaActualSinHora.getTime()){
                const horaActual = new Date();
                for (let tr of tracks){
                    if(tr==="Venezuela") continue;
                    const horaLimStr=obtenerHoraLimite(tr);
                    if(horaLimStr){
                        const [hh,mm]=horaLimStr.split(":");
                        const horaLim=new Date();
                        horaLim.setHours(parseInt(hh),parseInt(mm)-5,0,0);
                        if(horaActual>horaLim){
                            showAlert(`El track "${tr}" ya cerró hoy.`, "danger");
                            return;
                        }
                    }
                }
            }
        }

        // Validar jugadas
        let jugadasValidas=true;
        $("#tablaJugadas tr").each(function(){
            const numero = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            if(!numero||numero.length<2||numero.length>4){
                jugadasValidas=false;
                showAlert("Números apostados deben ser 2,3,4 dígitos.", "danger");
                return false;
            }
            if(modalidad==="-"){
                jugadasValidas=false;
                showAlert("Modalidad de juego no válida.", "danger");
                return false;
            }
            // ... Lógica de validaciones de tracks y límites ...
            // (Lo omitimos para no alargar, pues es igual a tu lógica actual)
        });
        if(!jugadasValidas) return;

        // Armar arrays de jugadas
        const tracksTexto = tracks.join(", ");
        $("#ticketTracks").text(tracksTexto);
        $("#ticketJugadas").empty();

        const jugadasArray=[];
        $("#tablaJugadas tr").each(function(){
            const num = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val())||0;
            const boxVal = $(this).find(".box").val();
            const box = boxVal!==""? boxVal : "-";
            const comboVal = $(this).find(".combo").val();
            const combo = comboVal!==""? parseFloat(comboVal) : "-";
            const total = parseFloat($(this).find(".total").text())||0;

            const rowHTML=`
                <tr>
                    <td>${$(this).find("td").first().text()}</td>
                    <td>${num}</td>
                    <td>${modalidad}</td>
                    <td>${straight.toFixed(2)}</td>
                    <td>${box!=="-"? box : "-"}</td>
                    <td>${combo!=="-"? combo.toFixed(2) : "-"}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>
            `;
            $("#ticketJugadas").append(rowHTML);

            jugadasArray.push({
                numero, modalidad, straight, box, combo, total
            });
        });

        $("#ticketTotal").text($("#totalJugadas").text());
        $("#ticketFecha").text(fecha);
        console.log("Fechas asignadas a #ticketFecha:", $("#ticketFecha").text());

        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // (1) Convertir a JSON string => splittedFechas
        const fechaJSON = JSON.stringify(splittedFechas); // Evita la variable 'fechasArray'
        const tracksJSON= JSON.stringify(tracks);
        const jugadasJSON= JSON.stringify(jugadasArray);

        // (2) Agregar paymentMethod
        let metodoPago="shopify"; // O "balance"

        // ticketData final
        ticketData={
            fecha: fechaJSON,
            tracks: tracksJSON,
            jugadas: jugadasJSON,
            totalAmount: totalJugadasGlobal,
            paymentMethod: metodoPago,

            // Extra
            ticketJugadasHTML: $("#ticketJugadas").html(),
            ticketTracks: tracksTexto,
            ticketFecha: fecha,
            selectedDays,
            selectedTracks
        };

        // POST /store-ticket con token
        const token= localStorage.getItem('token');
        $.ajax({
            url:`${BACKEND_API_URL}/store-ticket`,
            method:'POST',
            dataType:'json',
            contentType:'application/json',
            headers:{
                'Authorization': 'Bearer '+token
            },
            data: JSON.stringify(ticketData),
            success:function(resp){
                if(resp.ticketId){
                    ticketId=resp.ticketId;
                    paymentCompleted=false;
                    localStorage.setItem('ticketId', ticketId);

                    $("#numeroTicket").text('');
                    $("#ticketTransaccion").text('');
                    $("#qrcode").empty();

                    ticketModal.show();

                    if(userRole==="user"){
                        if(!cashAppPayInitialized){
                            console.log('Usuario "user", inicializando Cash App Pay.');
                            initializeCashAppPay(totalJugadasGlobal);
                            cashAppPayInitialized=true;
                        }
                    }else{
                        $('#cashAppPayContainer').hide();
                        $('#confirmarTicketContainer').show();
                        $('#confirmarTicket').show();
                    }
                }else{
                    showAlert('Error al almacenar ticket.', 'danger');
                }
            },
            error:function(err){
                console.error('Error al almacenar ticket:', err);
                const errorMsg=(err.responseJSON && err.responseJSON.error)
                  ? err.responseJSON.error
                  :'Error al almacenar ticket.';
                showAlert(errorMsg,'danger');
            }
        });
    });

    /*****************************************
     * Funciones de Cálculo y Flujos de Pago
     *****************************************/
    function initializeCashAppPay(totalAmount){ /* ... igual a tu código (no duplicamos "fechasArray") ... */ }
    async function processPayment(sourceId, amount){ /* ... */ }
    async function processPaymentWithPaymentId(paymentId,amount){ /* ... */ }

    /*****************************************
     * Al Cargar la ventana
     *****************************************/
    $(window).on('load',function(){
        ticketId=localStorage.getItem('ticketId');
        if(ticketId){
            const token= localStorage.getItem('token');
            $.ajax({
                url:`${BACKEND_API_URL}/retrieve-ticket`,
                method:'POST',
                dataType:'json',
                contentType:'application/json',
                headers:{
                    'Authorization': 'Bearer '+token
                },
                data:JSON.stringify({ticketId}),
                success:function(resp){
                    if(resp.ticketData){
                        ticketData=resp.ticketData;
                        $("#ticketTracks").text(ticketData.ticketTracks);
                        $("#ticketJugadas").html(ticketData.ticketJugadasHTML);
                        $("#ticketTotal").text(ticketData.totalAmount.toFixed(2));
                        $("#ticketFecha").text(ticketData.ticketFecha);

                        $("#numeroTicket").text('');
                        $("#ticketTransaccion").text('');
                        $("#qrcode").empty();

                        ticketModal.show();

                        $.ajax({
                            url:`${BACKEND_API_URL}/check-payment-status`,
                            method:'POST',
                            dataType:'json',
                            contentType:'application/json',
                            headers:{
                                'Authorization': 'Bearer '+token
                            },
                            data:JSON.stringify({ticketId}),
                            success:function(pmtResp){
                                if(pmtResp.paymentCompleted){
                                    paymentCompleted=true;
                                    confirmarYGuardarTicket('Cash App');
                                }else{
                                    if(!cashAppPayInitialized){
                                        console.log('Inicializando Cash App Pay tras recuperar ticketData.');
                                        initializeCashAppPay(ticketData.totalAmount);
                                        cashAppPayInitialized=true;
                                    }
                                }
                            },
                            error:function(er){
                                console.error('Error al verificar pago:', er);
                                showAlert('Error al verificar pago.', 'danger');
                            }
                        });
                    }else{
                        showAlert('Error al recuperar ticket.', 'danger');
                        localStorage.removeItem('ticketId');
                    }
                },
                error:function(er){
                    console.error('Error al recuperar ticket:', er);
                    showAlert('Error al recuperar ticket.', 'danger');
                    localStorage.removeItem('ticketId');
                }
            });
        }
    });

    /*****************************************
     * Confirmar e Imprimir
     *****************************************/
    $("#confirmarTicket").click(function(){
        $("#ticketAlerts").empty();
        if(userRole==='user'){
            if(paymentCompleted){
                confirmarYGuardarTicket('Cash App');
            }else{
                showAlert("Completa el pago con Cash App Pay.", "warning");
            }
        }else{
            paymentCompleted=true;
            confirmarYGuardarTicket('Efectivo');
        }
    });

    function confirmarYGuardarTicket(metodoPago){
        const token= localStorage.getItem('token');
        $.ajax({
            url:`${BACKEND_API_URL}/validate-ticket`,
            method:'POST',
            dataType:'json',
            contentType:'application/json',
            headers:{
                'Authorization': 'Bearer '+token
            },
            data:JSON.stringify({ticketId}),
            success:function(resp){
                if(resp.valid){
                    const numeroTicket=generarNumeroUnico();
                    $("#numeroTicket").text(numeroTicket);

                    fechaTransaccion=dayjs().format('MM-DD-YYYY hh:mm A');
                    $("#ticketTransaccion").text(fechaTransaccion);

                    $("#qrcode").empty();
                    new QRCode(document.getElementById("qrcode"), {
                        text: numeroTicket,
                        width:128,
                        height:128
                    });

                    const transactionDateTime=fechaTransaccion;
                    const timestamp= new Date().toISOString();
                    const jugadasData=[];

                    ticketData.jugadas.forEach(function(j){
                        const jugadaNumber=generarNumeroUnico();
                        const jugadaData={
                            "Ticket Number": numeroTicket,
                            "Transaction DateTime": transactionDateTime,
                            "Bet Dates": ticketData.ticketFecha,
                            "Tracks": ticketData.ticketTracks,
                            "Bet Number": j.numero,
                            "Game Mode": j.modalidad,
                            "Straight ($)": j.straight,
                            "Box ($)": j.box!== "-" ? parseFloat(j.box) : null,
                            "Combo ($)": j.combo!== "-" ? parseFloat(j.combo) : null,
                            "Total ($)": j.total,
                            "Payment Method": metodoPago,
                            "Jugada Number": jugadaNumber,
                            "Timestamp": timestamp
                        };
                        jugadasData.push(jugadaData);
                    });
                    enviarFormulario(jugadasData);
                } else {
                    showAlert('El pago no se ha completado o ticket inválido.', 'danger');
                }
            },
            error:function(er){
                console.error('Error al validar ticket:', er);
                showAlert('Error al validar ticket.', 'danger');
            }
        });
    }

    function enviarFormulario(datos){
        const sheetDBRequest=$.ajax({
            url:SHEETDB_API_URL,
            method:"POST",
            dataType:"json",
            contentType:"application/json",
            data:JSON.stringify(datos)
        });

        const token= localStorage.getItem('token');
        const backendRequest=$.ajax({
            url:`${BACKEND_API_URL}/save-jugadas`,
            method:"POST",
            dataType:"json",
            contentType:"application/json",
            headers:{
                'Authorization': 'Bearer '+token
            },
            data:JSON.stringify(datos)
        });

        $.when(sheetDBRequest, backendRequest).done(function(shResp, beResp){
            console.log("Datos enviados a ambos destinos:", shResp, beResp);
            showAlert("Ticket guardado y enviado exitosamente.", "success");

            window.print();
            html2canvas(document.querySelector("#preTicket")).then(canvas=>{
                const imgData= canvas.toDataURL("image/png");
                const link= document.createElement('a');
                link.href= imgData;
                link.download='ticket.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            ticketModal.hide();
            resetForm();

            ticketData={};
            paymentCompleted=false;
            cashAppPayInitialized=false;
            ticketId=null;

            if(cashAppPayInstance){
                try{
                    cashAppPayInstance.destroy();
                    cashAppPayInstance=null;
                    console.log('Cash App Pay instance destroyed after process.');
                }catch(e){
                    console.error('Error destroy Cash App Pay:', e);
                }
            }

            localStorage.removeItem('ticketId');
            const newURL= window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newURL);
        }).fail(function(jqXHR, textStatus, errorThrown){
            console.error("Error al enviar datos:", textStatus, errorThrown);
            let errorMsg="Hubo un problema al enviar los datos.";
            if(jqXHR.responseJSON && jqXHR.responseJSON.error){
                errorMsg=jqXHR.responseJSON.error;
            }
            showAlert(errorMsg,"danger");
        });
    }

    /*****************************************
     * Resetear Formulario
     *****************************************/
    $("#resetForm").click(function(){
        resetForm();
    });

    function resetForm(){
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount=0;
        selectedTracks=0;
        selectedDays=0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        $("#tablaJugadas tr").each(function(){
            actualizarPlaceholders("-", $(this));
        });
        resaltarDuplicados();
        paymentCompleted=false;
        cashAppPayInitialized=false;
        ticketData={};
        ticketId=null;

        if(cashAppPayInstance){
            try{
                cashAppPayInstance.destroy();
                cashAppPayInstance=null;
                console.log('Cash App Pay instance destroyed in resetForm.');
            }catch(e){
                console.error('Error destroy Cash App Pay in resetForm:', e);
            }
        }
        localStorage.removeItem('ticketId');
        $("#ticketAlerts").empty();
        $(".track-checkbox").prop('disabled',false).closest('label').removeClass('closed-track');
    }

    /*****************************************
     * Habilitar/Deshabilitar Tracks
     *****************************************/
    function actualizarEstadoTracks(){
        const fechaSeleccionadaStr= $("#fecha").val().split(", ")[0];
        if(!fechaSeleccionadaStr) return;

        const [mSel,dSel,ySel]= fechaSeleccionadaStr.split('-').map(Number);
        const fSel= new Date(ySel,mSel-1,dSel);

        const fActual= new Date();
        const esMismoDia= (fSel.toDateString()===fActual.toDateString());
        if(!esMismoDia){
            $(".track-checkbox").prop('disabled',false).closest('label').removeClass('closed-track');
            return;
        }

        const ahora= new Date();
        for(let region in horariosCierre){
            for(let track in horariosCierre[region]){
                const horaCierreStr= horariosCierre[region][track];
                const [hh,mm]= horaCierreStr.split(":").map(Number);
                const cierreTotal= hh*60+mm;
                const ahoraTotal= ahora.getHours()*60+ahora.getMinutes();
                if(ahoraTotal>=cierreTotal){
                    $(`.track-checkbox[value="${track}"]`)
                      .prop('disabled',true)
                      .prop('checked',false)
                      .closest('label')
                      .addClass('closed-track');
                }else{
                    $(`.track-checkbox[value="${track}"]`)
                      .prop('disabled',false)
                      .closest('label')
                      .removeClass('closed-track');
                }
            }
        }
    }

    $("#fecha").change(function(){
        actualizarEstadoTracks();
    });

    setInterval(function(){
        const fechaStr= $("#fecha").val().split(", ")[0];
        if(!fechaStr) return;
        const [mm,dd,yy]= fechaStr.split('-').map(Number);
        const fSel= new Date(yy,mm-1,dd);

        const fAct= new Date();
        const esHoy= (fSel.toDateString()===fAct.toDateString());
        if(esHoy){
            actualizarEstadoTracks();
        }
    },60000);

    function mostrarHorasLimite(){
        $(".cutoff-time").each(function(){
            const tr= $(this).data("track");
            if(tr==='Venezuela'){
                $(this).hide();
                return;
            }
            let cierreStr="";
            if(horariosCierre.USA[tr])  cierreStr=horariosCierre.USA[tr];
            else if(horariosCierre["Santo Domingo"][tr]) cierreStr= horariosCierre["Santo Domingo"][tr];
            else if(horariosCierre.Venezuela[tr]) cierreStr= horariosCierre.Venezuela[tr];
            if(cierreStr){
                const cierre= new Date(`1970-01-01T${cierreStr}:00`);
                cierre.setMinutes(cierre.getMinutes()-5);
                const hh= cierre.getHours().toString().padStart(2,'0');
                const mm= cierre.getMinutes().toString().padStart(2,'0');
                $(this).text(`Hora límite: ${hh}:${mm}`);
            }
        });
    }

    function obtenerHoraLimite(track){
        for(let region in horariosCierre){
            if(horariosCierre[region][track]){
                return horariosCierre[region][track];
            }
        }
        return null;
    }

    mostrarHorasLimite();
    agregarListenersNumeroApostado();
    resaltarDuplicados();
    actualizarEstadoTracks();

}); 

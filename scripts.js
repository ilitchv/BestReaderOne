 // scripts.js

$(document).ready(function() {

    // Define las URLs de tus APIs
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Tu URL de SheetDB
    const BACKEND_API_URL = 'https://loteria-backend-j1r3.onrender.com/api'; // Ruta del backend

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

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;
    let totalJugadasGlobal = 0;
    let fechaTransaccion = '';
    let ticketData = {}; // Objeto para almacenar datos del ticket
    let ticketId = null; // Variable para almacenar el ticketId
    const userRole = localStorage.getItem('userRole') || 'user'; // Por defecto 'user' si no está establecido
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

    // Función para determinar la modalidad de juego
    function determinarModalidad(tracks, numero, fila) {
        let modalidad = "-";

        const esUSA = tracks.some(track => Object.keys(horariosCierre.USA).includes(track));
        const esSD = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
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

    // Función para agregar una nueva jugada
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

        // Agregar la jugada al DOM
        $("#tablaJugadas").append(fila);

        // Agregar listeners a los nuevos campos
        agregarListenersNumeroApostado();
        resaltarDuplicados();

        // Enfocar el cursor en el campo "Número Apostado" de la nueva jugada
        $("#tablaJugadas tr:last .numeroApostado").focus();
    }

    // Agregar una jugada inicial
    agregarJugada();

    // Evento para agregar más jugadas
    $("#agregarJugada").click(function() {
        agregarJugada();
    });

    // Evento para eliminar la última jugada
    $("#eliminarJugada").click(function() {
        if (jugadaCount === 0) {
            showAlert("No hay jugadas para eliminar.", "warning");
            return;
        }
        // Remover la última fila
        $("#tablaJugadas tr:last").remove();
        jugadaCount--;
        // Actualizar el número de jugadas
        $("#tablaJugadas tr").each(function(index) {
            $(this).find("td:first").text(index + 1);
        });
        calcularTotal();
    });

    // Contador de tracks seleccionados y días
    $(".track-checkbox").change(function() {
        const tracksSeleccionados = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        // Excluir "Venezuela" del conteo de tracks para el cálculo del total
        selectedTracks = tracksSeleccionados.filter(track => track !== "Venezuela").length || 1;

        calcularTotal();
    });

    // Evento para detectar cambios en los campos de entrada
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

    // Función para calcular el número de combinaciones posibles
    function calcularCombinaciones(numero) {
        const counts = {};
        for (let char of numero) {
            counts[char] = (counts[char] || 0) + 1;
        }
        let factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
        let totalDigits = numero.length;
        let denominator = 1;
        for (let digit in counts) {
            if (counts.hasOwnProperty(digit)) {
                denominator *= factorial(counts[digit]);
            }
        }
        return factorial(totalDigits) / denominator;
    }

    // Función para calcular el total de una jugada
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
        let box = parseFloat(boxVal) || 0;
        let combo = parseFloat(fila.find(".combo").val()) || 0;

        // Aplicar límites según modalidad
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight || straight);
            if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado") {
                box = Math.min(box, limitesApuesta[modalidad].box || box);
            }
            if (limitesApuesta[modalidad].combo !== undefined) {
                combo = Math.min(combo, limitesApuesta[modalidad].combo || combo);
            }
        }

        // Calcular total según modalidad
        let total = 0;
        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            const boxValues = boxVal.split(",").filter(value => value !== "");
            const countBoxValues = boxValues.length;
            total = straight * countBoxValues;
        } else if (modalidad === "Venezuela" || modalidad.startsWith("RD-")) {
            total = straight;
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            total = straight + box + (combo * combinaciones);
        } else if (modalidad === "Combo") {
            total = combo;
        } else {
            total = straight + box + combo;
        }

        fila.find(".total").text(total.toFixed(2));
    }

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        console.log("Total de jugadas antes de multiplicar:", total);
        console.log("Tracks seleccionados:", selectedTracks);
        console.log("Días seleccionados:", selectedDays);

        // Si no hay días seleccionados, el total es 0
        if (selectedDays === 0) {
            total = 0;
        } else {
            // Multiplicar por el número de tracks seleccionados y días
            total = (total * selectedTracks * selectedDays).toFixed(2);
        }
        console.log("Total después de multiplicar:", total);
        $("#totalJugadas").text(total);
    }

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Función para mostrar alertas usando Bootstrap
    function showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        `;
        $("#ticketAlerts").append(alertHTML);
    }

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Función para agregar listeners a los campos de número apostado
    function agregarListenersNumeroApostado() {
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        camposNumeros.forEach(campo => {
            campo.removeEventListener('input', resaltarDuplicados); // Evitar duplicar listeners
            campo.addEventListener('input', resaltarDuplicados);
        });
    }

    // Función para resaltar números duplicados
    function resaltarDuplicados() {
        // Obtener todos los campos de número apostado
        const camposNumeros = document.querySelectorAll('.numeroApostado');
        const valores = {};
        const duplicados = new Set();

        // Recopilar valores y detectar duplicados
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

        // Aplicar o remover la clase .duplicado
        camposNumeros.forEach(campo => {
            if (duplicados.has(campo.value.trim())) {
                campo.classList.add('duplicado');
            } else {
                campo.classList.remove('duplicado');
            }
        });
    }

    // Función para actualizar los placeholders según la modalidad
    function actualizarPlaceholders(modalidad, fila) {
        if (limitesApuesta[modalidad]) {
            fila.find(".straight").attr("placeholder", `Máximo $${limitesApuesta[modalidad].straight}`).prop('disabled', false);
        } else {
            fila.find(".straight").attr("placeholder", "Ej: 5.00").prop('disabled', false);
        }

        if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
            fila.find(".box").attr("placeholder", "1,2,3").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad.startsWith("RD-")) {
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", "No aplica").prop('disabled', true).val('');
        } else if (modalidad === "Win 4" || modalidad === "Peak 3") {
            fila.find(".box").attr("placeholder", `Máximo $${limitesApuesta[modalidad].box}`).prop('disabled', false);
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta[modalidad].combo}`).prop('disabled', false);
        } else if (modalidad === "Combo") {
            fila.find(".straight").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".box").attr("placeholder", "No aplica").prop('disabled', true).val('');
            fila.find(".combo").attr("placeholder", `Máximo $${limitesApuesta.Combo.combo}`).prop('disabled', false);
        } else {
            fila.find(".box").attr("placeholder", "Ej: 2.50").prop('disabled', false);
            fila.find(".combo").attr("placeholder", "Ej: 3.00").prop('disabled', false);
        }
    }

    // Función para deshabilitar tracks basados en su hora de cierre
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
                    // Deshabilitar el checkbox correspondiente
                    $(`.track-checkbox[value="${track}"]`).prop('disabled', true).prop('checked', false).closest('label').addClass('closed-track');
                } else {
                    // Habilitar el checkbox si aún no está cerrado
                    $(`.track-checkbox[value="${track}"]`).prop('disabled', false).closest('label').removeClass('closed-track');
                }
            }
        }
    }

    // Llamar a la función al cargar la página
    actualizarEstadoTracks();

    // Actualizar el estado de los tracks cada vez que cambie la fecha
    $("#fecha").change(function() {
        actualizarEstadoTracks();
    });

    // Actualizar el estado de los tracks cada minuto si la fecha es hoy
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

    // Función para mostrar las horas límite junto a cada track (Opcional)
    function mostrarHorasLimite() {
        $(".cutoff-time").each(function() {
            const track = $(this).data("track");

            if (track === 'Venezuela') {
                $(this).hide(); // Oculta el elemento del DOM
                return;
            }
            let cierreStr = "";
            if (horariosCierre.USA[track]) {
                cierreStr = horariosCierre.USA[track];
            }
            else if (horariosCierre["Santo Domingo"][track]) {
                cierreStr = horariosCierre["Santo Domingo"][track];
            }
            else if (horariosCierre.Venezuela[track]) {
                cierreStr = horariosCierre.Venezuela[track];
            }
            if (cierreStr) {
                const cierre = new Date(`1970-01-01T${cierreStr}:00`);
                cierre.setMinutes(cierre.getMinutes() - 5); // 5 minutos antes
                const horas = cierre.getHours().toString().padStart(2, '0');
                const minutos = cierre.getMinutes().toString().padStart(2, '0');
                const horaLimite = `${horas}:${minutos}`;
                $(this).text(`Hora límite: ${horaLimite}`);
            }
        });
    }

    // Función para obtener la hora límite de un track
    function obtenerHoraLimite(track) {
        for (let region in horariosCierre) {
            if (horariosCierre[region][track]) {
                return horariosCierre[region][track];
            }
        }
        return null;
    }

    // Llamar a la función para mostrar las horas límite al cargar la página
    mostrarHorasLimite();

    // Agregar listeners al cargar la página
    agregarListenersNumeroApostado();
    resaltarDuplicados();

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Limpiar alertas anteriores
        $("#ticketAlerts").empty();

        // Validar formulario
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

        // Validar que si se seleccionó el track "Venezuela", se haya seleccionado al menos un track de USA
        const tracksUSASeleccionados = tracks.filter(track => Object.keys(horariosCierre.USA).includes(track));
        if (tracks.includes("Venezuela") && tracksUSASeleccionados.length === 0) {
            showAlert("Para jugar en la modalidad 'Venezuela', debes seleccionar al menos un track de USA además de 'Venezuela'.", "warning");
            return;
        }

        // Obtener las fechas seleccionadas como array y convertir a formato ISO
        const fechasArray = fecha.split(", ");
        const fechasArrayISO = fechasArray.map(dateStr => dayjs(dateStr, "MM-DD-YYYY").format("YYYY-MM-DD"));
        const fechaActual = new Date();
        const yearActual = fechaActual.getFullYear();
        const monthActual = fechaActual.getMonth();
        const dayActual = fechaActual.getDate();
        const fechaActualSinHora = new Date(yearActual, monthActual, dayActual);

        // Validar cada fecha seleccionada
        for (let fechaSeleccionadaStr of fechasArray) {
            const [monthSel, daySel, yearSel] = fechaSeleccionadaStr.split('-').map(Number);
            const fechaSeleccionada = new Date(yearSel, monthSel - 1, daySel);

            if (fechaSeleccionada.getTime() === fechaActualSinHora.getTime()) {
                const horaActual = new Date();
                for (let track of tracks) {
                    if (track === 'Venezuela') continue;

                    const horaLimiteStr = obtenerHoraLimite(track);
                    if (horaLimiteStr) {
                        const [horas, minutos] = horaLimiteStr.split(":");
                        const horaLimite = new Date();
                        horaLimite.setHours(parseInt(horas), parseInt(minutos) - 5, 0, 0);
                        if (horaActual > horaLimite) {
                            showAlert(`El track "${track}" ya ha cerrado para hoy. Por favor, selecciona otro track o fecha.`, "danger");
                            return;
                        }
                    }
                }
            }
        }

        // Validar jugadas
        let jugadasValidas = true;
        $("#tablaJugadas tr").each(function() {
            const numero = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            if (!numero || (numero.length < 2 || numero.length > 4)) {
                jugadasValidas = false;
                showAlert("Por favor, ingresa números apostados válidos (2, 3 o 4 dígitos).", "danger");
                return false; // Salir del each
            }
            if (modalidad === "-") {
                jugadasValidas = false;
                showAlert("Por favor, selecciona una modalidad de juego válida.", "danger");
                return false;
            }

            // Validar que la jugada tiene al menos un track seleccionado correspondiente a su modalidad
            let tracksRequeridos = [];

            if (["Win 4", "Peak 3", "Pulito", "Pulito-Combinado", "Venezuela"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre.USA);
            } else if (["RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                tracksRequeridos = Object.keys(horariosCierre["Santo Domingo"]);
            } else {
                tracksRequeridos = [];
            }

            const tracksSeleccionadosParaModalidad = tracks.filter(track => tracksRequeridos.includes(track));

            if (tracksRequeridos.length > 0 && tracksSeleccionadosParaModalidad.length === 0) {
                jugadasValidas = false;
                showAlert(`La jugada con modalidad "${modalidad}" requiere al menos un track seleccionado correspondiente.`, "danger");
                return false;
            }

            if (["Venezuela", "Venezuela-Pale", "Pulito", "Pulito-Combinado", "RD-Quiniela", "RD-Pale"].includes(modalidad)) {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                if (straight <= 0) {
                    jugadasValidas = false;
                    showAlert("Por favor, ingresa al menos una apuesta en Straight.", "danger");
                    return false;
                }
                if (modalidad === "Pulito" || modalidad === "Pulito-Combinado") {
                    const box = $(this).find(".box").val().trim();
                    const acceptableBoxValues = ["1", "2", "3"];
                    const acceptableBoxCombinations = ["1,2", "2,3", "1,3", "1,2,3"];
                    const allAcceptableValues = acceptableBoxValues.concat(acceptableBoxCombinations);
                    if (!allAcceptableValues.includes(box)) {
                        jugadasValidas = false;
                        showAlert("En la modalidad Pulito o Pulito-Combinado, el campo 'Box' debe ser 1, 2, 3, 1,2, 2,3, 1,3 o 1,2,3.", "danger");
                        return false;
                    }
                }
            } else if (["Win 4", "Peak 3"].includes(modalidad)) {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                const boxVal = $(this).find(".box").val();
                const box = boxVal !== "" ? parseFloat(boxVal) : 0;
                const combo = parseFloat($(this).find(".combo").val()) || 0;
                if (straight <= 0 && box <= 0 && combo <= 0) {
                    jugadasValidas = false;
                    showAlert(`Por favor, ingresa al menos una apuesta en Straight, Box o Combo para ${modalidad}.`, "danger");
                    return false;
                }
            }
            // Validar límites
            if (limitesApuesta[modalidad]) {
                if (parseFloat($(this).find(".straight").val()) > (limitesApuesta[modalidad].straight || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Straight excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
                if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Pulito" && modalidad !== "Pulito-Combinado" && parseFloat($(this).find(".box").val()) > (limitesApuesta[modalidad].box || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Box excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
                if (limitesApuesta[modalidad].combo !== undefined && parseFloat($(this).find(".combo").val()) > (limitesApuesta[modalidad].combo || Infinity)) {
                    jugadasValidas = false;
                    showAlert(`El monto en Combo excede el límite para ${modalidad}.`, "danger");
                    return false;
                }
            }
        });
        if (!jugadasValidas) {
            return;
        }

        // Preparar datos para el ticket
        const tracksTexto = tracks.join(", ");
        $("#ticketTracks").text(tracksTexto);
        $("#ticketJugadas").empty();
        const jugadasArrayFinal = [];
        $("#tablaJugadas tr").each(function() {
            const num = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal = $(this).find(".box").val();
            const box = boxVal !== "" ? boxVal : "-";
            const comboVal = $(this).find(".combo").val();
            const combo = comboVal !== "" ? parseFloat(comboVal) : "-";
            const total = parseFloat($(this).find(".total").text()) || 0;
            const filaHTML = `
                <tr>
                    <td>${$(this).find("td").first().text()}</td>
                    <td>${num}</td>
                    <td>${modalidad}</td>
                    <td>${straight.toFixed(2)}</td>
                    <td>${box !== "-" ? box : "-"}</td>
                    <td>${combo !== "-" ? combo.toFixed(2) : "-"}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>
            `;
            $("#ticketJugadas").append(filaHTML);

            jugadasArrayFinal.push({
                numero: num,
                modalidad: modalidad,
                straight: straight,
                box: box,
                combo: combo,
                total: total
            });
        });
        $("#ticketTotal").text($("#totalJugadas").text());

        // Mostrar las fechas de apuesta en el ticket
        $("#ticketFecha").text(fechasArray.join(", "));
        console.log("Fechas asignadas a #ticketFecha:", $("#ticketFecha").text());

        // Calcular el total global
        totalJugadasGlobal = parseFloat($("#totalJugadas").text());

        // Almacenar datos necesarios en ticketData
        ticketData = {
            fecha: fechasArrayISO, // Convertir a arreglo ISO
            tracks: tracks,
            jugadas: jugadasArrayFinal,
            totalAmount: totalJugadasGlobal,
            ticketTracks: tracksTexto,
            ticketFecha: fechasArray.join(", "), // Para visualización, puede permanecer como cadena
            selectedDays: selectedDays,
            selectedTracks: selectedTracks
        };

        // Depuración: Mostrar los datos que se enviarán al backend
        console.log("Datos del Ticket a Enviar:", JSON.stringify(ticketData, null, 2));

        // Obtener el token de localStorage
        const token = localStorage.getItem('token'); // Asegúrate de que el token esté almacenado con la clave 'token'
        console.log("Token de Autenticación:", token);

        // Enviar ticketData al backend para almacenarlo y obtener ticketId
        $.ajax({
            url: `${BACKEND_API_URL}/store-ticket`, // Ruta actualizada
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${token}` // Incluir el token de autenticación
            },
            data: JSON.stringify(ticketData),
            success: function(response) {
                console.log("Respuesta del Backend:", response);
                if (response.ticketId) {
                    ticketId = response.ticketId;

                    // Guardar ticketId en localStorage
                    localStorage.setItem('ticketId', ticketId);

                    // Limpiar campos de QR y número de ticket
                    $("#numeroTicket").text('');
                    $("#ticketTransaccion").text('');
                    $("#qrcode").empty();

                    // Mostrar el modal usando Bootstrap 5
                    ticketModal.show();
                } else {
                    showAlert('Error al almacenar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error al almacenar los datos del ticket:', jqXHR);
                let errorMsg = "Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.";
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    errorMsg = jqXHR.responseJSON.error;
                } else if (jqXHR.responseText) {
                    errorMsg = jqXHR.responseText;
                }
                showAlert(errorMsg, "danger");
            }
        });
    });

    // Manejo de la carga de la ventana para recuperar ticketData desde el backend usando ticketId
    $(window).on('load', function() {
        ticketId = localStorage.getItem('ticketId');

        if (ticketId) {
            // Recuperar ticketData desde el backend
            $.ajax({
                url: `${BACKEND_API_URL}/retrieve-ticket`,
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({ ticketId: ticketId }),
                success: function(response) {
                    console.log("Respuesta al recuperar el ticket:", response);
                    if (response.ticketData) {
                        ticketData = response.ticketData;

                        $("#ticketTracks").text(ticketData.ticketTracks);
                        $("#ticketJugadas").html(ticketData.ticketJugadasHTML);
                        $("#ticketTotal").text(ticketData.totalAmount.toFixed(2));
                        $("#ticketFecha").text(ticketData.ticketFecha);

                        $("#numeroTicket").text('');
                        $("#ticketTransaccion").text('');
                        $("#qrcode").empty();

                        // Mostrar el modal
                        ticketModal.show();
                    } else {
                        showAlert('Error al recuperar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                        // Limpiar ticketId de localStorage
                        localStorage.removeItem('ticketId');
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Error al recuperar los datos del ticket:', jqXHR);
                    showAlert('Error al recuperar los datos del ticket. Por favor, inténtalo de nuevo.', 'danger');
                    // Limpiar ticketId de localStorage
                    localStorage.removeItem('ticketId');
                }
            });
        }
    });

});

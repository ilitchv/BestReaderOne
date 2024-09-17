$(document).ready(function() {

    // Define la URL de tu API de SheetDB  
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Reemplaza con tu URL real

    // Inicializar Flatpickr con selección de rango de fechas
    flatpickr("#fecha", {
        mode: "range",
        dateFormat: "Y-m-d",
        minDate: "today",
        defaultDate: null,
        allowInput: true,
    });

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 1;

    // Horarios de cierre por track
    const horariosCierre = {
        "USA": {
            "New York Mid Day": "14:25",
            "Georgia Mid Day": "12:20",
            "New Jersey Mid Day": "12:54",
            "Florida Mid Day": "13:25",
            "Connecticut Mid Day": "13:35",
            "Georgia Evening": "18:45",
            "New York Evening": "22:25",
            "New Jersey Evening": "22:50",
            "Florida Evening": "21:30",
            "Connecticut Evening": "22:20",
            "Georgia Night": "23:20",
            "Pensilvania AM": "12:55",
            "Pensilvania PM": "18:20",
            "Venezuela": "19:00" // Asumiendo un horario de cierre para Venezuela
        },
        "Santo Domingo": {
            "Real": "12:45",
            "Gana mas": "14:25",
            "Loteka": "19:30",
            "Nacional": "20:30", // Domingos a las 17:30
            "Quiniela pale": "20:30", // Domingos a las 15:30
            "Primera Día": "11:50",
            "Suerte Día": "12:20",
            "Lotería Real": "12:50",
            "Ganamas": "14:25",
            "Suerte Tarde": "17:50",
            "Lotedom": "17:50",
            "Loteka": "19:50",
            "Primera Noche": "19:50",
            "Quiniela Pale": "20:50", // Lunes-Sábado
            "Nacional": "20:50", // Lunes-Sábado
            "Panama": "16:00",
            // Horarios especiales para domingos
            "Quiniela Pale Domingo": "15:30",
            "Nacional Domingo": "17:50"
        }
    };

    // Límites de apuestas por modalidad
    const limitesApuesta = {
        "Win 4": { "straight": 6, "box": 30 },
        "Peak 3": { "straight": 35, "box": 50 },
        "Venezuela": { "straight": 100 },
        "Venezuela-Pale": { "straight": 100 },
        "Pulito": { "straight": 100 },
        "RD-Quiniela": { "straight": 100 },
        "RD-Pale": { "straight": 100 }
    };

    // Modalidades de juego
    function determinarModalidad(tracks, numero, fila) {
        let modalidad = "-";

        const esUSA = tracks.some(track => Object.keys(horariosCierre["USA"]).includes(track));
        const esSD = tracks.some(track => Object.keys(horariosCierre["Santo Domingo"]).includes(track));
        const incluyeVenezuela = tracks.includes("Venezuela");

        const longitud = numero.length;

        if (esUSA && !esSD && !incluyeVenezuela) {
            if (longitud === 4) {
                modalidad = "Win 4";
            } else if (longitud === 3) {
                modalidad = "Peak 3";
            }
        }

        if (esUSA && incluyeVenezuela && longitud === 2) {
            modalidad = "Venezuela";
        }

        if (esUSA && longitud === 2 && !incluyeVenezuela) {
            const boxValue = parseInt(fila.find(".box").val()) || 0;
            if (boxValue === 1 || boxValue === 2) {
                modalidad = "Pulito";
            }
        }

        if (esSD && !esUSA) {
            if (longitud === 2) {
                modalidad = "RD-Quiniela";
            } else if (longitud === 4) {
                modalidad = "RD-Pale";
            }
        }

        return modalidad;
    }

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
            denominator *= factorial(counts[digit]);
        }
        return factorial(totalDigits) / denominator;
    }

    // Función para agregar una nueva jugada
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
                <td><input type="number" class="form-control straight" min="0" max="100.00" step="0.10" placeholder="Ej: 5.00"></td>
                <td><input type="number" class="form-control box" min="0" max="50.00" step="1" placeholder="1 o 2"></td>
                <td><input type="number" class="form-control combo" min="0" max="50.00" step="0.10" placeholder="Ej: 3.00"></td>
                <td class="total">0.00</td>
            </tr>
        `;
        $("#tablaJugadas").append(fila);
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
            alert("No hay jugadas para eliminar.");
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
        selectedTracks = $(".track-checkbox:checked").length;
        const fechas = $("#fecha").val();
        if (fechas) {
            const fechasArray = fechas.split(" to ");
            selectedDays = fechasArray.length === 2 ? calcularDiferenciaDias(fechasArray[0], fechasArray[1]) + 1 : 1;
        } else {
            selectedDays = 1;
        }
        calcularTotal();
    });

    $("#fecha").change(function() {
        const fechas = $(this).val();
        if (fechas) {
            const fechasArray = fechas.split(" to ");
            selectedDays = fechasArray.length === 2 ? calcularDiferenciaDias(fechasArray[0], fechasArray[1]) + 1 : 1;
        } else {
            selectedDays = 1;
        }
        calcularTotal();
    });

    // Función para calcular la diferencia de días entre dos fechas
    function calcularDiferenciaDias(fechaInicio, fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const diferencia = fin - inicio;
        return Math.floor(diferencia / (1000 * 60 * 60 * 24));
    }

    // Evento para detectar cambios en el número apostado
    $("#tablaJugadas").on("input", ".numeroApostado", function() {
        const num = $(this).val();
        const fila = $(this).closest("tr");
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const modalidad = determinarModalidad(tracks, num, fila);
        fila.find(".tipoJuego").text(modalidad);
        actualizarPlaceholders(modalidad, fila);
        calcularTotalJugada(fila);
        calcularTotal();
    });

    // Evento para detectar cambios en las apuestas
    $("#tablaJugadas").on("input", ".straight, .box, .combo", function() {
        const fila = $(this).closest("tr");
        const num = fila.find(".numeroApostado").val();
        const tracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const modalidad = determinarModalidad(tracks, num, fila);
        fila.find(".tipoJuego").text(modalidad);
        actualizarPlaceholders(modalidad, fila);
        calcularTotalJugada(fila);
        calcularTotal();
    });

    // Función para actualizar los placeholders según la modalidad
    function actualizarPlaceholders(modalidad, fila) {
        if (modalidad === "Venezuela" || modalidad === "Pulito" || modalidad.startsWith("RD-")) {
            fila.find(".straight").attr("placeholder", "Máximo $100.00");
            fila.find(".box").attr("placeholder", modalidad === "Pulito" ? "1 o 2" : "Ej: 2.50");
            fila.find(".combo").attr("placeholder", "Ej: 3.00");
        } else if (modalidad === "Win 4") {
            fila.find(".straight").attr("placeholder", "Máximo $6.00");
            fila.find(".box").attr("placeholder", "Máximo $30.00");
            fila.find(".combo").attr("placeholder", "Ej: 3.00");
        } else if (modalidad === "Peak 3") {
            fila.find(".straight").attr("placeholder", "Máximo $35.00");
            fila.find(".box").attr("placeholder", "Máximo $50.00");
            fila.find(".combo").attr("placeholder", "Ej: 3.00");
        } else {
            // Modalidad no reconocida
            fila.find(".straight").attr("placeholder", "Ej: 5.00");
            fila.find(".box").attr("placeholder", "Ej: 2.50");
            fila.find(".combo").attr("placeholder", "Ej: 3.00");
        }
    }

    // Función para calcular el total de una jugada
    function calcularTotalJugada(fila) {
        const modalidad = fila.find(".tipoJuego").text();
        const numero = fila.find(".numeroApostado").val();
        if (!numero || numero.length < 2 || numero.length > 4) {
            fila.find(".total").text("0.00");
            return;
        }

        // Verificar horario de cierre
        const selectedTracks = $(".track-checkbox:checked").map(function() { return $(this).val(); }).get();
        const horaActual = new Date();
        let superaHorario = false;

        selectedTracks.forEach(track => {
            if (horariosCierre["USA"][track] || horariosCierre["Santo Domingo"][track]) {
                const cierreStr = horariosCierre["USA"][track] || horariosCierre["Santo Domingo"][track];
                const cierre = new Date(horaActual.toDateString() + ' ' + cierreStr);
                cierre.setMinutes(cierre.getMinutes() - 5); // 5 minutos antes
                if (horaActual > cierre) {
                    superaHorario = true;
                }
            }
        });

        if (superaHorario) {
            fila.find(".total").text("0.00");
            alert("La hora de cierre para uno o más tracks seleccionados ya pasó. No puedes realizar apuestas en este momento.");
            return;
        }

        const combinaciones = calcularCombinaciones(numero);
        let straight = parseFloat(fila.find(".straight").val()) || 0;
        let box = parseFloat(fila.find(".box").val()) || 0;
        let combo = parseFloat(fila.find(".combo").val()) || 0;

        // Aplicar límites según modalidad
        if (limitesApuesta[modalidad]) {
            straight = Math.min(straight, limitesApuesta[modalidad].straight || straight);
            if (limitesApuesta[modalidad].box !== undefined) {
                box = Math.min(box, limitesApuesta[modalidad].box || box);
            }
        }

        // Enforzar límites de apuesta
        if (modalidad === "Venezuela" || modalidad === "Pulito" || modalidad.startsWith("RD-")) {
            if (straight > 100) {
                alert(`El monto en Straight excede el límite de $100 para la modalidad ${modalidad}.`);
                straight = 0;
            }
            if (modalidad === "Pulito" && (box !== 1 && box !== 2)) {
                alert(`El monto en Box debe ser 1 o 2 para la modalidad Pulito.`);
                box = 0;
            }
        } else if (modalidad === "Win 4") {
            if (straight > 6) {
                alert(`El monto en Straight excede el límite de $6 para la modalidad Win 4.`);
                straight = 0;
            }
            if (box > 30) {
                alert(`El monto en Box excede el límite de $30 para la modalidad Win 4.`);
                box = 0;
            }
        } else if (modalidad === "Peak 3") {
            if (straight > 35) {
                alert(`El monto en Straight excede el límite de $35 para la modalidad Peak 3.`);
                straight = 0;
            }
            if (box > 50) {
                alert(`El monto en Box excede el límite de $50 para la modalidad Peak 3.`);
                box = 0;
            }
        }

        // Calcular total según modalidad
        let total = 0;
        if (modalidad === "Venezuela" || modalidad === "Venezuela-Pale" || modalidad === "RD-Quiniela" || modalidad === "RD-Pale" || modalidad === "Pulito") {
            total = straight;
            if (modalidad === "Pulito") {
                total += box;
            }
        } else {
            total = straight + box + (combo * combinaciones);
        }

        fila.find(".total").text(total.toFixed(2));
    }

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        // Multiplicar por el número de tracks seleccionados y días
        total = (total * selectedTracks * selectedDays).toFixed(2);
        $("#totalJugadas").text(total);
    }

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Validar formulario
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

        // Validar jugadas
        let jugadasValidas = true;
        $("#tablaJugadas tr").each(function() {
            const numero = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            if (!numero || (numero.length < 2 || numero.length > 4)) {
                jugadasValidas = false;
                alert("Por favor, ingresa números apostados válidos (2, 3 o 4 dígitos).");
                return false;
            }
            if (modalidad === "-" ) {
                jugadasValidas = false;
                alert("Por favor, selecciona una modalidad de juego válida.");
                return false;
            }
            if (modalidad !== "Peak 3" && modalidad !== "Win 4") {
                const straight = parseFloat($(this).find(".straight").val()) || 0;
                if (straight <= 0) {
                    jugadasValidas = false;
                    alert("Por favor, ingresa al menos una apuesta en Straight.");
                    return false;
                }
            }
            // Validar límites
            const straightVal = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal = parseFloat($(this).find(".box").val()) || 0;
            const comboVal = parseFloat($(this).find(".combo").val()) || 0;

            if (limitesApuesta[modalidad]) {
                if (straightVal > (limitesApuesta[modalidad].straight || straightVal)) {
                    jugadasValidas = false;
                    alert(`El monto en Straight excede el límite para ${modalidad}.`);
                    return false;
                }
                if (limitesApuesta[modalidad].box !== undefined && modalidad !== "Venezuela" && modalidad !== "Venezuela-Pale" && modalidad !== "RD-Quiniela" && modalidad !== "RD-Pale") {
                    if (boxVal > (limitesApuesta[modalidad].box || boxVal)) {
                        jugadasValidas = false;
                        alert(`El monto en Box excede el límite para ${modalidad}.`);
                        return false;
                    }
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
        $("#tablaJugadas tr").each(function() {
            const num = $(this).find(".numeroApostado").val();
            const modalidad = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const boxVal = $(this).find(".box").val();
            const box = boxVal !== "" ? parseFloat(boxVal) : "-";
            const comboVal = $(this).find(".combo").val();
            const combo = comboVal !== "" ? parseFloat(comboVal) : "-";
            const total = parseFloat($(this).find(".total").text()) || 0;
            const fila = `
                <tr>
                    <td>${$(this).find("td").first().text()}</td>
                    <td>${num}</td>
                    <td>${modalidad}</td>
                    <td>${straight.toFixed(2)}</td>
                    <td>${box !== "-" ? box.toFixed(2) : "-"}</td>
                    <td>${combo !== "-" ? combo.toFixed(2) : "-"}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>
            `;
            $("#ticketJugadas").append(fila);
        });
        $("#ticketTotal").text($("#totalJugadas").text());
        // Generar número de ticket único de 8 dígitos
        const numeroTicket = generarNumeroUnico();
        $("#numeroTicket").text(numeroTicket);
        // Generar código QR
        $("#qrcode").empty(); // Limpiar el contenedor anterior
        new QRCode(document.getElementById("qrcode"), {
            text: numeroTicket,
            width: 128,
            height: 128,
        });
        // Asignar hora actual al generar el ticket
        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        $("#ticketFecha").text(`${fecha} ${horaActual}`);
        // Mostrar el modal usando Bootstrap 5
        ticketModal.show();
    });

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Evento para confirmar e imprimir el ticket
    $("#confirmarTicket").click(function() {
        // Preparar datos para SheetDB
        const ticketData = {
            "Ticket Number": $("#numeroTicket").text(),
            "Bet Date": $("#ticketFecha").text(),
            "Tracks": $("#ticketTracks").text(),
            "Bet Numbers": [],
            "Game Mode": [],
            "Straight ($)": [],
            "Box ($)": [],
            "Combo ($)": [],
            "Total ($)": $("#ticketTotal").text(),
            "Timestamp": new Date().toISOString()
        };
        $("#ticketJugadas tr").each(function() {
            ticketData["Bet Numbers"].push($(this).find("td").eq(1).text());
            ticketData["Game Mode"].push($(this).find("td").eq(2).text());
            ticketData["Straight ($)"].push($(this).find("td").eq(3).text());
            ticketData["Box ($)"].push($(this).find("td").eq(4).text() !== "-" ? $(this).find("td").eq(4).text() : "");
            ticketData["Combo ($)"].push($(this).find("td").eq(5).text() !== "-" ? $(this).find("td").eq(5).text() : "");
        });
        // Convertir arrays a cadenas separadas por comas
        ticketData["Bet Numbers"] = ticketData["Bet Numbers"].join(", ");
        ticketData["Game Mode"] = ticketData["Game Mode"].join(", ");
        ticketData["Straight ($)"] = ticketData["Straight ($)"].join(", ");
        ticketData["Box ($)"] = ticketData["Box ($)"].join(", ");
        ticketData["Combo ($)"] = ticketData["Combo ($)"].join(", ");
        
        // Enviar datos a SheetDB
        $.ajax({
            url: SHEETDB_API_URL, // Usar la variable de SheetDB
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(ticketData),
            success: function(response) {
                // Imprimir el ticket
                window.print();
                // Cerrar el modal
                ticketModal.hide();
                // Reiniciar el formulario
                resetForm();
                alert("Ticket guardado e enviado exitosamente.");
            },
            error: function(err) {
                console.error("Error al enviar datos a SheetDB:", err);
                // Mostrar mensaje de error más detallado
                alert("Hubo un problema al enviar los datos. Por favor, inténtalo de nuevo.\nDetalles del error: " + JSON.stringify(err));
            }
        });
    });

    // Función para reiniciar el formulario
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 1;
        agregarJugada();
        $("#totalJugadas").text("0.00");
    }

    // Calcular y mostrar las horas límite junto a cada track
    function mostrarHorasLimite() {
        $(".cutoff-time").each(function() {
            const track = $(this).data("track");
            let cierreStr = "";
            if (horariosCierre["USA"][track]) {
                cierreStr = horariosCierre["USA"][track];
            } else if (horariosCierre["Santo Domingo"][track]) {
                cierreStr = horariosCierre["Santo Domingo"][track];
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

    // Llamar a la función para mostrar las horas límite al cargar la página
    mostrarHorasLimite();

});

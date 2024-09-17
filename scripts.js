$(document).ready(function() {

    // Define la URL de tu API de SheetDB
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/gect4lbs5bwvr'; // Reemplaza con tu URL real

    // Inicializar Flatpickr con selección de fecha y hora
    flatpickr("#fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        defaultDate: new Date(),
        wrap: false
    });

    let jugadaCount = 0;
    let selectedTracks = 0;

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
                <td><input type="number" class="form-control straight" min="0" max="25.00" step="0.10" placeholder="Ej: 5.00"></td>
                <td><input type="number" class="form-control box" min="0" max="25.00" step="0.10" placeholder="Ej: 2.50"></td>
                <td><input type="number" class="form-control combo" min="0" max="25.00" step="0.10" placeholder="Ej: 3.00"></td>
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

    // Contador de tracks seleccionados
    $("input[type=checkbox]").change(function() {
        selectedTracks = $("input[type=checkbox]:checked").length;
        calcularTotal();
    });

    // Evento para detectar cambios en el número apostado
    $("#tablaJugadas").on("input", ".numeroApostado", function() {
        const num = $(this).val();
        const tipo = num.length === 3 ? "Peak 3" : num.length === 4 ? "Win 4" : "-";
        $(this).closest("tr").find(".tipoJuego").text(tipo);
        calcularTotalJugada($(this).closest("tr"));
        calcularTotal();
    });

    // Evento para detectar cambios en las apuestas
    $("#tablaJugadas").on("input", ".straight, .box, .combo", function() {
        calcularTotalJugada($(this).closest("tr"));
        calcularTotal();
    });

    // Función para calcular el total de una jugada
    function calcularTotalJugada(fila) {
        const numero = fila.find(".numeroApostado").val();
        if (!numero || numero.length < 3 || numero.length > 4) {
            fila.find(".total").text("0.00");
            return;
        }

        const combinaciones = calcularCombinaciones(numero);
        const straight = parseFloat(fila.find(".straight").val()) || 0;
        const box = parseFloat(fila.find(".box").val()) || 0;
        const combo = parseFloat(fila.find(".combo").val()) || 0;

        // Calcular total: straight + box + (combo * combinaciones)
        const total = straight + box + (combo * combinaciones);
        fila.find(".total").text(total.toFixed(2));
    }

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        let total = 0;
        $(".total").each(function() {
            total += parseFloat($(this).text()) || 0;
        });
        // Multiplicar por el número de tracks seleccionados
        if (selectedTracks > 1) {
            total = (total * selectedTracks).toFixed(2);
        } else {
            total = total.toFixed(2);
        }
        $("#totalJugadas").text(total);
    }

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // Validar formulario
        const fecha = $("#fecha").val();
        if (!fecha) {
            alert("Por favor, selecciona una fecha y hora.");
            return;
        }
        const tracks = [];
        $("input[type=checkbox]:checked").each(function() {
            tracks.push($(this).val());
        });
        if (tracks.length === 0) {
            alert("Por favor, selecciona al menos un track.");
            return;
        }
        // Validar jugadas
        let jugadasValidas = true;
        $("#tablaJugadas tr").each(function() {
            const numero = $(this).find(".numeroApostado").val();
            if (!numero || (numero.length !== 3 && numero.length !== 4)) {
                jugadasValidas = false;
                alert("Por favor, ingresa números apostados válidos (3 o 4 dígitos).");
                return false;
            }
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const box = parseFloat($(this).find(".box").val()) || 0;
            const combo = parseFloat($(this).find(".combo").val()) || 0;
            // Validar que al menos uno de los campos de apuesta sea mayor a 0
            if (straight <= 0 && box <= 0 && combo <= 0) {
                jugadasValidas = false;
                alert("Por favor, ingresa al menos una apuesta en Straight, Box o Combo.");
                return false;
            }
            // Verificar que las apuestas sean positivas
            if (straight < 0 || box < 0 || combo < 0) {
                jugadasValidas = false;
                alert("Las apuestas deben ser valores positivos.");
                return false;
            }
        });
        if (!jugadasValidas) {
            return;
        }
        // Preparar datos para el ticket
        $("#ticketFecha").text(fecha);
        $("#ticketTracks").text(tracks.join(", "));
        $("#ticketJugadas").empty();
        $("#tablaJugadas tr").each(function() {
            const num = $(this).find(".numeroApostado").val();
            const tipo = $(this).find(".tipoJuego").text();
            const straight = parseFloat($(this).find(".straight").val()) || 0;
            const box = parseFloat($(this).find(".box").val()) || 0;
            const combo = parseFloat($(this).find(".combo").val()) || 0;
            const total = parseFloat($(this).find(".total").text()) || 0;
            const fila = `
                <tr>
                    <td>${$(this).find("td").first().text()}</td>
                    <td>${num}</td>
                    <td>${tipo}</td>
                    <td>${straight.toFixed(2)}</td>
                    <td>${box.toFixed(2)}</td>
                    <td>${combo.toFixed(2)}</td>
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
            ticketData["Box ($)"].push($(this).find("td").eq(4).text());
            ticketData["Combo ($)"].push($(this).find("td").eq(5).text());
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
        agregarJugada();
        $("#totalJugadas").text("0.00");
    }
});

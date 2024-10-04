let fechaTransaccion = '';

$(document).ready(function() {

    // Inicializar Supabase
    const SUPABASE_URL = 'https://rrycqjcwdwvhliqbgeoh.supabase.co';
    const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUÍ';

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Inicializar Flatpickr con selección de rango de fechas
    flatpickr("#fecha", {
        mode: "multiple",
        dateFormat: "m-d-Y", // Cambiado a MM-DD-YYYY
        minDate: "today",
        maxDate: null,
        defaultDate: null,
        allowInput: true,
        onChange: function(selectedDates, dateStr, instance) {
            selectedDays = selectedDates.length;
            console.log("Días seleccionados:", selectedDays);
            calcularTotal();
        },
    });

    let jugadaCount = 0;
    let selectedTracks = 0;
    let selectedDays = 0;

    // Horarios de cierre por track
    const horariosCierre = {
        // ... (mantén tu objeto horariosCierre aquí)
    };

    // Límites de apuestas por modalidad
    const limitesApuesta = {
        // ... (mantén tu objeto limitesApuesta aquí)
    };

    // Modalidades de juego
    function determinarModalidad(tracks, numero, fila) {
        // ... (mantén tu función determinarModalidad aquí)
    }

    // Función para agregar una nueva jugada
    function agregarJugada() {
        // ... (mantén tu función agregarJugada aquí)
    }

    // Agregar una jugada inicial
    agregarJugada();

    // Evento para agregar más jugadas
    $("#agregarJugada").click(function() {
        agregarJugada();
    });

    // Evento para eliminar la última jugada
    $("#eliminarJugada").click(function() {
        // ... (mantén tu función aquí)
    });

    // Contador de tracks seleccionados y días
    $(".track-checkbox").change(function() {
        // ... (mantén tu función aquí)
    });

    // Evento para detectar cambios en los campos de entrada
    $("#tablaJugadas").on("input", ".numeroApostado, .straight, .box, .combo", function() {
        // ... (mantén tu función aquí)
    });

    // Función para actualizar los placeholders según la modalidad
    function actualizarPlaceholders(modalidad, fila) {
        // ... (mantén tu función aquí)
    }

    // Función para calcular el total de una jugada
    function calcularTotalJugada(fila) {
        // ... (mantén tu función aquí)
    }

    // Función para calcular el número de combinaciones posibles
    function calcularCombinaciones(numero) {
        // ... (mantén tu función aquí)
    }

    // Función para calcular el total de todas las jugadas
    function calcularTotal() {
        // ... (mantén tu función aquí)
    }

    // Inicializar Bootstrap Modal
    var ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));

    // Función para obtener la hora límite de un track
    function obtenerHoraLimite(track) {
        // ... (mantén tu función aquí)
    }

    // Evento para generar el ticket
    $("#generarTicket").click(function() {
        // ... (mantén tu función aquí)
    });

    // Función para generar número único de ticket de 8 dígitos
    function generarNumeroUnico() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    // Evento para confirmar e imprimir el ticket
    $("#confirmarTicket").click(async function() {
        // Datos comunes a todas las jugadas
        const ticketNumber = $("#numeroTicket").text();
        const transactionDateTime = fechaTransaccion;
        const betDates = $("#ticketFecha").text();
        const tracks = $("#ticketTracks").text();
        const totalTicket = $("#ticketTotal").text();
        const timestamp = new Date().toISOString();

        // Array para almacenar las jugadas
        const jugadasData = [];

        // Recorrer cada jugada y preparar los datos
        $("#ticketJugadas tr").each(function() {    
            // Generar número único de 8 dígitos para la jugada
            const jugadaNumber = generarNumeroUnico();

            const jugadaData = {
                "Ticket Number": ticketNumber,
                "Transaction DateTime": transactionDateTime,
                "Bet Dates": betDates,
                "Tracks": tracks,
                "Bet Number": $(this).find("td").eq(1).text(),
                "Game Mode": $(this).find("td").eq(2).text(),
                "Straight ($)": $(this).find("td").eq(3).text(),
                "Box ($)": $(this).find("td").eq(4).text() !== "-" ? $(this).find("td").eq(4).text() : "",
                "Combo ($)": $(this).find("td").eq(5).text() !== "-" ? $(this).find("td").eq(5).text() : "",
                "Total ($)": $(this).find("td").eq(6).text(),
                "Jugada Number": jugadaNumber,
                "Timestamp": timestamp
            };

            // Añadir la jugada al array
            jugadasData.push(jugadaData);
        });

        // Preparar los datos del ticket
        const ticketData = {
            ticket_number: ticketNumber,
            transaction_datetime: transactionDateTime,
            bet_dates: betDates,
            tracks: tracks,
            total_amount: totalTicket,
            created_at: timestamp
        };

        // Llamar a la función para guardar en Supabase
        await guardarJugadasEnSupabase(ticketData, jugadasData);
    });

    async function guardarJugadasEnSupabase(ticketData, jugadasData) {
        try {
            // Obtener el ID del usuario actual (si tienes autenticación implementada)
            const user = supabase.auth.user();
            const user_id = user ? user.id : null;

            // Si no tienes autenticación implementada, puedes asignar un user_id genérico o null
            // const user_id = null;

            // Agregar el user_id al ticketData
            ticketData.user_id = user_id;

            // Insertar el ticket en Supabase
            let { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .insert([ticketData]);

            if (ticketError) {
                console.error('Error al guardar el ticket:', ticketError);
                alert('Hubo un error al guardar el ticket. Por favor, inténtalo de nuevo.');
                return;
            }

            // Obtener el ID del ticket recién creado
            const ticket_id = ticket[0].id;

            // Ahora, procesar cada jugada individualmente
            for (let i = 0; i < jugadasData.length; i++) {
                const jugada = jugadasData[i];

                // Convertir los campos de jugada al formato esperado por Supabase
                const jugadaData = {
                    ticket_id: ticket_id,
                    jugada_number: jugada["Jugada Number"],
                    number_played: jugada["Bet Number"],
                    game_mode: jugada["Game Mode"],
                    straight_amount: parseFloat(jugada["Straight ($)"]) || 0,
                    box_amount: parseFloat(jugada["Box ($)"]) || 0,
                    combo_amount: parseFloat(jugada["Combo ($)"]) || 0,
                    total_amount: parseFloat(jugada["Total ($)"]) || 0,
                    created_at: jugada["Timestamp"],
                    user_id: user_id,
                    tracks: jugada["Tracks"],
                    // Agrega otros campos necesarios si los hay
                };

                // Validar los límites antes de guardar la jugada
                const esValida = await validarLimites(jugadaData);

                if (!esValida) {
                    // Si la jugada no es válida, detenemos el proceso y eliminamos el ticket creado
                    await supabase.from('tickets').delete().eq('id', ticket_id);
                    alert('Una de tus jugadas excede el límite permitido. El ticket ha sido cancelado.');
                    return;
                }

                // Insertar la jugada en Supabase
                let { error: jugadaError } = await supabase.from('jugadas').insert([jugadaData]);

                if (jugadaError) {
                    console.error('Error al guardar la jugada:', jugadaError);
                    alert('Hubo un error al guardar una de las jugadas. Por favor, intenta de nuevo.');
                    // Opcionalmente, puedes eliminar el ticket y las jugadas ya insertadas
                    return;
                }
            }

            // Opcional: Usar html2canvas para capturar solo el ticket
            html2canvas(document.querySelector("#preTicket")).then(canvas => {
                // Obtener la imagen en formato data URL
                const imgData = canvas.toDataURL("image/png");
                // Crear un enlace para descargar la imagen
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'ticket.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            // Imprimir el ticket
            window.print();

            // Cerrar el modal
            ticketModal.hide();

            // Reiniciar el formulario
            resetForm();

            alert('¡Ticket y jugadas guardados exitosamente en Supabase!');
        } catch (error) {
            console.error('Error al guardar las jugadas en Supabase:', error);
            alert('Hubo un error al guardar las jugadas. Por favor, inténtalo de nuevo.');
        }
    }

    async function validarLimites(jugada) {
        const bet_date = new Date().toISOString().split('T')[0]; // Fecha actual en formato 'YYYY-MM-DD'

        // Obtener el límite aplicable
        let { data: limiteData, error: limiteError } = await supabase
            .from('bet_limits')
            .select('max_bet')
            .eq('game_mode', jugada.game_mode)
            .eq('track', jugada.tracks)
            .or(`bet_type.eq.straight,bet_type.eq.all`)
            .single();

        if (limiteError || !limiteData) {
            console.error('Error al obtener el límite:', limiteError);
            alert('No se pudo obtener el límite de apuesta para la jugada. Por favor, intenta de nuevo.');
            return false;
        }

        const max_bet = parseFloat(limiteData.max_bet);

        // Calcular el monto total de la jugada
        const monto_jugada = jugada.straight_amount + jugada.box_amount + jugada.combo_amount;

        // Obtener el monto disponible sin revelar el total apostado
        let { data: disponibleData, error: disponibleError } = await supabase
            .rpc('obtener_monto_disponible', {
                bet_date_input: bet_date,
                number_played_input: jugada.number_played,
                game_mode_input: jugada.game_mode,
                track_input: jugada.tracks,
                bet_type_input: 'straight' // Ajusta según corresponda
            });

        if (disponibleError || !disponibleData || disponibleData.length === 0) {
            console.error('Error al obtener el monto disponible:', disponibleError);
            alert('No se pudo validar el monto disponible para la jugada. Por favor, intenta de nuevo.');
            return false;
        }

        const monto_disponible = parseFloat(disponibleData[0].monto_disponible);

        if (monto_disponible < monto_jugada) {
            alert(`Solo puedes apostar hasta $${monto_disponible.toFixed(2)} en esta jugada.`);
            return false;
        }

        // Actualizar o insertar en daily_bets
        const nuevo_total = max_bet - (monto_disponible - monto_jugada);

        const { error: upsertError } = await supabase
            .from('daily_bets')
            .upsert({
                bet_date: bet_date,
                number_played: jugada.number_played,
                game_mode: jugada.game_mode,
                track: jugada.tracks,
                bet_type: 'straight', // Ajusta según corresponda
                total_amount: nuevo_total
            }, { onConflict: 'bet_date,number_played,game_mode,track,bet_type' });

        if (upsertError) {
            console.error('Error al actualizar daily_bets:', upsertError);
            alert('No se pudo actualizar el total apostado para la jugada. Por favor, intenta de nuevo.');
            return false;
        }

        return true;
    }

    // Función para reiniciar el formulario
    function resetForm() {
        $("#lotteryForm")[0].reset();
        $("#tablaJugadas").empty();
        jugadaCount = 0;
        selectedTracks = 0;
        selectedDays = 0;
        agregarJugada();
        $("#totalJugadas").text("0.00");
        // Resetear los placeholders
        $("#tablaJugadas tr").each(function() {
            actualizarPlaceholders("-", $(this));
        });
        resaltarDuplicados();
    }

    // Calcular y mostrar las horas límite junto a cada track
    function mostrarHorasLimite() {
        // ... (mantén tu función aquí)
    }

    // Función para resaltar números duplicados
    function resaltarDuplicados() {
        // ... (mantén tu función aquí)
    }

    // Función para agregar listeners a los campos de número apostado
    function agregarListenersNumeroApostado() {
        // ... (mantén tu función aquí)
    }

    // Agregar listeners al cargar la página
    agregarListenersNumeroApostado();
    resaltarDuplicados(); // Resaltar duplicados al cargar, si los hay

    // Llamar a la función para mostrar las horas límite al cargar la página
    mostrarHorasLimite();

});

const WebSocket = require('ws');
const aiContext = require('./aiContext');
require('dotenv').config();

// The endpoint for Gemini Multimodal Live API
const HOST = 'generativelanguage.googleapis.com';
const MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;

/**
 * Service to handle real-time WebSocket bridging between the React frontend 
 * and the Google Gemini Multimodal Live API.
 */
class GeminiLiveService {
    constructor(clientWs) {
        this.clientWs = clientWs;
        this.geminiWs = null;
        this.systemInstruction = aiContext.getLiveAgentSystemInstruction();
        this.pingInterval = null;
    }

    /**
     * Initializes the connection to Google's API and sets up the event listeners.
     */
    connect() {
        console.log("[GeminiLive] Connecting to Google API...");
        this.geminiWs = new WebSocket(WS_URL);

        this.geminiWs.on('open', () => {
            console.log("[GeminiLive] Connected to Google API.");
            this.sendInitialSetup();
            this.startHeartbeat();
        });

        this.geminiWs.on('message', (data) => {
            this.handleGeminiMessage(data);
        });

        this.geminiWs.on('close', (code, reason) => {
            console.log(`[GeminiLive] Disconnected from Google API. Code: ${code}, Reason: ${reason.toString()}`);
            if (this.clientWs.readyState === WebSocket.OPEN) {
                this.clientWs.close();
            }
        });

        this.geminiWs.on('error', (err) => {
            console.error("[GeminiLive] Error:", err);
            this.clientWs.send(JSON.stringify({ type: 'server_error', message: err.message }));
        });
    }

    /**
     * Sends the initial setup configuration to Gemini, establishing the tools 
     * and the system instructions.
     */
    sendInitialSetup() {
        const setupMessage = {
            setup: {
                model: MODEL,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: "Aoede" // Pick a default voice, "Aoede" or "Puck" etc
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{ text: this.systemInstruction }]
                },
                tools: [
                    {
                        functionDeclarations: [
                            {
                                name: "add_plays_to_slate",
                                description: "Use this tool to add lottery plays to the user's ticket on the screen in response to them dictating numbers.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        plays: {
                                            type: "ARRAY",
                                            items: {
                                                type: "OBJECT",
                                                properties: {
                                                    betNumber: { type: "STRING", description: "The number to play (e.g. '123')" },
                                                    gameMode: { type: "STRING", description: "The type of game (e.g., 'Pick 3', 'Pale')" },
                                                    straightAmount: { type: "NUMBER", description: "Straight (Derecho) amount" },
                                                    boxAmount: { type: "NUMBER", description: "Box (Box) amount" },
                                                    comboAmount: { type: "NUMBER", description: "Combo amount" }
                                                },
                                                required: ["betNumber", "gameMode"]
                                            }
                                        }
                                    },
                                    required: ["plays"]
                                }
                            },
                            {
                                name: "set_date",
                                description: "Use this tool to set or change the date for the lottery ticket the user is creating. Useful when the user says 'I want to play for tomorrow' or 'set date to Friday'.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        dates: {
                                            type: "ARRAY",
                                            items: { type: "STRING" },
                                            description: "List of dates in YYYY-MM-DD format."
                                        }
                                    },
                                    required: ["dates"]
                                }
                            },
                            {
                                name: "toggle_track",
                                description: "Use this tool to select or deselect a lottery track (e.g., New York, Florida). Useful when the user says 'Add New York and Florida'.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        tracks: {
                                            type: "ARRAY",
                                            items: { type: "STRING" },
                                            description: "Array of track identifiers to add/remove (e.g. ['usa/ny/Midday', 'usa/fl/Evening']). Standard tracks include 'usa/[state_id]/[draw_type]'."
                                        }
                                    },
                                    required: ["tracks"]
                                }
                            },
                            {
                                name: "apply_global_wager",
                                description: "Use this tool to apply a common wager to all existing plays that don't have a specific wager yet, OR to override existing wagers. Useful when the user says 'put 5 straight on everything'.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        straightAmount: { type: "NUMBER", description: "Straight (Derecho) amount" },
                                        boxAmount: { type: "NUMBER", description: "Box (Box) amount" },
                                        comboAmount: { type: "NUMBER", description: "Combo amount" }
                                    }
                                }
                            },
                            {
                                name: "generate_ticket",
                                description: "Use this tool to finalize the ticket and open the generation/printing modal when the user says they are done entering plays and want to print.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        confirm: { type: "BOOLEAN", description: "Set to true to open generation modal." }
                                    },
                                    required: ["confirm"]
                                }
                            },
                            {
                                name: "delete_plays",
                                description: "Use this tool to delete specific plays from the user's ticket by their 1-based index when they ask to remove them (e.g., 'delete the first and third play').",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        indices: {
                                            type: "ARRAY",
                                            items: { type: "NUMBER" },
                                            description: "Array of 1-based indices to delete (e.g., [1, 3] for the first and third plays)."
                                        }
                                    },
                                    required: ["indices"]
                                }
                            },
                            {
                                name: "clear_all_plays",
                                description: "Use this tool to delete ALL plays from the current ticket when the user says to clear everything or start over.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "open_tool_modal",
                                description: "Use this tool to open specific tools or dialogs such as the 'wizard', 'calculator', 'ocr' (scanner/photos), or 'chatbot' (smart paper assistant).",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        toolName: {
                                            type: "STRING",
                                            description: "The name of the tool to open. Allowed values: 'wizard', 'calculator', 'ocr', 'chatbot'."
                                        }
                                    },
                                    required: ["toolName"]
                                }
                            },
                            {
                                name: "close_current_modal",
                                description: "Use this tool to close whatever modal or dialog is currently open, returning the user to the main views.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "checkout_ticket",
                                description: "Use this tool when the user wants to finish, checkout, generate, or buy the ticket. This tool opens the ticket confirmation and payment summary screen.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        paymentMethod: {
                                            type: "STRING",
                                            description: "Optional: The preferred payment method (e.g., 'wallet'). If not provided, the checkout screen will simply open for manual selection."
                                        }
                                    }
                                }
                            },
                            {
                                name: "share_ticket",
                                description: "Use this tool to trigger the share dialog for the current ticket (WhatsApp, etc.). Note: The ticket must be paid and confirmed first for the share button to be active.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "set_theme",
                                description: "Use this tool to change the color theme of the user interface.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        theme: {
                                            type: "STRING",
                                            description: "The desired theme. Allowed values: 'light' or 'dark'."
                                        }
                                    },
                                    required: ["theme"]
                                }
                            },
                            {
                                name: "set_view_mode",
                                description: "Switch the visual representation of the tracks. The grid mode is a standard layout, the reel mode is a slot-machine-like view.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        mode: { type: "STRING", description: "The view mode to set: 'grid' or 'reel'" }
                                    },
                                    required: ["mode"]
                                }
                            },
                            {
                                name: "navigate_to_tab",
                                description: "Navigate to a specific category tab within the playground track selector.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        tabName: { type: "STRING", description: "The name of the tab to open, such as 'High Frequency Games', 'Santo Domingo', 'USA Regular States', etc." }
                                    },
                                    required: ["tabName"]
                                }
                            },
                            {
                                name: "read_slate_plays",
                                description: "Read back the current plays on the user's slate, including their row numbers (1, 2, 3...). Use this when the user asks what they have played so far or to confirm their current bets.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "shutdown_agent",
                                description: "Use this tool to manually turn off the voice assistant and end the current voice session. Triggered by commands like 'stop', 'turn off', or 'apágate'.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "get_ticket_status",
                                description: "Check the current status of the lottery ticket, including whether it is being edited, ready for review, or PAID/confirmed. This tool also returns the current TOTAL amount and track count, which you should use to inform the user.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {}
                                }
                            },
                            {
                                name: "set_row_wager",
                                description: "Set the wager amount for a specific row identified by its number (e.g., 'row 1', 'row 2').",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        rowNumber: { type: "NUMBER", description: "The 1-based row number as shown in the UI '#' column." },
                                        straightAmount: { type: "NUMBER", description: "Amount for straight/derecho" },
                                        boxAmount: { type: "NUMBER", description: "Amount for box/box" },
                                        comboAmount: { type: "NUMBER", description: "Amount for combo" }
                                    },
                                    required: ["rowNumber"]
                                }
                            },
                            {
                                name: "click_ui_element",
                                description: "Trigger a click on specific UI elements by their human-readable name or ID (e.g., 'upload_image', 'confirm_and_pay', 'share_button').",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        elementName: { type: "STRING", description: "The name or ID of the element to click." }
                                    },
                                    required: ["elementName"]
                                }
                            },
                            {
                                name: "wizard_generate_random",
                                description: "Generate a batch of random plays automatically. Only use this if the user asks you to generate random plays.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        gameMode: { type: "STRING", description: "The type of game to generate for (e.g., 'Pick 3', 'Win 4', 'Pick 2', 'Palé', 'Pulito'). Default to Pick 3." },
                                        count: { type: "NUMBER", description: "The number of plays to generate (default 5)." },
                                        straightAmount: { type: "NUMBER", description: "Straight amount to assign to each play (optional)." },
                                        boxAmount: { type: "NUMBER", description: "Box amount to assign to each play (optional)." },
                                        comboAmount: { type: "NUMBER", description: "Combo amount to assign to each play (optional)." }
                                    },
                                    required: ["gameMode", "count"]
                                }
                            },
                            {
                                name: "wizard_generate_sequence",
                                description: "Generate a sequence of sequential plays from a start number to an end number automatically.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        startNumber: { type: "STRING", description: "The starting number of the sequence. Must include the padding zeros (e.g. '000' or '12')." },
                                        endNumber: { type: "STRING", description: "The ending number of the sequence. Must match the padding of the start." },
                                        straightAmount: { type: "NUMBER", description: "Straight amount to assign to each play (optional)." },
                                        boxAmount: { type: "NUMBER", description: "Box amount to assign to each play (optional)." },
                                        comboAmount: { type: "NUMBER", description: "Combo amount to assign to each play (optional)." }
                                    },
                                    required: ["startNumber", "endNumber"]
                                }
                            },
                            {
                                name: "scroll_ui",
                                description: "Scroll the user interface to help the user see different parts of the application. Use this when you are guiding the user or when they ask to see something at the bottom/top.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        direction: { type: "STRING", enum: ["top", "bottom", "up", "down"], description: "The direction to scroll." }
                                    },
                                    required: ["direction"]
                                }
                            },
                            {
                                name: "request_human_help",
                                description: "Escalate the conversation to a human supervisor or administrator when you cannot fulfill a specialized request or when the user explicitly asks for human assistance.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        reason: { type: "STRING", description: "A brief explanation of why human help is needed." }
                                    },
                                    required: ["reason"]
                                }
                            },
                            {
                                name: "write_to_smart_paper",
                                description: "Real-time digitization: Write text or plays directly into the Smart Paper 'slate' (board) while the user is dictating. Use this ONLY if the Smart Paper tool is open.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        text: { type: "STRING", description: "The text or play details to append to the board." }
                                    },
                                    required: ["text"]
                                }
                            }
                        ]
                    }
                ]
            }
        };

        this.geminiWs.send(JSON.stringify(setupMessage));
    }

    /**
     * Processes audio/data coming from the frontend and sends it to Gemini.
     */
    receiveFromClient(messageStr) {
        try {
            const message = JSON.parse(messageStr);

            // If the client sends raw audio data (base64)
            if (message.realtimeInput && message.realtimeInput.mediaChunks) {
                if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
                    this.geminiWs.send(JSON.stringify({
                        realtimeInput: message.realtimeInput
                    }));
                }
            }
            // If the client is sending the result of a function call execution
            else if (message.toolResponse) {
                if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
                    this.geminiWs.send(JSON.stringify({
                        toolResponse: message.toolResponse
                    }));
                }
            }
        } catch (e) {
            console.error("[GeminiLive] Error parsing client message:", e);
        }
    }

    /**
     * Handles incoming messages from the Gemini Live API and forwards
     * audio or tool calls to the frontend client.
     */
    handleGeminiMessage(data) {
        try {
            const message = JSON.parse(data.toString('utf8'));

            // If Gemini is returning audio content to speak
            if (message.serverContent && message.serverContent.modelTurn) {
                const parts = message.serverContent.modelTurn.parts;
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                        // Forward audio back to the frontend
                        this.clientWs.send(JSON.stringify({
                            type: 'audio',
                            base64: part.inlineData.data,
                            mimeType: part.inlineData.mimeType
                        }));
                    }
                }
            }

            // If Gemini is calling our tool "add_plays_to_slate"
            if (message.toolCall) {
                console.log("[GeminiLive] Tool call received:", JSON.stringify(message.toolCall));

                // Forward the function call to the frontend to update the UI
                this.clientWs.send(JSON.stringify({
                    type: 'function_call',
                    call: message.toolCall
                }));
            }

        } catch (e) {
            console.error("[GeminiLive] Error parsing Gemini message:", e);
        }
    }

    /**
     * Cleans up the connection
     */
    disconnect() {
        this.stopHeartbeat();
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
            this.geminiWs.close();
        }
    }

    /**
     * Heartbeat to prevent idle timeouts from Google API or intermediaries.
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
                // Gemini Multimodal Live API doesn't specify a ping format, but standard WS ping 
                // or an empty message usually works to keep it alive. 
                // We'll send a small setup update or just keep the socket active.
                this.geminiWs.ping();
            }
        }, 30000); // 30 seconds
    }

    stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}

module.exports = GeminiLiveService;

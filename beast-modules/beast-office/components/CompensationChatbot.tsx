import React, { useState, useEffect } from 'react';
import { chatWithContext } from '../../../services/geminiService';

const CompensationChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hola, soy el asistente del Plan de Compensación. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [planContext, setPlanContext] = useState('');

    useEffect(() => {
        // Fallback or direct fetch if the ?raw import doesn't work in this specific bundler setup (Vite usually supports it)
        // If planPath is actual content due to raw loader:
        // We will mock the context for now to ensure reliability without file reading issues in frontend

        const defaultContext = `
# Plan de Compensación Beast Office v1.0

## 1. Rangos y Calificaciones

### Usuario (Nuevo)
- **Requisito**: Registrarse y validar email.
- **Beneficio**: Acceso al dashboard.

### Agente
- **Requisito**: 100 PV (Puntos de Volumen Personal).
- **Beneficio**: Comisiones del Nivel 1 (Directos).

### Socio
- **Requisito**: 200 PV y 2 Agentes directos.
- **Beneficio**: Comisiones hasta Nivel 3.

### Manager
- **Requisito**: 500 PV y 5,000 GV (Volumen Grupal).
- **Beneficio**: Bono Global 2% y Comisiones hasta Nivel 5.

## 2. Comisiones Unilevel

| Nivel | Porcentaje | Requisito Rango |
|-------|------------|-----------------|
| 1     | 20%        | Agente          |
| 2     | 10%        | Socio           |
| 3     | 5%         | Socio           |
| 4     | 3%         | Manager         |
| 5     | 2%         | Manager         |

## 3. Bonos Adicionales

### Bono de Inicio Rápido
Gana un 50% de la primera compra de tus referidos directos durante sus primeros 30 días.

### Bono de Liderazgo
Al llegar a Manager, participas en el pool del 2% de las ventas globales de la compañía.

## 4. Glosario
- **PV**: Volumen de ventas personal.
- **GV**: Volumen de ventas de toda tu organización descendente.
- **Activo**: Usuario que ha realizado una compra de al menos 50 PV en los últimos 30 días.
`;
        setPlanContext(defaultContext);

        // Also try to fetch the real file if available in public or relative path (optional enhancement)
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            // Use the fetched context
            const answer = await chatWithContext(userMsg, planContext || "Context not loaded yet.");
            setMessages(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: "Lo siento, hubo un error al procesar tu pregunta." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* FLOATING ACTION BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${isOpen ? 'w-12 h-12 bg-gray-700 text-gray-400 rotate-90' : 'w-14 h-14 bg-gradient-to-r from-neon-cyan to-blue-600 text-black hover:scale-110'
                    }`}
            >
                <span className="material-symbols-outlined text-3xl">
                    {isOpen ? 'close' : 'smart_toy'}
                </span>
            </button>

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-96 h-[500px] bg-brand-dark border border-brand-panel-lighter rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-slide-up">
                    <header className="bg-brand-panel p-4 flex items-center gap-3 border-b border-brand-panel-lighter">
                        <div className="size-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                            <span className="material-symbols-outlined text-lg">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Asistente de Negocio</h3>
                            <p className="text-[10px] text-brand-text-muted">Desarrollado con Gemini AI</p>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-brand-panel-lighter">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-brand-panel text-gray-200 rounded-bl-none border border-brand-panel-lighter'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-brand-panel p-3 rounded-2xl rounded-bl-none border border-brand-panel-lighter flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-brand-panel-lighter bg-brand-panel/30">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Escribe tu pregunta..."
                                className="w-full bg-brand-dark border border-brand-panel-lighter rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-brand-cyan transition-colors"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1.5 p-1.5 bg-brand-cyan text-black rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompensationChatbot;

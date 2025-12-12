import React from 'react';
import type { ChatMessage as ChatMessageType, ImageInterpretationResult } from '../types';

interface ChatMessageProps {
    message: ChatMessageType;
    onLoadResult: (result: ImageInterpretationResult) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onLoadResult }) => {
    const isUser = message.user === 'user';
    const bubbleClasses = isUser
        ? 'bg-neon-cyan/80 text-black self-end'
        : 'bg-light-surface dark:bg-dark-surface self-start';
    
    const renderContent = () => {
        if (message.isLoading) {
            return (
                <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
            );
        }

        const result = message.interpretationResult;
        if (result && result.plays.length > 0) {
            return (
                <div className="space-y-3">
                    <p>{message.text || 'I have prepared these plays for you:'}</p>
                    
                    {(result.detectedDate || result.detectedTracks.length > 0) && (
                         <div className="text-xs p-2 bg-light-card/50 dark:bg-dark-card/50 rounded-md">
                            {result.detectedDate && <p><strong>Date:</strong> {result.detectedDate}</p>}
                            {result.detectedTracks.length > 0 && <p><strong>Tracks:</strong> {result.detectedTracks.join(', ')}</p>}
                        </div>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-light-card dark:bg-dark-card rounded-lg">
                        <table className="w-full text-xs">
                           <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400">
                                    <th className="p-1 font-semibold">Bet</th>
                                    <th className="p-1 font-semibold text-right">Str</th>
                                    <th className="p-1 font-semibold text-right">Box</th>
                                    <th className="p-1 font-semibold text-right">Com</th>
                                </tr>
                           </thead>
                           <tbody>
                            {result.plays.map((play, index) => (
                                <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                    <td className="p-1 font-mono">{play.betNumber}</td>
                                    <td className="p-1 font-mono text-right">${play.straightAmount?.toFixed(2) ?? '0.00'}</td>
                                    <td className="p-1 font-mono text-right">${play.boxAmount?.toFixed(2) ?? '0.00'}</td>
                                    <td className="p-1 font-mono text-right">${play.comboAmount?.toFixed(2) ?? '0.00'}</td>
                                </tr>
                            ))}
                           </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => onLoadResult(result)}
                            className="px-3 py-1 text-sm rounded-md bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
                        >
                            Load Results
                        </button>
                    </div>
                </div>
            );
        }
        
        return <p>{message.text}</p>;
    }

    return (
        <div className={`w-fit max-w-lg rounded-xl p-3 shadow-md ${bubbleClasses}`}>
            {renderContent()}
        </div>
    );
};

export default ChatMessage;
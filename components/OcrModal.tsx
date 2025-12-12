
import React, { useState, useCallback, DragEvent } from 'react';
import type { OcrResult, ImageInterpretationResult } from '../types';

interface OcrModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: ImageInterpretationResult) => void;
    interpretTicketImage: (base64Image: string) => Promise<ImageInterpretationResult>;
    fileToBase64: (file: File) => Promise<string>;
}

const OcrModal: React.FC<OcrModalProps> = ({ isOpen, onClose, onSuccess, interpretTicketImage, fileToBase64 }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<ImageInterpretationResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const resetState = () => {
        setFile(null);
        setPreview(null);
        setIsLoading(false);
        setError(null);
        setOcrResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
                setError("File is too large. Please use an image under 4MB.");
                return;
            }
            setError(null);
            setOcrResult(null);
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };
    
    const handleProcess = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setOcrResult(null);
        try {
            const base64String = await fileToBase64(file);
            const result = await interpretTicketImage(base64String);
            if(result && result.plays.length > 0) {
                 setOcrResult(result);
            } else {
                setError("AI could not detect any valid plays in the image. Please try a clearer picture.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during processing.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddResults = () => {
        if (ocrResult) {
            onSuccess(ocrResult);
            handleClose();
        }
    };

    const handleDragEvents = (e: DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={handleClose}>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neon-cyan">Scan Ticket with AI</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                       <svg data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {!file && (
                         <div 
                             onDragEnter={(e) => handleDragEvents(e, true)}
                             onDragLeave={(e) => handleDragEvents(e, false)}
                             onDragOver={(e) => e.preventDefault()}
                             onDrop={handleDrop}
                             className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragging ? 'border-neon-cyan bg-neon-cyan/10' : 'border-gray-300 dark:border-gray-600 hover:border-neon-cyan/50'}`}
                             onClick={() => document.getElementById('ocr-file-input')?.click()}
                         >
                            <svg data-lucide="upload-cloud" className="mx-auto w-12 h-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                            <p className="mt-2">Drag & Drop an image or click to select</p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 4MB</p>
                            <input id="ocr-file-input" type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] || null)} />
                        </div>
                    )}

                    {preview && (
                        <div className="text-center">
                            <img src={preview} alt="Ticket preview" className="max-h-60 mx-auto rounded-lg shadow-md" />
                            <button onClick={() => { setFile(null); setPreview(null); setOcrResult(null); }} className="mt-2 text-sm text-red-500 hover:underline">Clear Image</button>
                        </div>
                    )}

                    {isLoading && (
                         <div className="flex items-center justify-center space-x-2 p-4 bg-light-surface dark:bg-dark-surface rounded-lg">
                            <div className="w-5 h-5 bg-neon-cyan rounded-full animate-spinner-bounce"></div>
                            <div className="w-5 h-5 bg-neon-cyan rounded-full animate-spinner-bounce" style={{animationDelay: '-0.16s'}}></div>
                            <div className="w-5 h-5 bg-neon-cyan rounded-full animate-spinner-bounce" style={{animationDelay: '-0.32s'}}></div>
                            <span className="font-semibold">AI is analyzing your ticket...</span>
                         </div>
                    )}
                    
                    {error && <p className="text-center text-red-500 bg-red-500/10 p-3 rounded-lg">{error}</p>}
                    
                    {ocrResult && ocrResult.plays.length > 0 && (
                        <div>
                             <div className="text-sm space-y-1 mb-2 text-center bg-light-surface dark:bg-dark-surface p-2 rounded-lg">
                                {ocrResult.detectedDate && <p><strong>Date:</strong> {ocrResult.detectedDate}</p>}
                                {ocrResult.detectedTracks.length > 0 && <p><strong>Tracks:</strong> {ocrResult.detectedTracks.join(', ')}</p>}
                            </div>
                            <h3 className="font-bold mb-2">Detected Plays ({ocrResult.plays.length}):</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-light-surface dark:bg-dark-surface rounded-lg">
                                {ocrResult.plays.map((play, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-2 bg-light-card dark:bg-dark-card rounded">
                                        <span className="font-mono w-20"><strong>Bet:</strong> {play.betNumber}</span>
                                        <span className="font-mono w-20"><strong>Str:</strong> ${play.straightAmount?.toFixed(2) ?? '0.00'}</span>
                                        <span className="font-mono w-20"><strong>Box:</strong> ${play.boxAmount?.toFixed(2) ?? '0.00'}</span>
                                        <span className="font-mono w-20"><strong>Com:</strong> ${play.comboAmount?.toFixed(2) ?? '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    {ocrResult && ocrResult.plays.length > 0 ? (
                        <button onClick={handleAddResults} className="px-4 py-2 rounded-lg bg-neon-cyan text-black font-bold hover:opacity-90 transition-opacity">Add {ocrResult.plays.length} Plays</button>
                    ) : (
                        <button onClick={handleProcess} disabled={!file || isLoading} className="px-4 py-2 rounded-lg bg-neon-green text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                            {isLoading ? 'Processing...' : 'Process Image'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OcrModal;
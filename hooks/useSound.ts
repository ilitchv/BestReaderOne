
import { useState, useCallback, useEffect } from 'react';

type SoundType = 'click' | 'pop' | 'success' | 'error' | 'toggle' | 'add' | 'delete' | 'open' | 'warp' | 'mic_start' | 'mic_stop' | 'sent';

const LOCAL_STORAGE_KEY = 'beastReaderMute';
const EVENT_KEY = 'beastReaderMuteChange';

// Helper to get the current value from storage directly
const getMuteFromStorage = (): boolean => {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : false;
    } catch (e) {
        return false;
    }
};

export const useSound = () => {
    const [isMuted, setIsMuted] = useState<boolean>(getMuteFromStorage());

    // Sync state across all components using this hook
    useEffect(() => {
        const handleStorageChange = () => {
            setIsMuted(getMuteFromStorage());
        };

        // Listen for our custom event (intra-app sync)
        window.addEventListener(EVENT_KEY, handleStorageChange);
        // Also listen for storage events (tab-to-tab sync)
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener(EVENT_KEY, handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const toggleMute = useCallback(() => {
        const currentValue = getMuteFromStorage();
        const newValue = !currentValue;
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newValue));
        setIsMuted(newValue);
        
        // Dispatch custom event to notify other hook instances (e.g., TrackSelector)
        window.dispatchEvent(new Event(EVENT_KEY));
    }, []);

    const playSound = useCallback((type: SoundType) => {
        if (getMuteFromStorage()) return;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Helper to create an oscillator node chain
        const playTone = (
            freq: number, 
            wave: OscillatorType, 
            startTime: number, 
            duration: number, 
            vol: number = 0.1,
            slideFreq: number | null = null
        ) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = wave;
            osc.frequency.setValueAtTime(freq, startTime);
            if (slideFreq) {
                osc.frequency.exponentialRampToValueAtTime(slideFreq, startTime + duration);
            }

            gain.gain.setValueAtTime(vol, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        switch (type) {
            case 'click': // Soft "Bubble/Drop" sound - High elegance
                // Gentle sine sweep down, mimics fluid interface
                playTone(350, 'sine', now, 0.08, 0.1, 150); 
                break;
            
            case 'pop': // Soft UI interaction (Accordion open)
                playTone(600, 'sine', now, 0.1, 0.05, 300);
                break;

            case 'toggle': // Switch sound
                playTone(400, 'triangle', now, 0.05, 0.05);
                break;

            case 'add': // "Coin" / Power Up - Crisp and bright
                playTone(1200, 'sine', now, 0.1, 0.05);
                playTone(2400, 'sine', now + 0.05, 0.2, 0.05);
                break;

            case 'delete': // "Power Down" - Descending saw
                playTone(300, 'sawtooth', now, 0.2, 0.05, 50);
                playTone(100, 'square', now, 0.25, 0.03, 20);
                break;

            case 'open': // "Whoosh" - Airy and futuristic
                playTone(300, 'triangle', now, 0.3, 0.03, 800);
                playTone(400, 'sine', now + 0.05, 0.4, 0.02, 1200);
                break;

            case 'error': // Glitch Buzz
                playTone(150, 'sawtooth', now, 0.2, 0.1, 100);
                playTone(145, 'square', now + 0.05, 0.1, 0.1, 90);
                break;
                
            case 'success': // Simple Confirmation Chord
                playTone(523.25, 'sine', now, 0.3); // C5
                playTone(659.25, 'sine', now + 0.05, 0.3); // E5
                break;

            case 'mic_start': // High "Ding"
                playTone(880, 'sine', now, 0.15, 0.1); 
                playTone(1760, 'sine', now, 0.05, 0.1); // Harmonic
                break;

            case 'mic_stop': // Low "Dong"
                playTone(440, 'sine', now, 0.15, 0.1);
                break;

            case 'sent': // "Whoosh-Pop" (Message Sent)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15); // Sweep up
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'warp': // THE CELEBRATION - Innovative "Hyperdrive" Sound
                // 1. The Bass Swell (The Engine)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(110, now); // Low A
                osc1.frequency.exponentialRampToValueAtTime(880, now + 1.5); // Sweep up high
                gain1.gain.setValueAtTime(0, now);
                gain1.gain.linearRampToValueAtTime(0.3, now + 0.5);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
                
                // 2. The Shimmer (The Hologram) - Multiple detuned sines
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(440, now);
                osc2.frequency.linearRampToValueAtTime(880, now + 0.1); // Quick blip up
                gain2.gain.setValueAtTime(0.1, now);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

                // 3. The Sparkle (High frequency FM-ish sound)
                const osc3 = ctx.createOscillator();
                const gain3 = ctx.createGain();
                osc3.type = 'square';
                osc3.frequency.setValueAtTime(1200, now);
                osc3.frequency.exponentialRampToValueAtTime(50, now + 1.0); // Drop down
                gain3.gain.setValueAtTime(0.05, now);
                gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

                // Connections
                osc1.connect(gain1);
                osc2.connect(gain2);
                osc3.connect(gain3);
                gain1.connect(ctx.destination);
                gain2.connect(ctx.destination);
                gain3.connect(ctx.destination);

                // Start
                osc1.start(now);
                osc2.start(now);
                osc3.start(now);
                
                // Cleanup
                osc1.stop(now + 3);
                osc2.stop(now + 3);
                osc3.stop(now + 3);
                break;
        }
    }, []);

    return { isMuted, toggleMute, playSound };
};

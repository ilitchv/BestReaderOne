import { useEffect, useState } from 'react';

// Simple Fingerprint Generator
const getFingerprint = () => {
    if (typeof window === 'undefined') return 'server';
    let fp = localStorage.getItem('visitor_fp');
    if (!fp) {
        // Create a semi-persistent ID
        const raw = navigator.userAgent + (navigator.language || 'en') + new Date().getTimezoneOffset() + screen.width + screen.height;
        // Simple hash
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        fp = 'fp_' + Math.abs(hash).toString(36) + Math.random().toString(36).substr(2, 5);
        localStorage.setItem('visitor_fp', fp);
    }
    return fp;
};

// Adapted for manual routing (no react-router)
export const useAnalytics = (currentPath: string = 'unknown') => {
    const [fingerprint, setFingerprint] = useState<string>('');
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Init
    useEffect(() => {
        const fp = getFingerprint();
        setFingerprint(fp);

        const initSession = async () => {
            try {
                const payload = {
                    fingerprint: fp,
                    referrer: document.referrer,
                    entryPage: window.location.pathname,
                    language: navigator.language,
                    userAgent: navigator.userAgent,
                    screenResolution: `${window.screen.width}x${window.screen.height}`
                };

                // Use relative path assuming proxied in Vite or same domain
                // Ideally this should be an env var
                const API_URL = import.meta.env.VITE_API_URL || '';

                const res = await fetch(`${API_URL}/api/track/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    setSessionId(data.sessionId);
                    localStorage.setItem('current_session_id', data.sessionId);
                }
            } catch (e) {
                console.error("Analytics Init Failed", e);
            }
        };

        if (!sessionId) initSession();
    }, []);

    // Route Tracking
    useEffect(() => {
        if (!sessionId) return;

        // Log Page View
        const update = async () => {
            const API_URL = import.meta.env.VITE_API_URL || '';
            await fetch(`${API_URL}/api/track/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint,
                    sessionId,
                    path: currentPath // Use prop
                })
            });
        };

        update();
    }, [currentPath, sessionId]);

    // Heartbeat (30s)
    useEffect(() => {
        if (!sessionId) return;

        const interval = setInterval(async () => {
            const API_URL = import.meta.env.VITE_API_URL || '';
            try {
                await fetch(`${API_URL}/api/track/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fingerprint,
                        sessionId
                        // Just a ping, no path change
                    })
                });
            } catch (e) {/* silent */ }
        }, 30000);

        return () => clearInterval(interval);
    }, [sessionId]);

    // Click Tracking (Global Delegation)
    useEffect(() => {
        if (!sessionId) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Look for data-track attribute or important buttons
            const trackable = target.closest('[data-track]') || target.closest('button') || target.closest('a');

            if (trackable) {
                const label = trackable.getAttribute('data-track') || trackable.innerText || trackable.id || 'unknown-element';
                const actionType = 'CLICK';

                const API_URL = import.meta.env.VITE_API_URL || '';
                // Fire and forget
                fetch(`${API_URL}/api/track/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fingerprint,
                        sessionId,
                        action: { type: actionType, target: label }
                    })
                }).catch(() => { });
            }
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [sessionId]);

    return { sessionId, fingerprint };
};

import React, { useEffect, useRef } from 'react';

export const Confetti: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: any[] = [];
        const particleCount = 200;
        // Vibrant Casino Colors
        const colors = ['#3B82F6', '#8B5CF6', '#F97316', '#EC4899', '#EAB308', '#FFFFFF'];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                w: Math.random() * 10 + 5,
                h: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() * 12) - 6,
                vy: (Math.random() * 12) - 12, // Shoot up forcefully
                gravity: 0.25,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() * 10) - 5,
                drag: 0.96 // Slow down horizontally
            });
        }

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= p.drag; // Air resistance
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();

                // Remove off-screen particles
                if (p.y > canvas.height) {
                    particles.splice(index, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();

    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[100]"
        />
    );
};

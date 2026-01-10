import React, { useEffect, useState } from 'react';

export const DirectorFX: React.FC = () => {
    const [isWipeout, setIsWipeout] = useState(false);
    const [droplets, setDroplets] = useState<{ id: number, left: string, top: string, size: number, duration: number }[]>([]);

    // 1. RIPPLE CLICKS (Existing)
    useEffect(() => {
        const createRipple = (e: MouseEvent) => {
            const ripple = document.createElement('div');
            ripple.className = 'ripple pointer-events-none';
            const size = 50;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - size/2}px`;
            ripple.style.top = `${e.clientY - size/2}px`;
            document.body.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        };

        window.addEventListener('click', createRipple);
        return () => window.removeEventListener('click', createRipple);
    }, []);

    // 3. WIPEOUT DETECTION (Enhanced Shake)
    useEffect(() => {
        let lastX = 0;
        let lastY = 0;
        let reversalCount = 0;
        let lastDirX = 0;
        let resetTimer: any;
        let isCooldown = false;

        const handleMove = (e: MouseEvent) => {
            if (isCooldown || isWipeout) return;

            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            const velocity = Math.sqrt(dx * dx + dy * dy);
            const dirX = Math.sign(dx);

            // Trigger Condition: High velocity AND direction reversal (shake)
            // Velocity threshold 60 is quite fast "flick"
            if (velocity > 60 && dirX !== lastDirX && dirX !== 0) {
                reversalCount++;
                
                // If shaken back and forth 4 times quickly
                if (reversalCount > 4) {
                    triggerWipeout();
                    reversalCount = 0;
                    isCooldown = true;
                    setTimeout(() => isCooldown = false, 4000); // 4s cooldown
                }
            }

            lastX = e.clientX;
            lastY = e.clientY;
            lastDirX = dirX;

            // Reset shake counter if movement stops/slows
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                reversalCount = 0;
            }, 150);
        };

        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [isWipeout]);

    const triggerWipeout = () => {
        setIsWipeout(true);
        // Sound removed as requested

        // Generate Water Droplets
        const count = 15 + Math.floor(Math.random() * 10);
        const newDroplets = Array.from({ length: count }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + '%',
            top: Math.random() * 50 + '%', // Start mostly in top half
            size: 8 + Math.random() * 20, // 8px to 28px
            duration: 1.5 + Math.random() * 2 // 1.5s to 3.5s
        }));
        setDroplets(newDroplets);

        // Add shake class to body
        document.body.classList.add('wipeout-shake');

        // Cleanup shake
        setTimeout(() => {
            document.body.classList.remove('wipeout-shake');
        }, 600);

        // Reset state
        setTimeout(() => {
            setIsWipeout(false);
            setDroplets([]);
        }, 3000);
    };

    // 4. THE GOLDEN HOUR (Time Based Styling) - Existing
    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            if (hour >= 16) {
                document.documentElement.classList.add('golden-hour');
            } else {
                document.documentElement.classList.remove('golden-hour');
            }
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {isWipeout && (
                <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden font-sans">
                    {/* 1. Flash Overlay (Instant white/cyan flash) */}
                    <div className="splash-flash"></div>
                    
                    {/* 2. Underwater Blur Overlay (Persistent for 3s) */}
                    <div className="underwater-overlay"></div>

                    {/* 3. Sliding Droplets */}
                    {droplets.map(d => (
                        <div 
                            key={d.id}
                            className="water-droplet"
                            style={{
                                left: d.left,
                                top: d.top,
                                width: `${d.size/2}px`,
                                height: `${d.size}px`,
                                '--duration': `${d.duration}s`
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            )}
        </>
    );
};
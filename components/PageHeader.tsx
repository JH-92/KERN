
import React, { useState, useEffect, useRef } from 'react';
import { Compass } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const WindCompass: React.FC = () => {
    const [rotation, setRotation] = useState(0);
    const targetRotation = useRef(0);
    const currentRotation = useRef(0);
    const lastMouse = useRef({ x: 0, y: 0 });
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const frameRef = useRef<number | null>(null);

    // Calculate shortest distance between two angles for smooth rotation
    const getShortestAngleDiff = (current: number, target: number) => {
        return ((target - current + 540) % 360) - 180;
    };

    useEffect(() => {
        const animate = () => {
            // Physics: Damping / Linear Interpolation (Lerp)
            const diff = getShortestAngleDiff(currentRotation.current, targetRotation.current);
            
            // "Heavy" fluid feel: low lerp factor (0.08)
            if (Math.abs(diff) > 0.1) {
                currentRotation.current += diff * 0.08;
            } else {
                currentRotation.current = targetRotation.current;
            }
            
            setRotation(currentRotation.current);
            frameRef.current = requestAnimationFrame(animate);
        };
        
        frameRef.current = requestAnimationFrame(animate);

        const handleMove = (e: MouseEvent) => {
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            const dist = Math.hypot(dx, dy);

            // Only update direction if movement is significant (noise reduction)
            if (dist > 1.5) {
                // Calculate angle: +90 offset to align North with Up (Screen Y is down)
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                targetRotation.current = angle;
                
                // Reset idle timer
                if (idleTimer.current) clearTimeout(idleTimer.current);
                // Return to North (0) after idle
                idleTimer.current = setTimeout(() => {
                    targetRotation.current = 0; 
                }, 1500); 
            }
            
            lastMouse.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('mousemove', handleMove);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (idleTimer.current) clearTimeout(idleTimer.current);
        };
    }, []);

    return (
        <div className="hidden md:flex flex-col items-center gap-1.5 mr-6 animate-in fade-in duration-700">
            {/* Compass Container */}
            <div className="relative w-14 h-14 bg-white/80 backdrop-blur-md rounded-full border-2 border-white shadow-[0_4px_20px_-4px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/30 flex items-center justify-center overflow-hidden transition-all hover:scale-105 hover:ring-cyan-400/60">
                 
                 {/* Glass Reflection/Sheen */}
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 to-transparent pointer-events-none z-20"></div>

                 {/* Cardinal Directions */}
                 <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-400 select-none pointer-events-none z-0">
                    <span className="absolute top-1.5">N</span>
                    <span className="absolute bottom-1.5 text-[8px] opacity-60">S</span>
                    <span className="absolute left-2 text-[8px] opacity-60">W</span>
                    <span className="absolute right-2 text-[8px] opacity-60">E</span>
                 </div>

                 {/* Rotating Assembly */}
                 <div 
                    className="w-full h-full absolute inset-0 will-change-transform z-10"
                    style={{ transform: `rotate(${rotation}deg)` }}
                 >
                     {/* The Needle */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
                        {/* North Tip (Cyan) */}
                        <div className="absolute -top-1 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[24px] border-b-cyan-500 drop-shadow-sm filter"></div>
                        
                        {/* South Tip (Dark Slate) */}
                        <div className="absolute -bottom-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[20px] border-t-slate-700 opacity-90"></div>
                        
                        {/* Center Cap */}
                        <div className="w-2 h-2 bg-white rounded-full border-2 border-slate-200 shadow-sm z-20"></div>
                     </div>
                 </div>
            </div>
            
            {/* Label */}
            <div className="text-[9px] font-black text-cyan-600/80 uppercase tracking-widest bg-cyan-50/80 px-2 py-0.5 rounded-full border border-cyan-100/50 backdrop-blur-sm">
                Wind Dir
            </div>
        </div>
    );
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  const isDirectorMode = document.documentElement.classList.contains('director-mode');

  return (
    <header className="mb-10 border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-slate-500 mt-3 text-lg font-medium">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {isDirectorMode && <WindCompass />}
        {children}
      </div>
    </header>
  );
};

export default PageHeader;

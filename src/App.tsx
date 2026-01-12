import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import NewMeetingPage from './pages/NewMeeting';
import ActionListPage from './pages/ActionList';
import ArchivePage from './pages/Archive';
import DashboardPage from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import AnimatedBackground from './components/AnimatedBackground';
import { Sidebar } from './components/Sidebar';
import { db } from './db';
import { DirectorFX } from './components/DirectorFX';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// --- VISUAL FX COMPONENTS ---
const OceanLayer: React.FC = () => {
    const [isGoldenHour, setIsGoldenHour] = useState(false);
    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            setIsGoldenHour(hour >= 16);
        };
        checkTime();
    }, []);

    return (
        <div className={`absolute inset-0 overflow-hidden transition-colors duration-[2000ms] ${isGoldenHour ? 'bg-gradient-to-b from-orange-50/50 via-orange-100/30 to-amber-200/20' : 'bg-gradient-to-b from-cyan-50/50 via-cyan-100/30 to-blue-200/20'}`}>
            <div className={`absolute bottom-0 left-0 w-[200%] h-64 flex animate-wave opacity-60 transition-colors duration-[2000ms] ${isGoldenHour ? 'text-amber-300' : 'text-cyan-200'}`}>
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-1/2 h-full fill-current">
                    <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" transform="scale(1, -1) translate(0, -120)"></path>
                    <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" transform="scale(1, -1) translate(0, -120)"></path>
                    <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" transform="scale(1, -1) translate(0, -120)"></path>
                </svg>
            </div>
        </div>
    );
};

const DropletTrail: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const particles: any[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const handleMove = (e: MouseEvent) => {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) {
                const steps = Math.min(8, Math.floor(dist / 4));
                for(let i=0; i<steps; i++) {
                     const x = lastPos.current.x + (dx * (i/steps));
                     const y = lastPos.current.y + (dy * (i/steps));
                     if(Math.random() > 0.3) {
                        particles.push({
                            x, y,
                            size: Math.random() * 3 + 2,
                            life: 0,
                            maxLife: 30 + Math.random() * 20,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: Math.random() * 1.5
                        });
                     }
                }
                lastPos.current = { x: e.clientX, y: e.clientY };
            }
        };
        
        const updateLastPos = (e: MouseEvent) => {
            lastPos.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseenter', updateLastPos);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life++;
                p.vy += 0.15;
                p.x += p.vx;
                p.y += p.vy;
                const opacity = Math.max(0, 1 - (p.life / p.maxLife));
                ctx.fillStyle = `rgba(6, 182, 212, ${opacity * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                if (p.life >= p.maxLife) particles.splice(i, 1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseenter', updateLastPos);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

const App: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('kern_sidebar_collapsed') === 'true' : false;
  });

  const [isDirectorMode, setIsDirectorMode] = useState(() => {
      return document.documentElement.classList.contains('director-mode');
  });

  useEffect(() => {
    localStorage.setItem('kern_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'class') {
                  setIsDirectorMode(document.documentElement.classList.contains('director-mode'));
              }
          });
      });
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sessionId = db.getSessionId();
    db.sendHeartbeat(sessionId);
    const interval = setInterval(() => db.sendHeartbeat(sessionId), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <HashRouter>
      <ScrollToTop />
      
      <div className="fixed inset-0 z-0 pointer-events-none select-none fx-layer">
          {isDirectorMode && <DirectorFX />}
          {isDirectorMode ? <OceanLayer /> : <AnimatedBackground />}
          {isDirectorMode && <DropletTrail />}
      </div>
      
      <div className={`flex min-h-screen relative z-10 overflow-x-hidden ${isDirectorMode ? 'bg-transparent' : 'bg-slate-50/60'}`}>
        
        <div className="z-50 relative">
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            />
        </div>

        <main 
          className={`flex-1 transition-all duration-300 ease-in-out relative z-10 ${
            isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          }`}
        >
          <div className="w-full max-w-7xl mx-auto px-8 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700 relative interactive-zone min-h-[calc(100vh-5rem)] flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<NewMeetingPage />} />
                <Route path="/actielijst" element={<ActionListPage />} />
                <Route path="/archief" element={<ArchivePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/instellingen" element={<SettingsPage />} />
              </Routes>
            </div>
            
            <footer className="mt-20 pb-4 text-center pointer-events-none select-none opacity-50">
                <div className="inline-flex flex-col items-center gap-4">
                    <div className="w-16 h-px bg-slate-300/60 rounded-full"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-relaxed">
                        KERN: Koers <span className="opacity-40 mx-1">•</span> Efficiëntie <span className="opacity-40 mx-1">•</span> Resultaat <span className="opacity-40 mx-1">•</span> Nazorg
                    </p>
                </div>
            </footer>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
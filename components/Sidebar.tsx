import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, ListTodo, Archive, LayoutDashboard, Settings, Menu, X, ShieldCheck, ChevronLeft, ChevronRight, Activity, Hourglass, Users, Zap, Wind, Navigation, HelpCircle } from 'lucide-react';
import { KernLogo } from './KernLogo';
import { HelpModal } from './HelpModal';
import { db } from '../db';
import { ActionStatus, VotingState } from '../types';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

// Simple Sound Synth
const playBlip = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        // Audio disabled
    }
};

// --- DIRECTOR COMPASS WIDGET ---
const DirectorCompass: React.FC = () => {
    const [rotation, setRotation] = useState(0);
    const [knots, setKnots] = useState(14);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const animate = () => {
            const now = Date.now();
            // Synced Angle Logic: Time-based rotation to ensure all tabs show same direction
            // Base wind direction from North-West (315 deg) with slow oscillation
            const baseDir = 315;
            const sway = Math.sin(now / 3000) * 20; // +/- 20 degrees sway
            const jitter = Math.sin(now / 200) * 1.5; // Micro jitter
            
            setRotation(baseDir + sway + jitter);
            
            // Wind speed oscillation
            const kts = 14 + Math.sin(now / 1500) * 3;
            setKnots(kts);

            frameRef.current = requestAnimationFrame(animate);
        };
        
        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return (
        <div className="mb-4 flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm group hover:border-emerald-200 transition-colors">
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Wind Dir</span>
                <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest shadow-inner inline-block text-center w-16">
                   {knots.toFixed(0)} KT
               </div>
            </div>
            
            <div className="relative w-12 h-12 bg-slate-50 rounded-full border-2 border-slate-100 shadow-inner flex items-center justify-center overflow-hidden">
                 {/* Cardinals */}
                 <div className="absolute inset-0 flex flex-col justify-between items-center py-0.5 text-[6px] font-black text-slate-300 pointer-events-none">
                    <span>N</span>
                    <span>S</span>
                 </div>
                 <div className="absolute inset-0 flex flex-row justify-between items-center px-0.5 text-[6px] font-black text-slate-300 pointer-events-none">
                    <span>W</span>
                    <span>E</span>
                 </div>

                 {/* Needle */}
                 <div 
                    className="w-full h-full absolute inset-0 will-change-transform"
                    style={{ transform: `rotate(${rotation}deg)` }}
                 >
                     <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[16px] border-b-emerald-500 filter drop-shadow-sm"></div>
                     <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[16px] border-t-slate-300 opacity-80"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full border border-slate-200 z-10 shadow-sm"></div>
                 </div>
            </div>
        </div>
    );
};

// --- DIRECTOR FLIGHT DECK WIDGET (SLOW-TIDE EDITION) ---
const DirectorFlightDeck: React.FC = () => {
    // Visual State
    const [balance, setBalance] = useState(50); // 0 to 100
    const [windSpeed, setWindSpeed] = useState(12);
    const [deviation, setDeviation] = useState(0);
    const [isHoveringState, setIsHoveringState] = useState(false); // For UI feedback
    
    // Physics Refs
    const currentOffsetRef = useRef(0);
    const timeRef = useRef(0);
    const frameRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const animate = () => {
            // Slow time increment for "breathing" motion
            timeRef.current += 0.008; 

            // Calculate Wind Speed (Amplitude) - Slowly varies between 8 and 16 KT
            const currentWind = 12 + Math.sin(timeRef.current * 0.3) * 4;
            setWindSpeed(currentWind);

            // Target Offset calculation
            // Sine wave oscillation based on time
            // Amplitude scaled by wind: higher wind = wider swing
            // Range approx +/- 15%
            let targetOffset = Math.sin(timeRef.current) * (currentWind * 1.2);

            // Interaction Override: Hover fixes to center
            if (isHoveringState) {
                targetOffset = 0;
            }

            // Smooth Interpolation (Lerp)
            // If hovering, snap faster (0.1), otherwise drift slowly (0.02)
            const lerpFactor = isHoveringState ? 0.1 : 0.02;
            currentOffsetRef.current += (targetOffset - currentOffsetRef.current) * lerpFactor;

            // Update State
            setBalance(50 + currentOffsetRef.current);
            setDeviation(Math.abs(currentOffsetRef.current * 0.4)); // Map offset to "degrees"

            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isHoveringState]);

    return (
        <div 
            className="mb-4 bg-cyan-50/60 backdrop-blur-md border border-cyan-100 rounded-2xl p-5 shadow-sm flex flex-col w-full relative overflow-hidden group transition-all"
            onMouseEnter={() => setIsHoveringState(true)}
            onMouseLeave={() => setIsHoveringState(false)}
        >
            {/* Subtle flow background */}
             <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(6,182,212,0.03),transparent)] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }}></div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-black uppercase text-cyan-700 tracking-widest flex items-center gap-1.5">
                    <Activity size={12} /> Foil Balance
                </span>
                <div className="flex items-center gap-2">
                     <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isHoveringState ? 'text-cyan-600' : 'text-slate-400'}`}>
                        {isHoveringState ? 'STABILIZED' : 'AUTO-FLOW'}
                     </span>
                     <span className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
                         isHoveringState 
                         ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-125' 
                         : 'bg-emerald-400/50'
                     }`}></span>
                </div>
            </div>
            
            {/* The Gauge */}
            <div className="w-full relative z-10 py-2" ref={containerRef}>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1 px-1 opacity-70">
                    <span>PORT</span>
                    <span>STBD</span>
                </div>
                {/* Gauge Track */}
                <div className="w-full h-2 bg-slate-200/50 rounded-full relative shadow-inner overflow-hidden border border-white/50">
                    {/* Center marker */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-cyan-900/10 -ml-px z-0"></div>
                    
                    {/* Gradient Flow Bar - Visualizing the "current" */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent opacity-50"></div>

                    {/* Indicator */}
                    <div 
                        className={`absolute top-0 bottom-0 w-1.5 bg-cyan-500 rounded-full transition-all duration-75 ease-out -ml-0.5 z-10 ${
                            isHoveringState ? 'shadow-[0_0_12px_rgba(6,182,212,0.8)] bg-cyan-400' : 'shadow-[0_0_4px_rgba(6,182,212,0.3)]'
                        }`}
                        style={{ left: `${balance}%` }}
                    />
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-cyan-100/50 relative z-10">
                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1 transition-colors duration-500">
                    <Navigation size={10} /> Deviation
                </span>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                    <div className={`flex items-center gap-1 font-bold transition-colors text-slate-500`}>
                        <span className="tabular-nums">{deviation.toFixed(1)}°</span>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-600 font-bold opacity-80">
                        <Wind size={10} />
                        <span className="tabular-nums">{windSpeed.toFixed(0)} KT</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Stats
  const [votingState, setVotingState] = useState<VotingState>({ isActive: false, topic: '', votes: [], startTime: 0 });
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const loadData = () => {
    // Determine Director Mode status FIRST
    const directorActive = document.documentElement.classList.contains('director-mode');
    setIsDirectorMode(directorActive);

    setVotingState(db.getVotingState());
    setActiveUserCount(db.getActiveUserCount());
    setIsTimerRunning(db.getTimerState().isRunning);
  };

  useEffect(() => {
    loadData();
    
    // Check Director Mode dynamically
    const observer = new MutationObserver(() => {
        loadData();
    });
    observer.observe(document.documentElement, { attributes: true });

    const handleSync = () => {
      setIsPulsing(true);
      loadData();
      setTimeout(() => setIsPulsing(false), 2000); 
    };

    window.addEventListener('kern-data-update', handleSync);

    return () => {
      observer.disconnect();
      window.removeEventListener('kern-data-update', handleSync);
    };
  }, []);

  const handleNavClick = () => {
      setIsMobileOpen(false);
      if (isDirectorMode) playBlip();
  };

  const menuItems = [
    { path: '/', label: 'Nieuwe vergadering', icon: <PlusCircle size={22} />, id: 'nav-new-meeting' },
    { path: '/actielijst', label: 'Actielijst', icon: <ListTodo size={22} />, id: 'nav-action-list' },
    { path: '/archief', label: 'Archief & historie', icon: <Archive size={22} />, id: 'nav-archive' },
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} />, id: 'nav-dashboard' },
    { path: '/instellingen', label: 'Instellingen', icon: <Settings size={22} />, id: 'nav-settings' },
  ];

  const activeIndex = menuItems.findIndex(item => item.path === location.pathname);

  const NavLink: React.FC<{ item: typeof menuItems[0] }> = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        id={item.id}
        to={item.path}
        onClick={handleNavClick}
        className={`flex items-center py-4 rounded-2xl transition-all h-14 relative z-10 group whitespace-nowrap overflow-hidden ${
          isActive 
            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 active-nav-item' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        } ${isCollapsed ? 'justify-center px-0 gap-0' : 'px-5 gap-3'}`}
        title={isCollapsed ? item.label : ''}
      >
        <span className={`shrink-0 flex items-center justify-center transition-colors duration-300 ${isActive ? 'text-emerald-400' : ''}`}>
          {item.icon}
        </span>
        <span 
          className={`font-bold text-sm tracking-wide transition-all duration-300 origin-left ${
            isCollapsed ? 'opacity-0 w-0 scale-x-0' : 'opacity-100 w-auto scale-x-100'
          }`}
        >
          {item.label}
        </span>
        
        {/* Global Timer Indicator */}
        {item.path === '/' && isTimerRunning && (
            <div className={`absolute right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm ${isCollapsed ? 'hidden' : ''}`} title="Vergadering bezig"></div>
        )}
      </Link>
    );
  };

  return (
    <>
      <style>{`
        @keyframes vibrate {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }
        .animate-vibrate {
            animation: vibrate 0.3s linear infinite;
        }
      `}</style>
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-6 right-6 z-[60] p-4 bg-slate-900 text-white rounded-full shadow-2xl transition-all duration-300`}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <button
        onClick={toggleCollapse}
        className={`hidden lg:flex fixed z-[60] top-10 items-center justify-center w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-300 ease-in-out ${
           isCollapsed ? 'left-[3.5rem]' : 'left-[14.5rem]'
        }`}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Main Sidebar Container - Fixed z-index 50, solid white bg */}
      <div 
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-100 transform transition-all duration-300 ease-in-out z-50
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          flex flex-col overflow-hidden shadow-sm
        `}
      >
        {/* LOGO SECTION: CENTERED */}
        <div className={`p-8 transition-all duration-300 flex flex-col items-center relative z-10 ${isCollapsed ? 'px-0' : ''}`}>
          <div className="flex items-center gap-4 mb-2 justify-center">
            <KernLogo size={isCollapsed ? 32 : 42} className="text-emerald-600 transition-all duration-300" />
            <h1 
              className={`text-3xl font-black text-slate-900 tracking-tighter leading-none transition-all duration-300 origin-left ${
                isCollapsed ? 'opacity-0 w-0 scale-0 hidden' : 'opacity-100 w-auto scale-100'
              }`}
            >
              KERN
            </h1>
          </div>
          <p 
            className={`text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-60 whitespace-nowrap transition-all duration-300 text-center ${
              isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-60 h-auto'
            }`}
          >
            De essentie van overleg
          </p>
        </div>
        
        {/* NAVIGATION ITEMS */}
        <nav className="px-4 space-y-2 mt-2 relative flex-1 z-10">
          {!isCollapsed && activeIndex !== -1 && (
             <div 
               className="absolute left-0 w-1.5 h-10 bg-emerald-500 rounded-r-full transition-all duration-300 ease-in-out"
               style={{ top: `calc(${activeIndex} * (3.5rem + 0.5rem) + 0.5rem)` }}
             />
          )}

          {menuItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* FOOTER WIDGETS */}
        <div className="p-4 transition-all duration-300 space-y-4 relative z-10">
          <div className={`transition-all duration-300 w-full ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
             
             {/* WIDGET AREA: Director Flight Deck & Compass */}
             {isDirectorMode && (
                 <>
                    <DirectorCompass />
                    <DirectorFlightDeck />
                 </>
             )}
             
             {votingState.isActive && (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 px-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">
                        Stemming bezig... ({votingState.votes.length})
                    </span>
                 </div>
             )}
          </div>

          <div className={`bg-slate-50 rounded-3xl flex flex-col gap-3 transition-all duration-300 w-full ${
            isCollapsed ? 'p-3 items-center justify-center' : 'p-5'
          }`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
               <div className="relative shrink-0">
                  <ShieldCheck size={24} className="text-emerald-500 relative z-10" />
                  <div className={`absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full z-20 transition-all duration-300 ${isPulsing ? 'animate-ping' : ''}`}></div>
                  <div className={`absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full z-20`}></div>
               </div>
               <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Systeemstatus</p>
                 <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-slate-900 uppercase whitespace-nowrap">Operationeel</p>
                 </div>
               </div>
            </div>

            <div className={`flex items-center gap-3 pt-3 border-t border-slate-200/50 ${isCollapsed ? 'justify-center border-t-0 pt-0' : ''}`}>
               <div className="relative shrink-0 text-slate-400">
                  <Users size={20} />
               </div>
               <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                 <p className="text-xs font-black text-slate-700 uppercase whitespace-nowrap animate-in fade-in duration-500">
                    {activeUserCount} {activeUserCount === 1 ? 'Gebruiker' : 'Gebruikers'} online
                 </p>
               </div>
            </div>
            
            {!isCollapsed && (
                <div className="space-y-2 mt-1 pt-3 border-t border-slate-200/50">
                    <p className="text-[9px] font-bold text-slate-400 truncate" title={db.getCurrentWorkspace()}>
                        Sessie: {db.getCurrentWorkspace()}
                    </p>
                     <button 
                        onClick={() => setIsHelpOpen(true)}
                        className="w-full text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 group"
                    >
                        <HelpCircle size={14} className="group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Handleiding</span>
                    </button>
                </div>
            )}

            {isCollapsed && (
                <button 
                  onClick={() => setIsHelpOpen(true)}
                  className="mt-2 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="Handleiding"
                >
                   <HelpCircle size={18} />
                </button>
            )}

            {!isCollapsed && isDirectorMode && (
                <p className="text-[8px] font-black uppercase text-emerald-500/50 text-center w-full pt-2 border-t border-emerald-500/10 opacity-40">
                    Director mode actief
                </p>
            )}
          </div>
        </div>
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, ListTodo, Archive, LayoutDashboard, Settings, Menu, X, ShieldCheck, ChevronLeft, ChevronRight, Activity, Hourglass, Users, Zap, Wind } from 'lucide-react';
import { KernLogo } from './KernLogo';
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

const WindSpeedMeter: React.FC = () => {
    const [speed, setSpeed] = useState(0);
    const lastPos = useRef({ x: 0, y: 0 });
    const lastTime = useRef(Date.now());

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            const now = Date.now();
            const dt = now - lastTime.current;
            if (dt > 100) {
                const dx = e.clientX - lastPos.current.x;
                const dy = e.clientY - lastPos.current.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Fake mapping to Knots
                setSpeed(Math.min(45, Math.floor(dist / 5)));
                lastPos.current = { x: e.clientX, y: e.clientY };
                lastTime.current = now;
            }
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cyan-100">
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Wind Speed</span>
            <div className="flex items-center gap-2 font-mono text-cyan-600 text-xs">
                <Wind size={12} className="opacity-80" />
                <span className="font-bold tabular-nums">{speed} KTS</span>
            </div>
        </div>
    );
};

const FoilBalanceMeter: React.FC = () => {
    const [balance, setBalance] = useState(50); // 0 to 100

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            const width = window.innerWidth;
            const pct = Math.max(0, Math.min(100, (e.clientX / width) * 100));
            setBalance(pct);
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div className="w-full py-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-2 px-1">
                <span>PORT</span>
                <span>STBD</span>
            </div>
            {/* Gauge Track */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full relative shadow-inner">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 -ml-px z-0"></div>
                
                {/* Indicator */}
                <div 
                    className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-cyan-500 rounded-full border border-white shadow-sm transition-all duration-300 ease-out -ml-1.5 z-10"
                    style={{ left: `${balance}%` }}
                />
            </div>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isDirectorMode, setIsDirectorMode] = useState(false);

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
             
             {/* WIDGET AREA: Show ONLY Foil Balance if Director Mode. Otherwise show NOTHING. */}
             {isDirectorMode && (
                 <div className="mb-4 bg-cyan-50/60 backdrop-blur-md border border-cyan-100 rounded-2xl p-5 shadow-sm flex flex-col w-full relative overflow-hidden group">
                    {/* Subtle grid effect background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-[10px] font-black uppercase text-cyan-700 tracking-widest flex items-center gap-1.5">
                           <Activity size={12} /> Foil Balance
                        </span>
                        <div className="flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                        </div>
                    </div>
                    
                    <div className="w-full relative z-10">
                        <FoilBalanceMeter />
                        <WindSpeedMeter />
                    </div>
                 </div>
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
                <p className="text-[9px] font-bold text-slate-400 mt-1 truncate max-w-[180px]" title={db.getCurrentWorkspace()}>
                    Sessie: {db.getCurrentWorkspace()}
                </p>
            )}

            {!isCollapsed && isDirectorMode && (
                <p className="text-[8px] font-black uppercase text-emerald-500/50 text-center w-full pt-2 border-t border-emerald-500/10 opacity-40">
                    Director mode actief
                </p>
            )}
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};
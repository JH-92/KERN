import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, ListTodo, Archive, LayoutDashboard, Settings, Menu, X, ShieldCheck, ChevronLeft, ChevronRight, Activity, Users, Wind, Navigation, HelpCircle, Radio } from 'lucide-react';
import { KernLogo } from './KernLogo';
import { HelpModal } from './HelpModal';
import { db } from '../db';
import { VotingState } from '../types';

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

const formatMiniTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// --- COUPLED NAUTICAL DASHBOARD ---
// Combines Compass and Flight Deck to share physics state
const NauticalDashboard: React.FC = () => {
    // 1. RANDOMIZED TARGETS (Generated once on mount)
    // Simulates different weather conditions every time Director Mode is engaged
    const targetConfig = useRef({
        dir: Math.floor(Math.random() * 360),      // 0 - 360 degrees
        speed: 8 + (Math.random() * 10)             // 8 - 18 Knots range
    });

    // Display State
    const [windDir, setWindDir] = useState(0);      // Starts at N (Calibration)
    const [windSpeed, setWindSpeed] = useState(0);  // Starts at 0 (Calibration)
    
    // Foil State
    const [balance, setBalance] = useState(50);     // 0-100%
    const [deviation, setDeviation] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    
    // Visual Feedback States
    const [isGusting, setIsGusting] = useState(false);

    // Refs for animation physics (Current actual values moving towards targets)
    const animState = useRef({
        baseDir: 0,
        baseSpeed: 0,
        currentOffset: 0
    });
    
    const frameRef = useRef<number | null>(null);
    const lastWindDirRef = useRef(0);

    useEffect(() => {
        const animate = () => {
            const now = Date.now();

            // 2. CALIBRATION SWEEP (Smoothly approach random targets)
            // Lerp factor 0.03 gives a nice ~1.5s "spin up" effect
            animState.current.baseDir += (targetConfig.current.dir - animState.current.baseDir) * 0.03;
            animState.current.baseSpeed += (targetConfig.current.speed - animState.current.baseSpeed) * 0.03;

            // 3. DYNAMIC WEATHER GENERATION (Oscillations around base)
            const speedFluctuation = Math.sin(now / 3000) * 1.8; // Slow sway
            const speedGust = Math.sin(now / 400) * 0.4; // Fast flutter
            const currentSpeed = animState.current.baseSpeed + speedFluctuation + speedGust;

            const dirSway = Math.sin(now / 5000) * 20; // +/- 20 deg sway
            const dirJitter = Math.sin(now / 200) * 2; // Micro jitter
            const currentDir = animState.current.baseDir + dirSway + dirJitter;

            // Detect Sudden Shifts for LED Blink
            if (Math.abs(currentDir - lastWindDirRef.current) > 0.3) {
                setIsGusting(true);
            } else {
                if (Math.random() > 0.95) setIsGusting(false); 
            }
            lastWindDirRef.current = currentDir;

            setWindDir(currentDir);
            setWindSpeed(Math.max(0, currentSpeed));

            // 4. PHYSICS COUPLING (Foil reacts to Wind Direction)
            // Calculate lateral force based on wind angle relative to "Bow" (0/360)
            // Wind from East (90) pushes Left (Port). Wind from West (270) pushes Right (Stbd).
            const rad = (currentDir * Math.PI) / 180;
            const lateralForce = -Math.sin(rad); 
            
            // Jitter increases with wind speed
            const stabilityNoise = (Math.random() - 0.5) * (currentSpeed / 8);
            
            // Calculate target offset (-50 to +50 range from center)
            const windPush = lateralForce * (currentSpeed * 2.5);
            const targetOffset = windPush + stabilityNoise;

            // 5. APPLY PHYSICS TO SLIDER
            const target = isHovering ? 0 : targetOffset;
            
            // Smooth lerp for the slider
            const lerpSpeed = isHovering ? 0.1 : 0.05;
            animState.current.currentOffset += (target - animState.current.currentOffset) * lerpSpeed;

            // Clamp balance 0-100
            const newBalance = Math.min(100, Math.max(0, 50 + animState.current.currentOffset));
            setBalance(newBalance);

            // Deviation calculation
            const baseDev = Math.abs(animState.current.currentOffset * 0.2);
            const speedFactor = (currentSpeed - 10) * 0.5; 
            setDeviation(baseDev + Math.max(0, speedFactor));

            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isHovering]);

    // Derived visual states
    const isCritical = balance < 20 || balance > 80;

    return (
        <div className="space-y-4 mb-4">
            {/* COMPASS WIDGET - BLENDED STYLE */}
            <div className="bg-slate-50 rounded-3xl p-5 flex items-center justify-between group hover:bg-slate-100/50 transition-colors">
                <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-2">
                        <Wind size={12} className="text-slate-300" /> Wind Dir
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            {windSpeed.toFixed(1)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">KT</span>
                    </div>
                </div>
                
                {/* Minimalist Compass */}
                <div className="relative w-10 h-10 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 flex flex-col justify-between items-center py-1 text-[5px] font-black text-slate-200 pointer-events-none"><span>N</span><span>S</span></div>
                    <div className="absolute inset-0 flex flex-row justify-between items-center px-1 text-[5px] font-black text-slate-200 pointer-events-none"><span>W</span><span>E</span></div>
                    
                    <div className="w-full h-full absolute inset-0 will-change-transform" style={{ transform: `rotate(${windDir}deg)` }}>
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[14px] border-b-emerald-600 filter drop-shadow-sm"></div>
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[14px] border-t-slate-200"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full border border-slate-100 z-10"></div>
                    </div>
                </div>
            </div>

            {/* FLIGHT DECK WIDGET - BLENDED STYLE */}
            <div 
                className="bg-slate-50 rounded-3xl p-5 flex flex-col gap-3 group transition-colors duration-300 hover:bg-slate-100/50"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Activity size={12} className="text-slate-300" /> Foil Balance
                    </span>
                    {/* Status LED */}
                    <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        isHovering 
                            ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' 
                            : isGusting || isCritical
                                ? 'bg-amber-400' 
                                : 'bg-slate-300'
                    }`}></span>
                </div>
                
                {/* Custom Slider Track */}
                <div className="w-full py-1">
                    <div className="flex justify-between text-[8px] text-slate-300 font-black uppercase tracking-widest mb-2 px-0.5">
                        <span>Port</span>
                        <span>Stbd</span>
                    </div>
                    
                    <div className="relative w-full h-1 bg-slate-200 rounded-full">
                        {/* Center Marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 transform -translate-x-1/2"></div>
                        
                        {/* The Thumb */}
                        <div 
                            className={`absolute top-1/2 w-2.5 h-2.5 rounded-full shadow-sm border border-white transition-all duration-75 ease-out -mt-[5px]
                                ${isCritical ? 'bg-orange-500' : 'bg-blue-600'}
                            `}
                            style={{ 
                                left: `calc(${balance}% - 5px)`
                            }}
                        />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 truncate">Deviation</span>
                    <div className={`font-mono text-[9px] font-bold ${isCritical ? 'text-orange-500' : 'text-slate-400'}`}>
                        {deviation.toFixed(1)}°
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
  const [timerElapsed, setTimerElapsed] = useState(0);

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

  // Timer Tick Interval for Sidebar
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
        // Sync immediately
        setTimerElapsed(db.getTimerElapsed());
        // Tick every second
        interval = setInterval(() => {
            setTimerElapsed(db.getTimerElapsed());
        }, 1000);
    } else {
        setTimerElapsed(db.getTimerElapsed());
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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
        className={`lg:hidden fixed top-6 right-6 z-[60] p-4 bg-slate-900 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95`}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <button
        onClick={toggleCollapse}
        className={`hidden lg:flex fixed z-[60] top-10 items-center justify-center w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 cursor-pointer ${
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
              className={`text-3xl font-black text-slate-900 tracking-tighter leading-none transition-all duration-300 origin-left select-none drop-shadow-sm ${
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

          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isMeetingItem = item.path === '/';
            const showActiveTimer = isMeetingItem && isTimerRunning;
            
            // CLEANUP: Always use original label and icon for professional look
            const displayLabel = item.label;
            const displayIcon = item.icon;

            // Color Classes
            const activeColorClass = isDirectorMode ? 'text-cyan-500' : 'text-emerald-500';
            const activeBgClass = isDirectorMode ? 'bg-cyan-400' : 'bg-emerald-400';

            return (
              <Link
                key={item.path}
                id={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center py-4 rounded-2xl transition-all h-14 relative z-10 group whitespace-nowrap overflow-hidden cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 active-nav-item active:scale-[0.98]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm active:scale-[0.98]'
                } ${isCollapsed ? 'justify-center px-0 gap-0' : 'px-5 gap-3'}`}
                title={isCollapsed ? item.label : ''}
              >
                {/* Active Line Indicator (Pulse Line) - Subtle Professional Status */}
                {showActiveTimer && (
                   <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-md transition-all duration-500 ${isDirectorMode ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
                )}

                <div className="relative flex items-center justify-center shrink-0">
                    {/* Soft Pulse Background for Active Timer */}
                    {showActiveTimer && (
                       <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${activeBgClass}`} />
                    )}
                    
                    <span className={`transition-colors duration-300 ${isActive || showActiveTimer ? (isDirectorMode && showActiveTimer ? 'text-cyan-400' : 'text-emerald-400') : 'group-hover:text-emerald-600'}`}>
                      {displayIcon}
                    </span>
                </div>

                <div className={`flex flex-col justify-center ml-1 transition-all duration-300 origin-left ${
                    isCollapsed ? 'opacity-0 w-0 scale-x-0' : 'opacity-100 w-auto scale-x-100'
                  }`}
                >
                  <span className={`font-bold text-sm tracking-wide leading-tight ${showActiveTimer ? 'text-slate-900' : ''}`}>
                    {displayLabel}
                  </span>
                  {/* Mini Timer Subtitle - Kept for functionality */}
                  {showActiveTimer && (
                       <span className={`text-[10px] font-mono font-black tracking-widest leading-tight ${isDirectorMode ? 'text-cyan-400' : 'text-emerald-400'}`}>
                           {formatMiniTimer(timerElapsed)}
                       </span>
                   )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* FOOTER WIDGETS */}
        <div className="p-4 transition-all duration-300 space-y-4 relative z-10">
          <div className={`transition-all duration-300 w-full ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
             
             {/* WIDGET AREA: Coupled Nautical Dashboard */}
             {isDirectorMode && (
                 <NauticalDashboard />
             )}
             
             {votingState.isActive && (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 px-2 mb-2">
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
                  {/* Calmer breathing status indicator */}
                  <div className={`absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full z-20 border-2 border-white ${isPulsing ? 'animate-ping' : 'animate-breathing'}`}></div>
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
            
            {/* Help Button Moved to Bottom Status Area */}
            {!isCollapsed && (
                <div className="space-y-2 mt-1 pt-3 border-t border-slate-200/50">
                    <p className="text-[9px] font-bold text-slate-400 truncate" title={db.getCurrentWorkspace()}>
                        Sessie: {db.getCurrentWorkspace()}
                    </p>
                     <button 
                        onClick={() => setIsHelpOpen(true)}
                        className="w-full text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 group active:scale-95"
                    >
                        <HelpCircle size={14} className="group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Handleiding</span>
                    </button>
                </div>
            )}

            {isCollapsed && (
                <button 
                  onClick={() => setIsHelpOpen(true)}
                  className="mt-2 text-slate-400 hover:text-emerald-500 transition-colors active:scale-95"
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
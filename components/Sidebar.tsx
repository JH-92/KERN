
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, ListTodo, Archive, LayoutDashboard, Settings, Menu, X, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { KernLogo } from './KernLogo';
import { db } from '../db';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isObscured, setIsObscured] = useState(false);

  // Monitor the DOM for active modals (elements with z-[9999])
  useEffect(() => {
    const checkModal = () => {
      const hasModal = document.querySelector('.z-\\[9999\\]');
      setIsObscured(!!hasModal);
    };

    checkModal();
    const interval = setInterval(checkModal, 200);
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  const menuItems = [
    { path: '/', label: 'Nieuwe vergadering', icon: <PlusCircle size={22} /> },
    { path: '/actielijst', label: 'Actielijst', icon: <ListTodo size={22} /> },
    { path: '/archief', label: 'Archief & historie', icon: <Archive size={22} /> },
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
    { path: '/instellingen', label: 'Instellingen', icon: <Settings size={22} /> },
  ];

  const activeIndex = menuItems.findIndex(item => item.path === location.pathname);

  const NavLink: React.FC<{ item: typeof menuItems[0] }> = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all h-14 relative z-10 group whitespace-nowrap overflow-hidden ${
          isActive 
            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        } ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
        title={isCollapsed ? item.label : ''}
      >
        <span className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-emerald-400' : ''}`}>
          {item.icon}
        </span>
        <span 
          className={`font-black text-sm uppercase tracking-widest transition-all duration-300 origin-left ${
            isCollapsed ? 'opacity-0 w-0 scale-x-0' : 'opacity-100 w-auto scale-x-100'
          }`}
        >
          {item.label}
        </span>
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-4 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl transition-all duration-300 ${
            isObscured ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Collapse Button */}
      <button
        onClick={toggleCollapse}
        className={`hidden lg:flex fixed z-40 top-10 items-center justify-center w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-300 ease-in-out ${
           isCollapsed ? 'left-[4.5rem]' : 'left-[18.5rem]'
        }`}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-100 transform transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-24' : 'lg:w-80'}
          ${isObscured ? 'lg:filter lg:blur-sm lg:opacity-40 lg:pointer-events-none' : 'lg:filter-none lg:opacity-100'}
          z-30 flex flex-col
        `}
      >
        <div className={`p-10 transition-all duration-300 ${isCollapsed ? 'px-0 items-center' : ''} flex flex-col`}>
          <div className={`flex items-center gap-4 mb-2 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
            <KernLogo size={isCollapsed ? 32 : 42} className="text-emerald-600 transition-all duration-300" />
            <h1 
              className={`text-4xl font-black text-slate-900 tracking-tighter leading-none transition-all duration-300 origin-left ${
                isCollapsed ? 'opacity-0 w-0 scale-0 hidden' : 'opacity-100 w-auto scale-100'
              }`}
            >
              KERN
            </h1>
          </div>
          <p 
            className={`text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase opacity-60 pl-1 whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-60 h-auto'
            }`}
          >
            De essentie van overleg
          </p>
        </div>
        
        <nav className="px-4 space-y-3 mt-4 relative flex-1">
          {/* Sliding Indicator (Only visible when expanded for cleaner look, or adjusted width) */}
          {!isCollapsed && activeIndex !== -1 && (
             <div 
               className="absolute left-0 w-1.5 h-10 bg-emerald-500 rounded-r-full transition-all duration-300 ease-in-out"
               style={{ 
                 top: `calc(${activeIndex} * (3.5rem + 0.75rem) + 0.5rem)` 
               }}
             />
          )}

          {menuItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="p-6 transition-all duration-300">
          <div className={`bg-slate-50 rounded-3xl flex items-center gap-3 transition-all duration-300 ${
            isCollapsed ? 'p-3 justify-center aspect-square' : 'p-6'
          }`}>
            <div className="relative shrink-0">
               <ShieldCheck size={24} className="text-emerald-500 relative z-10" />
               <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] z-20"></div>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Systeemstatus</p>
              <p className="text-xs font-black text-slate-900 uppercase whitespace-nowrap">Operationeel</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1 truncate max-w-[120px]" title={db.getCurrentWorkspace()}>
                 WS: {db.getCurrentWorkspace()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

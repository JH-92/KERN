
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, ListTodo, Archive, LayoutDashboard, Settings, Menu, X, ShieldCheck } from 'lucide-react';
import { KernLogo } from './KernLogo';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isObscured, setIsObscured] = useState(false);

  // Monitor the DOM for active modals (elements with z-[9999])
  useEffect(() => {
    const checkModal = () => {
      // Look for any element that matches our high-z-index modal signature
      const hasModal = document.querySelector('.z-\\[9999\\]');
      setIsObscured(!!hasModal);
    };

    // Check immediately and then on an interval (lightweight polling)
    // MutationObserver is preferred but this is robust for all frameworks/portals
    checkModal();
    const interval = setInterval(checkModal, 200);
    
    // Also attach a mutation observer to body for faster reaction
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

  const NavLink: React.FC<{ item: typeof menuItems[0] }> = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
          isActive 
            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span className={isActive ? 'text-emerald-400' : ''}>{item.icon}</span>
        <span className="font-black text-sm uppercase tracking-widest">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button: Hide when obscured to prevent overlapping modals */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl transition-all duration-300 ${
            isObscured ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-100 transform transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isObscured ? 'lg:filter lg:blur-sm lg:opacity-40 lg:pointer-events-none' : 'lg:filter-none lg:opacity-100'}
          z-50 lg:z-30
        `}
      >
        <div className="p-10">
          <div className="flex items-center gap-4 mb-2">
            <KernLogo size={42} className="text-emerald-600" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">KERN</h1>
          </div>
          <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase opacity-60 pl-1">De essentie van overleg</p>
        </div>
        
        <nav className="px-6 space-y-3 mt-4">
          {menuItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="absolute bottom-10 left-10 right-10">
          <div className="p-6 bg-slate-50 rounded-3xl flex items-center gap-3">
            <ShieldCheck size={24} className="text-emerald-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Systeemstatus</p>
              <p className="text-xs font-black text-slate-900 uppercase">Operationeel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop for Sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

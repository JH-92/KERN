import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, List, CheckCircle, Gavel, LayoutDashboard } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 p-8 flex items-center justify-between shrink-0">
          <div>
             <h2 className="text-2xl font-black text-white tracking-tight">KERN Gebruikershandleiding</h2>
             <p className="text-slate-400 text-sm font-medium mt-1">Snelgids voor efficiënt vergaderen</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
          
          {/* Section 1: Nieuwe Vergadering */}
          <section className="space-y-4">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><Clock size={18} /></span>
                1. Nieuwe Vergadering
             </h3>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <h4 className="font-bold text-slate-800 mb-2 text-sm">Configuratie</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">
                      Selecteer eerst de datum en het type overleg (<strong className="text-slate-900">Projectleidersoverleg</strong> of <strong className="text-slate-900">Planningsvergadering</strong>). Gebruik de <strong className="text-slate-900">timer</strong> widget om de vergadertijd bij te houden.
                   </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <h4 className="font-bold text-slate-800 mb-2 text-sm">Aanwezigen</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">
                      Klik op namen in de lijst om aanwezigen te markeren. Gebruik het plus-icoon om direct nieuwe externe deelnemers toe te voegen.
                   </p>
                </div>
             </div>
          </section>

          {/* Section 2: Acties & Besluiten */}
          <section className="space-y-4">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><CheckCircle size={18} /></span>
                2. Acties & Besluiten
             </h3>
             <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                   Tijdens het notuleren kunt u per agendapunt direct items vastleggen. Items worden direct opgeslagen in de centrale database via de knop <strong className="text-slate-900">VERGADERING OPSLAAN</strong>.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                   <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-100 bg-blue-50/50">
                      <List className="text-blue-500 shrink-0 mt-1" size={18} />
                      <div>
                         <span className="block text-xs font-black text-blue-700 uppercase mb-1">Actiepunten</span>
                         <span className="text-xs text-slate-600">Taken die uitgevoerd moeten worden. Vereisen een eigenaar en deadline. Komen op de actielijst.</span>
                      </div>
                   </div>
                   <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                      <Gavel className="text-emerald-500 shrink-0 mt-1" size={18} />
                      <div>
                         <span className="block text-xs font-black text-emerald-700 uppercase mb-1">Besluiten</span>
                         <span className="text-xs text-slate-600">Formele beslissingen die vastliggen. Worden direct gearchiveerd en zijn niet wijzigbaar.</span>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* Section 3: Dashboard & Archief */}
          <section className="space-y-4">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><LayoutDashboard size={18} /></span>
                3. Dashboard & Archief
             </h3>
             <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-700">
                   <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">A</div>
                   <span>Het <strong>Dashboard</strong> geeft realtime inzicht in openstaande acties en statistieken.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-700">
                   <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">B</div>
                   <span>Via het <strong>Archief</strong> kunt u oude verslagen inzien, notulen corrigeren en PDF's genereren voor distributie.</span>
                </li>
             </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
           <button 
             onClick={onClose}
             className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
           >
             Begrepen
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
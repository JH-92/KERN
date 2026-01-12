
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../db';
import { Action, ActionStatus, Employee, MeetingType } from '../types';
import { AlertTriangle, Clock, Search, User, ArrowUpDown, ChevronDown, Briefcase, Layout, X, CheckCircle, Info, Flag } from 'lucide-react';
import PageHeader from '../components/PageHeader';

// Fix: Restore missing component content and default export
const ActionListPage: React.FC = () => {
  const location = useLocation();
  const [actions, setActions] = useState<Action[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  
  // Smart Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | ActionStatus>(
    (location.state as any)?.filter || 'ALL'
  );
  const [typeFilter, setTypeFilter] = useState<'ALL' | MeetingType>((location.state as any)?.typeFilter || 'ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadData = () => {
    setActions(db.getAllActions());
    setEmployees(db.getEmployees());
    setIsDirectorMode(document.documentElement.classList.contains('director-mode'));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
        loadData();
        if (selectedAction) {
            const freshActions = db.getAllActions();
            const updated = freshActions.find(a => a.id === selectedAction.id);
            if (updated) setSelectedAction(updated);
        }
    };
    window.addEventListener('kern-data-update', handleUpdate);
    return () => window.removeEventListener('kern-data-update', handleUpdate);
  }, [selectedAction]);

  useEffect(() => {
    if ((location.state as any)?.filter) {
        setStatusFilter((location.state as any).filter);
    }
    if ((location.state as any)?.typeFilter) {
        setTypeFilter((location.state as any).typeFilter);
    }
  }, [location.state]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedAction(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStatusChange = (meetingId: string | null, actionId: string, status: ActionStatus) => {
    db.updateActionStatus(meetingId, actionId, status);
  };

  const filteredActions = useMemo(() => {
    let result = [...actions];

    if (statusFilter === 'OVERDUE') {
       result = result.filter(a => a.status !== ActionStatus.DONE && a.deadline < today);
    } else if (statusFilter !== 'ALL') {
      result = result.filter(a => a.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
        result = result.filter(a => a.originType === typeFilter);
    }

    if (selectedOwner) {
      result = result.filter(a => a.owners && a.owners.includes(selectedOwner));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) || 
        a.readable_id.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.deadline.localeCompare(b.deadline);
      } else {
        return b.deadline.localeCompare(a.deadline);
      }
    });

    return result;
  }, [actions, statusFilter, typeFilter, selectedOwner, searchQuery, sortOrder]);

  const isOverdue = (deadline: string, status: ActionStatus) => {
    return deadline < today && status !== ActionStatus.DONE;
  };

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <PageHeader title="Actielijst" subtitle="Bewaking van alle lopende projectacties." />

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 mb-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Zoek op titel of ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold text-slate-700" />
          </div>
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><User size={20} /></div>
             <select value={selectedOwner} onChange={(e) => setSelectedOwner(e.target.value)} className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold text-slate-700 appearance-none cursor-pointer">
               <option value="">Alle eigenaren</option>
               {employees.map(emp => (
                 <option key={emp.id} value={emp.name}>{emp.name}</option>
               ))}
             </select>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={16} /></div>
          </div>
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{typeFilter === MeetingType.PROJECT ? <Briefcase size={20} /> : <Layout size={20} />}</div>
             <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold text-slate-700 appearance-none cursor-pointer">
               <option value="ALL">Alle overlegtypes</option>
               <option value={MeetingType.PROJECT}>Projectleidersoverleg</option>
               <option value={MeetingType.PLANNING}>Planningsoverleg</option>
             </select>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={16} /></div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100 pt-6">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'Alles' },
              { id: ActionStatus.OPEN, label: 'Openstaand' },
              { id: ActionStatus.PROGRESS, label: 'In afwachting' },
              { id: 'OVERDUE', label: 'Te laat' },
              { id: ActionStatus.DONE, label: 'Afgehandeld' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setStatusFilter(tab.id as any)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === tab.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredActions.length} Resultaten</div>
            <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-white hover:shadow-sm transition-all"><ArrowUpDown size={14} /> Deadline {sortOrder === 'asc' ? 'Oplopend' : 'Aflopend'}</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20">Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Omschrijving</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Eigenaar</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deadline</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Afgerond</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <div className="bg-slate-50 p-6 rounded-full"><Search size={32} className="opacity-20" /></div>
                      <p className="font-bold text-lg">Geen acties gevonden voor deze filters</p>
                      <button onClick={() => { setSearchQuery(''); setSelectedOwner(''); setStatusFilter('ALL'); setTypeFilter('ALL'); }} className="text-emerald-500 font-bold text-sm hover:underline">Filters wissen</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const overdue = isOverdue(action.deadline, action.status);
                  return (
                    <tr key={action.id} onClick={() => setSelectedAction(action)} className={`group transition-all cursor-pointer ${overdue ? 'bg-red-50/40' : 'hover:bg-slate-50/80'} ${action.isLegacy ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-8 py-6">
                        {action.originType === MeetingType.PROJECT ? (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm" title="Projectleidersoverleg"><Briefcase size={14} /></div>
                        ) : action.originType === MeetingType.PLANNING ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm" title="Planningsoverleg"><Layout size={14} /></div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-300" title="Geïmporteerd"><Info size={14} /></div>
                        )}
                      </td>
                      <td className="px-8 py-6"><span className="font-mono font-black text-slate-300 text-xs tracking-tighter group-hover:text-blue-400 transition-colors">{action.readable_id}</span></td>
                      <td className="px-8 py-6"><div className="font-black text-slate-800 tracking-tight">{action.title || action.description.substring(0, 50) + '...'}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">{action.topic}</div></td>
                      <td className="px-8 py-6"><div className="flex flex-wrap gap-1">{action.owners && action.owners.length > 0 ? action.owners.map((owner, idx) => <span key={idx} className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wide">{owner}</span>) : <span className="text-slate-300 font-bold">-</span>}</div></td>
                      <td className="px-8 py-6"><div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black ${overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{overdue ? (isDirectorMode ? <Flag size={14} className="animate-wave-flag fill-red-700" /> : <AlertTriangle size={14} />) : <Clock size={14} />}{action.deadline}</div></td>
                      <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                        <select value={action.status} onChange={(e) => handleStatusChange(action.meetingId, action.id, e.target.value as ActionStatus)} className={`text-xs font-black px-4 py-2 rounded-2xl border-2 outline-none transition-all shadow-sm cursor-pointer ${action.status === ActionStatus.DONE ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-50' : action.status === ActionStatus.PROGRESS ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-50' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-50'}`}>
                          <option value={ActionStatus.OPEN}>Open</option>
                          <option value={ActionStatus.PROGRESS}>In behandeling</option>
                          <option value={ActionStatus.DONE}>Gereed</option>
                        </select>
                      </td>
                      <td className="px-8 py-6"><span className="text-xs font-black text-slate-400 italic">{action.completedAt || '—'}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedAction(null)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 p-8 md:p-12 animate-in zoom-in-95 duration-200">
                <button onClick={() => setSelectedAction(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-mono text-xs font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{selectedAction.readable_id}</span>
                        {selectedAction.isLegacy && <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-200 px-2 py-1 rounded-lg border border-slate-300 border-dashed flex items-center gap-1"><Info size={12} /> Excel import</span>}
                        {selectedAction.originType === MeetingType.PROJECT ? <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1"><Briefcase size={12} /> Projectleider</span> : selectedAction.originType === MeetingType.PLANNING ? <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1"><Layout size={12} /> Planning</span> : null}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-2">{selectedAction.title || "Actiepunt"}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Onderwerp: {selectedAction.topic}</p>
                </div>
                <div className="space-y-8">
                    {selectedAction.description && (
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-2"><Info size={14} /> Omschrijving</label>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedAction.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Eigenaar(s)</label>
                            <div className="flex flex-wrap gap-2">{selectedAction.owners && selectedAction.owners.length > 0 ? selectedAction.owners.map(owner => <div key={owner} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm">{owner}</div>) : <span className="text-sm text-slate-300 italic">Niemand toegewezen</span>}</div>
                        </div>
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deadline</label>
                             <div className={`flex items-center gap-2 text-sm font-black ${isOverdue(selectedAction.deadline, selectedAction.status) ? 'text-red-600' : 'text-slate-700'}`}><Clock size={16} />{selectedAction.deadline}</div>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Huidige status</label>
                            <select value={selectedAction.status} onChange={(e) => handleStatusChange(selectedAction.meetingId, selectedAction.id, e.target.value as ActionStatus)} className={`text-xs font-black px-4 py-2 rounded-2xl border-2 outline-none transition-all shadow-sm cursor-pointer ${selectedAction.status === ActionStatus.DONE ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-50' : selectedAction.status === ActionStatus.PROGRESS ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-50' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-50'}`}>
                              <option value={ActionStatus.OPEN}>Open</option>
                              <option value={ActionStatus.PROGRESS}>In behandeling</option>
                              <option value={ActionStatus.DONE}>Gereed</option>
                            </select>
                         </div>
                         <div className="text-right">
                             {selectedAction.isLegacy && <p className="text-xs text-slate-400 italic mb-2">Dit item is overgenomen uit de oude administratie en heeft geen gekoppeld verslag.</p>}
                             <button onClick={() => setSelectedAction(null)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-colors">Sluiten</button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ActionListPage;

import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Employee, ActionStatus, MeetingType } from '../types';
import { UserPlus, Trash2, Edit3, Search, Users, UploadCloud, CheckCircle, Database, AlertTriangle, ToggleLeft, ToggleRight, Bomb, Share2, FileSpreadsheet, Zap, ClipboardList, Gavel, Lock, Unlock, Check, X, Briefcase, Layout, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { CustomDatePicker } from '../components/CustomDatePicker';

const SettingsPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceInput, setWorkspaceInput] = useState(db.getCurrentWorkspace());
  
  // States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showActionImport, setShowActionImport] = useState(false);
  const [showDecisionImport, setShowDecisionImport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInjectConfirm, setShowInjectConfirm] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [directorMode, setDirectorMode] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  
  // Security States
  const [isWorkspaceLocked, setIsWorkspaceLocked] = useState(true);
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');

  // Forms
  const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({ name: '', role: '', email: '' });
  const [batchInput, setBatchInput] = useState('');
  
  // Refined Historical Forms
  const [legacyAction, setLegacyAction] = useState({ 
    title: '', 
    description: '', 
    owner: '', 
    deadline: new Date().toISOString().split('T')[0],
    type: MeetingType.PROJECT 
  });
  const [legacyDecision, setLegacyDecision] = useState({ 
    title: '', 
    description: '', 
    owner: '', 
    date: new Date().toISOString().split('T')[0],
    type: MeetingType.PROJECT
  });
  
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = () => {
    setEmployees(db.getEmployees());
    setWorkspaceInput(db.getCurrentWorkspace());
  };

  useEffect(() => {
    loadData();
    if (document.documentElement.classList.contains('director-mode')) {
        setDirectorMode(true);
    }
    const handleSync = () => loadData();
    window.addEventListener('kern-data-update', handleSync);
    return () => window.removeEventListener('kern-data-update', handleSync);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const toggleDirectorMode = () => {
    const root = document.documentElement;
    const isActive = !directorMode;
    setDirectorMode(isActive);
    if (isActive) {
        setFlashAnimation(true);
        root.classList.add('director-mode');
        showToast("Director mode actief.");
        setTimeout(() => setFlashAnimation(false), 500);
    } else {
        root.classList.remove('director-mode');
        showToast("Standaard weergave hersteld.");
    }
  };

  const handleUnlockSubmit = () => {
    if (unlockCode === '0181') {
        setIsWorkspaceLocked(false);
        setShowUnlockInput(false);
        setUnlockCode('');
        showToast("Workspace ontgrendeld.");
    } else {
        showToast("Onjuiste toegangscode.");
        setUnlockCode('');
    }
  };

  const handleWorkspaceUpdate = () => { 
    if (workspaceInput === db.getCurrentWorkspace()) return; 
    const newId = db.setWorkspace(workspaceInput); 
    setWorkspaceInput(newId); 
    const url = new URL(window.location.href); 
    url.searchParams.set('ws', newId); 
    window.history.pushState({}, '', url); 
    loadData(); 
    showToast(`Workspace gewijzigd naar: ${newId}`); 
  };
  
  const handleCopyTeamsLink = () => { 
    const cleanUrl = `${window.location.origin}${window.location.pathname}?ws=${workspaceInput}`; 
    navigator.clipboard.writeText(cleanUrl); 
    showToast("Teams tab-URL gekopieerd!"); 
  };

  const handleSaveEmployee = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!currentEmployee.name?.trim()) return; 
    if (isEditing && currentEmployee.id) { 
      db.updateEmployee(currentEmployee.id, currentEmployee); 
      showToast(`${currentEmployee.name} bijgewerkt.`); 
    } else { 
      db.saveEmployee({ name: currentEmployee.name, email: currentEmployee.email, role: currentEmployee.role }); 
      showToast(`${currentEmployee.name} toegevoegd.`); 
    } 
    setShowAddModal(false); 
    loadData(); 
  };

  const handleSaveLegacyAction = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!legacyAction.title) return; 
    
    const totalActions = db.getAllActions().length;
    const readableId = `ACT-26-${(totalActions + 1).toString().padStart(3, '0')}`;
    const title = legacyAction.title.charAt(0).toUpperCase() + legacyAction.title.slice(1);

    db.saveLegacyAction({ 
      id: `leg-act-${Date.now()}`, 
      readable_id: readableId, 
      meetingId: null, 
      title: title, 
      description: legacyAction.description || '',
      owners: legacyAction.owner ? [legacyAction.owner] : [], 
      deadline: legacyAction.deadline, 
      status: ActionStatus.OPEN, 
      topic: 'Import', 
      originType: legacyAction.type, 
      isLegacy: true 
    }); 
    
    setLegacyAction({ title: '', description: '', owner: '', deadline: new Date().toISOString().split('T')[0], type: MeetingType.PROJECT }); 
    setShowActionImport(false); 
    showToast("Historisch actiepunt opgeslagen."); 
  };

  const handleSaveLegacyDecision = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!legacyDecision.title) return; 

    const totalDecisions = db.getAllDecisions().length;
    const readableId = `BES-26-${(totalDecisions + 1).toString().padStart(3, '0')}`;
    const title = legacyDecision.title.charAt(0).toUpperCase() + legacyDecision.title.slice(1);

    db.saveLegacyDecision({ 
      id: `leg-dec-${Date.now()}`, 
      readable_id: readableId, 
      meetingId: null, 
      title: title, 
      description: legacyDecision.description || '', 
      owners: legacyDecision.owner ? [legacyDecision.owner] : [], 
      date: legacyDecision.date, 
      topic: 'Import', 
      isLegacy: true 
    }); 
    
    setLegacyDecision({ title: '', description: '', owner: '', date: new Date().toISOString().split('T')[0], type: MeetingType.PROJECT }); 
    setShowDecisionImport(false); 
    showToast("Historisch besluit opgeslagen."); 
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {flashAnimation && <div className="power-up-animation"></div>}
      <PageHeader title="Instellingen" subtitle="Beheer workspace, medewerkers en systeemconfiguratie." />

      <div className="space-y-12 max-w-5xl mx-auto">
        <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 border-l-4 border-l-emerald-500 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
             <div className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                 <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                        <Share2 size={24} className="text-emerald-600" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Gedeelde workspace</h3>
                     </div>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
                        U werkt in een gedeelde omgeving. Alle wijzigingen zijn direct zichtbaar voor teamleden met toegang tot deze workspace-ID.
                     </p>
                 </div>
                 
                 <div className="w-full md:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 min-w-[300px]">
                     <div className="flex items-center justify-between">
                         <button onClick={() => isWorkspaceLocked ? setShowUnlockInput(true) : setIsWorkspaceLocked(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 cursor-pointer">
                             {isWorkspaceLocked ? <Lock size={12} /> : <Unlock size={12} className="text-emerald-500" />}
                             Workspace ID
                         </button>
                         <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                             <CheckCircle size={12} /> Actief
                         </span>
                     </div>

                     {showUnlockInput && (
                        <div className="flex items-center gap-2 mb-1 animate-in fade-in slide-in-from-left-2 z-50 relative">
                            <input autoFocus type="password" value={unlockCode} onChange={(e) => setUnlockCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlockSubmit()} placeholder="Code..." className="flex-1 px-3 py-1.5 text-xs font-bold border-2 border-emerald-400 rounded-lg outline-none bg-white" />
                            <button onClick={handleUnlockSubmit} className="bg-emerald-500 text-white p-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer"><Check size={14} strokeWidth={3} /></button>
                        </div>
                     )}

                     <div className="flex items-center gap-2">
                         <input type="text" value={workspaceInput} readOnly={isWorkspaceLocked} onChange={(e) => setWorkspaceInput(e.target.value)} onBlur={handleWorkspaceUpdate} className={`flex-1 text-base font-mono font-bold text-slate-800 px-3 py-2 rounded-md border border-slate-200 outline-none transition-all ${isWorkspaceLocked ? 'bg-slate-100 text-slate-500' : 'bg-white focus:ring-2 focus:ring-emerald-500'}`} />
                         <button onClick={handleCopyTeamsLink} className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors shadow-lg active:scale-95 cursor-pointer">Kopieer link</button>
                     </div>
                 </div>
             </div>
        </section>

        <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Users size={24} /></div>
                    <h3 className="text-xl font-black text-slate-900">Personeelsbestand</h3>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" />
                    </div>
                    <button onClick={() => { setCurrentEmployee({ name: '', role: '', email: '' }); setIsEditing(false); setShowAddModal(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"><UserPlus size={16} /> <span className="hidden sm:inline">Toevoegen</span></button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Naam</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / functie</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Beheer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4 font-bold text-slate-900 text-sm">{emp.name}</td>
                                    <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{emp.role || '—'}</td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setCurrentEmployee(emp); setIsEditing(true); setShowAddModal(true); }} className="p-2 text-slate-400 hover:text-blue-500 transition-all cursor-pointer"><Edit3 size={18} /></button>
                                            <button onClick={() => { if(confirm(`Weet u zeker dat u ${emp.name} wilt verwijderen?`)) { db.removeEmployee(emp.id); loadData(); showToast("Medewerker verwijderd."); } }} className="p-2 text-slate-400 hover:text-red-500 transition-all cursor-pointer"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
        
        <section className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-3">
                     <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Database size={18} /></div>
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Historische data import</h3>
                 </div>
                 <div className="flex gap-4">
                     <button onClick={() => setShowActionImport(true)} className="bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"><ClipboardList size={16} className="text-amber-500" /> Snel actiepunt toevoegen</button>
                     <button onClick={() => setShowDecisionImport(true)} className="bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"><Gavel size={16} className="text-emerald-500" /> Snel besluit toevoegen</button>
                 </div>
             </div>
        </section>

        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                 <div className="flex-1">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">Systeembeheer</h3>
                     <div className="mt-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dev Tools:</span>
                            <button onClick={() => setDevMode(!devMode)} className={`transition-colors cursor-pointer ${devMode ? 'text-emerald-500' : 'text-slate-300'}`}>{devMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button>
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                            <button onClick={toggleDirectorMode} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${directorMode ? 'text-emerald-500' : 'text-slate-400'}`}><Zap size={12} /> Director Mode</button>
                        </div>
                     </div>
                 </div>
                 <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                      <button onClick={() => { const meetings = db.getMeetings(); const blob = new Blob([JSON.stringify(meetings, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `KERN_EXPORT_${new Date().toISOString()}.json`; link.click(); showToast("JSON export gestart."); }} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"><FileSpreadsheet size={16} /> JSON Export</button>
                      {devMode && (
                          <>
                            <button onClick={() => setShowInjectConfirm(true)} className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"><Database size={16} /> Demo data</button>
                            <button onClick={() => setShowResetConfirm(true)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"><AlertTriangle size={12} /> Reset Workspace</button>
                          </>
                      )}
                 </div>
             </div>
        </section>

        {/* MODALS */}
        {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 mb-6">{isEditing ? 'Medewerker bewerken' : 'Nieuwe medewerker'}</h3>
                    <form onSubmit={handleSaveEmployee} className="space-y-4">
                        <input type="text" placeholder="Volledige naam" value={currentEmployee.name} onChange={e => setCurrentEmployee({...currentEmployee, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" required />
                        <input type="text" placeholder="Rol / Functie" value={currentEmployee.role || ''} onChange={e => setCurrentEmployee({...currentEmployee, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg cursor-pointer">Opslaan</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showActionImport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowActionImport(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><ClipboardList className="text-amber-500" /> Snel actiepunt toevoegen</h3>
                    <form onSubmit={handleSaveLegacyAction} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type overleg</label>
                                <select value={legacyAction.type} onChange={e => setLegacyAction({...legacyAction, type: e.target.value as MeetingType})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none outline-none">
                                    <option value={MeetingType.PROJECT}>Projectleider</option>
                                    <option value={MeetingType.PLANNING}>Planning</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                                <div className="h-[46px]"><CustomDatePicker value={legacyAction.deadline} onChange={d => setLegacyAction({...legacyAction, deadline: d})} /></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Eigenaar</label>
                            <select value={legacyAction.owner} onChange={e => setLegacyAction({...legacyAction, owner: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none outline-none">
                                <option value="">Geen eigenaar</option>
                                {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel (Verplicht)</label>
                            <input type="text" value={legacyAction.title} onChange={e => setLegacyAction({...legacyAction, title: e.target.value})} placeholder="Wat moet er gebeuren?" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-100" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving (Optioneel)</label>
                            <textarea value={legacyAction.description} onChange={e => setLegacyAction({...legacyAction, description: e.target.value})} className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-amber-100 resize-none" placeholder="Extra details..." />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowActionImport(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-600 shadow-lg cursor-pointer">Opslaan</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showDecisionImport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDecisionImport(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Gavel className="text-emerald-500" /> Snel besluit toevoegen</h3>
                    <form onSubmit={handleSaveLegacyDecision} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Datum</label>
                                <div className="h-[46px]"><CustomDatePicker value={legacyDecision.date} onChange={d => setLegacyDecision({...legacyDecision, date: d})} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verantwoordelijke</label>
                                <select value={legacyDecision.owner} onChange={e => setLegacyDecision({...legacyDecision, owner: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold appearance-none outline-none">
                                    <option value="">Directie</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Besluit (Titel)</label>
                            <input type="text" value={legacyDecision.title} onChange={e => setLegacyDecision({...legacyDecision, title: e.target.value})} placeholder="Kern van het besluit..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-100" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context / Omschrijving</label>
                            <textarea value={legacyDecision.description} onChange={e => setLegacyDecision({...legacyDecision, description: e.target.value})} className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-100 resize-none" placeholder="Details van de beslissing..." />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowDecisionImport(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg cursor-pointer">Opslaan</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showBatchModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBatchModal(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 mb-4">Bulk import</h3>
                    <p className="text-slate-500 mb-4 text-sm font-medium">Plak namen gescheiden door komma's.</p>
                    <textarea autoFocus value={batchInput} onChange={e => setBatchInput(e.target.value)} className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 font-medium text-slate-700 outline-none focus:border-blue-300 resize-none" placeholder="Jan Jansen, Piet Pietersen, ..." />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowBatchModal(false)} className="px-5 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 cursor-pointer">Annuleren</button>
                        <button onClick={() => { if(batchInput.trim()) { const names = batchInput.split(',').map(n => n.trim()).filter(n => n); db.addEmployees(names); setBatchInput(''); setShowBatchModal(false); loadData(); showToast(`${names.length} medewerkers toegevoegd.`); } }} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg cursor-pointer">Importeren</button>
                    </div>
                </div>
            </div>
        )}

        {showResetConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl border-2 border-red-100">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4"><Bomb size={32} /></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Workspace wissen?</h3>
                        <p className="text-slate-500 text-sm mb-6">Alle data wordt permanent verwijderd.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button onClick={() => { db.resetWorkspace(); loadData(); setShowResetConfirm(false); showToast("Systeem gereset."); }} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 shadow-lg cursor-pointer">Ja, wissen</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

         {showInjectConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowInjectConfirm(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-4"><Database size={32} /></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Demo data laden?</h3>
                        <p className="text-slate-500 text-sm mb-6">Dit overschrijft de huidige data met een volledige set.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowInjectConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button onClick={() => { db.injectMasterData(); loadData(); setShowInjectConfirm(false); showToast("Demo data geladen."); }} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg cursor-pointer">Start</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
      {toastMsg && (
        <div className="fixed bottom-6 left-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-[300] flex items-center gap-3">
          <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle size={14} className="text-white" /></div>
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Employee, ActionStatus, MeetingType } from '../types';
import { UserPlus, Trash2, Edit3, Search, Users, UploadCloud, CheckCircle, Database, AlertTriangle, ToggleLeft, ToggleRight, Bomb, Share2, FileSpreadsheet, Zap, ClipboardList, Gavel, Lock, Unlock, Check, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { KernLogo } from '../components/KernLogo';

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
  const [legacyAction, setLegacyAction] = useState({ title: '', description: '', owner: '', deadline: new Date().toISOString().split('T')[0] });
  const [legacyDecision, setLegacyDecision] = useState({ title: '', description: '', owner: '', date: new Date().toISOString().split('T')[0] });
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
  }, []);

  // Escape key handler for all modals and unlock input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showUnlockInput) { setShowUnlockInput(false); setUnlockCode(''); }
            if (showAddModal) closeModal();
            if (showBatchModal) setShowBatchModal(false);
            if (showActionImport) setShowActionImport(false);
            if (showDecisionImport) setShowDecisionImport(false);
            if (showResetConfirm) setShowResetConfirm(false);
            if (showInjectConfirm) setShowInjectConfirm(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showBatchModal, showActionImport, showDecisionImport, showResetConfirm, showInjectConfirm, showUnlockInput]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Easter Egg Handler with Flash
  const toggleDirectorMode = () => {
    const root = document.documentElement;
    const isActive = !directorMode;
    setDirectorMode(isActive);

    if (isActive) {
        setFlashAnimation(true);
        root.classList.add('director-mode');
        showToast("Director mode actief. Systeem op volle kracht.");
        setTimeout(() => setFlashAnimation(false), 500);
    } else {
        root.classList.remove('director-mode');
        showToast("Standaard weergave hersteld.");
    }
  };

  // --- HANDLERS ---
  const handleToggleLock = () => {
    if (isWorkspaceLocked) {
        setShowUnlockInput(true);
    } else {
        setIsWorkspaceLocked(true);
        showToast("Workspace vergrendeld.");
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
    const url = new URL(window.location.href); 
    url.searchParams.set('ws', workspaceInput); 
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
    closeModal(); 
    loadData(); 
  };

  const handleBatchImport = () => { 
    if (!batchInput.trim()) return; 
    const names = batchInput.split(',').map(n => n.trim()).filter(n => n); 
    db.addEmployees(names); 
    setBatchInput(''); 
    setShowBatchModal(false); 
    loadData(); 
    showToast(`${names.length} medewerkers geïmporteerd.`); 
  };

  const handleDeleteUser = (emp: Employee) => { 
    const updatedList = db.removeEmployee(emp.id); 
    setEmployees([...updatedList]); 
    showToast(`${emp.name} verwijderd.`); 
  };

  const handleInjectMasterData = () => { db.injectMasterData(); loadData(); setShowInjectConfirm(false); showToast("Volledige dataset succesvol geïnjecteerd!"); };
  const handleSystemReset = () => { db.resetWorkspace(); loadData(); setShowResetConfirm(false); showToast("Workspace volledig gewist."); };
  
  const handleExportData = () => { 
    const meetings = db.getMeetings(); 
    const rows = [['Type', 'ID', 'Titel', 'Omschrijving', 'Eigenaar', 'Datum/Deadline', 'Status', 'Meeting Datum', 'Meeting Type']]; 
    meetings.forEach(m => { 
      m.actions.forEach(a => { rows.push(['ACTIE', a.readable_id, `"${(a.title || '').replace(/"/g, '""')}"`, `"${(a.description || '').replace(/"/g, '""')}"`, (a.owners || []).join('; '), a.deadline, a.status, m.date, m.type]); }); 
      m.decisions.forEach(d => { rows.push(['BESLUIT', d.readable_id, `"${(d.title || '').replace(/"/g, '""')}"`, `"${(d.description || '').replace(/"/g, '""')}"`, (d.owners || []).join('; '), d.date, 'VASTGELEGD', m.date, m.type]); }); 
    }); 
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n"); 
    const encodedUri = encodeURI(csvContent); 
    const link = document.createElement("a"); 
    link.setAttribute("href", encodedUri); 
    link.setAttribute("download", `KERN_DATA_EXPORT_${workspaceInput}_${new Date().toISOString().split('T')[0]}.csv`); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
    showToast("Excel-bestand wordt gedownload."); 
  };

  // --- SEQUENTIAL IMPORT HANDLERS ---
  const handleSaveLegacyAction = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!legacyAction.title) return; 
    
    // Automatic Sequential Numbering
    const totalActions = db.getAllActions().length;
    const nextNum = totalActions + 1;
    const readableId = `ACT-26-${nextNum.toString().padStart(3, '0')}`;
    
    // Force Sentence Case for Title
    const title = legacyAction.title.charAt(0).toUpperCase() + legacyAction.title.slice(1);

    const id = Date.now().toString(); 
    db.saveLegacyAction({ 
      id: `leg-act-${id}`, 
      readable_id: readableId, 
      meetingId: null, 
      title: title, 
      description: legacyAction.description || '', // Removed 'Excel' default label
      owners: legacyAction.owner ? [legacyAction.owner] : [], 
      deadline: legacyAction.deadline, 
      status: ActionStatus.OPEN, 
      topic: 'Import', 
      originType: MeetingType.PROJECT, 
      isLegacy: true 
    }); 
    
    setLegacyAction({ title: '', description: '', owner: '', deadline: new Date().toISOString().split('T')[0] }); 
    setShowActionImport(false); 
    showToast("Historisch actiepunt opgeslagen."); 
  };

  const handleSaveLegacyDecision = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!legacyDecision.title) return; 

    // Automatic Sequential Numbering
    const totalDecisions = db.getAllDecisions().length;
    const nextNum = totalDecisions + 1;
    const readableId = `BES-26-${nextNum.toString().padStart(3, '0')}`;

    // Force Sentence Case for Title
    const title = legacyDecision.title.charAt(0).toUpperCase() + legacyDecision.title.slice(1);

    const id = Date.now().toString(); 
    db.saveLegacyDecision({ 
      id: `leg-dec-${id}`, 
      readable_id: readableId, 
      meetingId: null, 
      title: title, 
      description: legacyDecision.description || '', // Removed 'Excel' default label
      owners: legacyDecision.owner ? [legacyDecision.owner] : [], 
      date: legacyDecision.date, 
      topic: 'Import', 
      isLegacy: true 
    }); 
    
    setLegacyDecision({ title: '', description: '', owner: '', date: new Date().toISOString().split('T')[0] }); 
    setShowDecisionImport(false); 
    showToast("Historisch besluit opgeslagen."); 
  };

  const openEdit = (emp: Employee) => { setCurrentEmployee(emp); setIsEditing(true); setShowAddModal(true); };
  const openAdd = () => { setCurrentEmployee({ name: '', role: '', email: '' }); setIsEditing(false); setShowAddModal(true); };
  const closeModal = () => { setShowAddModal(false); setCurrentEmployee({}); setIsEditing(false); };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role?.toLowerCase().includes(searchTerm.toLowerCase()));

  const getRoleBadgeStyle = (role?: string) => {
      const r = role?.toLowerCase() || '';
      if (r.includes('hr')) return 'bg-pink-100 text-pink-700';
      if (r.includes('it') || r.includes('dev')) return 'bg-slate-200 text-slate-700';
      if (r.includes('sales') || r.includes('marketing')) return 'bg-purple-100 text-purple-700';
      if (r.includes('directie') || r.includes('management')) return 'bg-blue-100 text-blue-700';
      if (r.includes('finance')) return 'bg-emerald-100 text-emerald-700';
      return 'bg-slate-100 text-slate-600';
  };

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
                         <button 
                            onClick={handleToggleLock}
                            className="flex items-center gap-2 group cursor-pointer hover:bg-slate-100 p-1 -ml-1 rounded-lg transition-all"
                            title={isWorkspaceLocked ? "Klik om te wijzigen" : "Klik om te vergrendelen"}
                         >
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">Workspace ID</span>
                             {isWorkspaceLocked ? (
                                <Lock size={12} className="text-slate-400 group-hover:text-slate-600" />
                             ) : (
                                <Unlock size={12} className="text-emerald-500 animate-pulse" />
                             )}
                         </button>
                         <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                             <CheckCircle size={12} /> Actief
                         </span>
                     </div>

                     {/* Unlock UI Overlay */}
                     {showUnlockInput && (
                        <div className="flex items-center gap-2 mb-1 animate-in fade-in slide-in-from-left-2">
                            <input
                                autoFocus
                                type="password"
                                value={unlockCode}
                                onChange={(e) => setUnlockCode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUnlockSubmit();
                                    if (e.key === 'Escape') { setShowUnlockInput(false); setUnlockCode(''); }
                                }}
                                placeholder="Voer code in..."
                                className="flex-1 px-3 py-1.5 text-xs font-bold border-2 border-emerald-400 rounded-lg outline-none bg-white text-emerald-700 placeholder:text-emerald-300/50"
                            />
                            <button onClick={handleUnlockSubmit} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm transition-colors">
                                <Check size={14} strokeWidth={3} />
                            </button>
                            <button onClick={() => { setShowUnlockInput(false); setUnlockCode(''); }} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={14} />
                            </button>
                        </div>
                     )}

                     <div className="flex items-center gap-2">
                         <input 
                            type="text"
                            value={workspaceInput}
                            readOnly={isWorkspaceLocked}
                            onClick={() => isWorkspaceLocked && setShowUnlockInput(true)}
                            onChange={(e) => setWorkspaceInput(e.target.value)}
                            onBlur={handleWorkspaceUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleWorkspaceUpdate()}
                            className={`flex-1 text-base font-mono font-bold text-slate-800 px-3 py-2 rounded-md border border-slate-200 outline-none transition-all ${
                                isWorkspaceLocked 
                                ? 'bg-slate-100 cursor-pointer text-slate-500 hover:bg-slate-200' 
                                : 'bg-white focus:ring-2 focus:ring-emerald-500'
                            }`}
                            title={isWorkspaceLocked ? "Klik om te ontgrendelen" : "Workspace ID"}
                         />
                         <button 
                            onClick={handleCopyTeamsLink} 
                            className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors shadow-lg whitespace-nowrap"
                         >
                             Kopieer Teams link
                         </button>
                     </div>
                 </div>
             </div>
        </section>

        <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                        <Users size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Personeelsbestand</h3>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text"
                            placeholder="Zoeken..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={openAdd}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
                    >
                        <UserPlus size={16} /> <span className="hidden sm:inline">Toevoegen</span>
                    </button>
                    <button 
                        onClick={() => setShowBatchModal(true)}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 p-3 rounded-xl shadow-sm transition-all"
                        title="Bulk Import"
                    >
                        <UploadCloud size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Naam & email</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / functie</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Beheer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full ${emp.avatarColor || 'bg-slate-400'} flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white ${directorMode ? 'hologram-effect' : ''}`}>
                                                {emp.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{emp.email || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        {emp.role ? (
                                            <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${getRoleBadgeStyle(emp.role)}`}>
                                                {emp.role}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                                            <button onClick={() => handleDeleteUser(emp)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
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
                 <div>
                     <div className="flex items-center gap-3 mb-2">
                         <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                             <Database size={18} />
                         </div>
                         <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Historische data import</h3>
                     </div>
                 </div>
                 <div className="flex gap-4">
                     <button onClick={() => setShowActionImport(true)} className="bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center gap-2"><ClipboardList size={16} className="text-amber-500" /> Snel actiepunt toevoegen</button>
                     <button onClick={() => setShowDecisionImport(true)} className="bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center gap-2"><Gavel size={16} className="text-emerald-500" /> Snel besluit toevoegen</button>
                 </div>
             </div>
        </section>

        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                 <div className="flex-1">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">Systeembeheer</h3>
                     <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                         Exporteer data voor analyse of beheer de systeemstatus.
                         <br/>
                         <span className="italic mt-1 inline-block">Schakel de 'Dev Tools' in voor geavanceerde opties.</span>
                     </p>
                     
                     <div className="mt-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dev Tools:</span>
                            <button 
                                onClick={() => setDevMode(!devMode)} 
                                className={`transition-colors ${devMode ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                            >
                                {devMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                            <button 
                                onClick={toggleDirectorMode}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${directorMode ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-600'}`}
                            >
                                <Zap size={12} className={directorMode ? "fill-current animate-pulse" : ""} /> 
                                Engineered for Patrick
                            </button>
                        </div>
                     </div>
                 </div>

                 <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                      <button
                        onClick={handleExportData}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                      >
                         <FileSpreadsheet size={16} />
                         Data dump (Excel)
                      </button>
                      
                      {devMode && (
                          <button 
                            onClick={() => setShowInjectConfirm(true)}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                              <Database size={16} /> Demo data
                          </button>
                      )}

                      {devMode && (
                          <div className="pt-2 border-t border-slate-200/50 text-center">
                              <button 
                                onClick={() => setShowResetConfirm(true)}
                                className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline decoration-red-200 underline-offset-4 transition-all flex items-center justify-center gap-1"
                              >
                                  <AlertTriangle size={12} /> Workspace wissen
                              </button>
                          </div>
                      )}
                 </div>
             </div>
        </section>

        {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeModal}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <h3 className="text-2xl font-black text-slate-900 mb-6">{isEditing ? 'Medewerker bewerken' : 'Nieuwe medewerker'}</h3>
                    <form onSubmit={handleSaveEmployee} className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Naam</label>
                           <input type="text" placeholder="Volledige naam" value={currentEmployee.name} onChange={e => setCurrentEmployee({...currentEmployee, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" autoFocus />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                           <input type="email" placeholder="E-mailadres" value={currentEmployee.email || ''} onChange={e => setCurrentEmployee({...currentEmployee, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol / Functie</label>
                           <input type="text" placeholder="Functieomschrijving" value={currentEmployee.role || ''} onChange={e => setCurrentEmployee({...currentEmployee, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100">{isEditing ? 'Opslaan' : 'Toevoegen'}</button>
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
                    <p className="text-slate-500 mb-4 text-sm font-medium">Plak een lijst met namen, gescheiden door komma's.</p>
                    <textarea autoFocus value={batchInput} onChange={e => setBatchInput(e.target.value)} className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 font-medium text-slate-700 focus:outline-none focus:border-blue-300 resize-none" placeholder="Jan Jansen, Piet Pietersen, ..." />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowBatchModal(false)} className="px-5 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800">Annuleren</button>
                        <button onClick={handleBatchImport} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg">Importeren</button>
                    </div>
                </div>
            </div>
        )}

        {showActionImport && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowActionImport(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 text-amber-600">
                        <div className="bg-amber-100 p-2 rounded-xl"><ClipboardList size={24} /></div>
                        <h3 className="text-xl font-black text-slate-900">Snel actiepunt toevoegen</h3>
                    </div>
                    <form onSubmit={handleSaveLegacyAction} className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel van het item</label>
                            <input type="text" value={legacyAction.title} onChange={e => setLegacyAction({...legacyAction, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-100" placeholder="Korte titel" autoFocus />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                            <textarea value={legacyAction.description} onChange={e => setLegacyAction({...legacyAction, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-100 h-24 resize-none" placeholder="Details..." />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Eigenaar</label>
                                <select value={legacyAction.owner} onChange={e => setLegacyAction({...legacyAction, owner: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                    <option value="">Selecteer...</option>
                                    {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Deadline</label>
                                <CustomDatePicker value={legacyAction.deadline} onChange={date => setLegacyAction({...legacyAction, deadline: date})} />
                             </div>
                         </div>
                         <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowActionImport(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-100">Opslaan</button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        {showDecisionImport && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDecisionImport(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 text-emerald-600">
                        <div className="bg-emerald-100 p-2 rounded-xl"><Gavel size={24} /></div>
                        <h3 className="text-xl font-black text-slate-900">Snel besluit toevoegen</h3>
                    </div>
                    <form onSubmit={handleSaveLegacyDecision} className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel van het item</label>
                            <input type="text" value={legacyDecision.title} onChange={e => setLegacyDecision({...legacyDecision, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-100" placeholder="Korte titel" autoFocus />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                            <textarea value={legacyDecision.description} onChange={e => setLegacyDecision({...legacyDecision, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 h-24 resize-none" placeholder="Details..." />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Eigenaar</label>
                                <select value={legacyDecision.owner} onChange={e => setLegacyDecision({...legacyDecision, owner: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                    <option value="">Selecteer...</option>
                                    {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Datum vastlegging</label>
                                <CustomDatePicker value={legacyDecision.date} onChange={date => setLegacyDecision({...legacyDecision, date: date})} />
                             </div>
                         </div>
                         <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowDecisionImport(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100">Opslaan</button>
                        </div>
                    </form>
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
                        <p className="text-slate-500 text-sm mb-6">Weet u zeker dat u alle data wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button onClick={handleSystemReset} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-100">Ja, alles wissen</button>
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
                        <p className="text-slate-500 text-sm mb-6">Dit overschrijft de huidige data met een volledige voorbeeld dataset. Wilt u doorgaan?</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowInjectConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button onClick={handleInjectMasterData} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100">Start injectie</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
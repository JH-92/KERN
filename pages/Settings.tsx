
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Employee } from '../types';
import { UserPlus, Trash2, Edit3, Search, Users, UploadCloud, X, CheckCircle, Database, AlertTriangle, ToggleLeft, ToggleRight, Bomb, Share2, Copy, Link as LinkIcon, ShieldAlert, FileSpreadsheet, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const SettingsPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Workspace State
  const [workspaceInput, setWorkspaceInput] = useState(db.getCurrentWorkspace());

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInjectConfirm, setShowInjectConfirm] = useState(false);
  
  // Developer Mode State
  const [devMode, setDevMode] = useState(false);

  // Form States
  const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({ name: '', role: '', email: '' });
  const [batchInput, setBatchInput] = useState('');

  // Notification State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = () => {
    setEmployees(db.getEmployees());
    setWorkspaceInput(db.getCurrentWorkspace());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Workspace Handlers
  const handleWorkspaceUpdate = () => {
      if (workspaceInput === db.getCurrentWorkspace()) return;
      
      const newId = db.setWorkspace(workspaceInput);
      setWorkspaceInput(newId);
      
      // Update URL without reload to support Deep Linking instantly
      const url = new URL(window.location.href);
      url.searchParams.set('ws', newId);
      window.history.pushState({}, '', url);

      loadData(); // Reload data for the new workspace context
      showToast(`Workspace gewijzigd naar: ${newId}`);
  };

  const handleCopyTeamsLink = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('ws', workspaceInput);
      // Ensure we use the base origin for clean linking
      const cleanUrl = `${window.location.origin}${window.location.pathname}?ws=${workspaceInput}`;
      
      navigator.clipboard.writeText(cleanUrl);
      showToast("Teams Tab-URL gekopieerd!");
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee.name?.trim()) return;

    if (isEditing && currentEmployee.id) {
      db.updateEmployee(currentEmployee.id, currentEmployee);
      showToast(`${currentEmployee.name} bijgewerkt.`);
    } else {
      db.saveEmployee({
        name: currentEmployee.name,
        email: currentEmployee.email,
        role: currentEmployee.role
      });
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

  // Developer Tools Handlers
  const handleInjectMasterData = () => {
    db.injectMasterData();
    loadData();
    setShowInjectConfirm(false);
    showToast("Volledige dataset succesvol geïnjecteerd!");
  };

  const handleSystemReset = () => {
    db.resetWorkspace();
    loadData();
    setShowResetConfirm(false);
    showToast("Workspace volledig gewist.");
  };

  const handleExportData = () => {
    const meetings = db.getMeetings();
    const rows = [['Type', 'ID', 'Titel', 'Omschrijving', 'Eigenaar', 'Datum/Deadline', 'Status', 'Meeting Datum', 'Meeting Type']];
    
    meetings.forEach(m => {
        m.actions.forEach(a => {
            rows.push([
                'ACTIE', 
                a.readable_id, 
                `"${(a.title || '').replace(/"/g, '""')}"`, 
                `"${(a.description || '').replace(/"/g, '""')}"`, 
                (a.owners || []).join('; '), 
                a.deadline, 
                a.status, 
                m.date, 
                m.type
            ]);
        });
        m.decisions.forEach(d => {
            rows.push([
                'BESLUIT', 
                d.readable_id, 
                `"${(d.title || '').replace(/"/g, '""')}"`, 
                `"${(d.description || '').replace(/"/g, '""')}"`, 
                (d.owners || []).join('; '), 
                d.date, 
                'VASTGELEGD', 
                m.date, 
                m.type
            ]);
        });
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

  const openEdit = (emp: Employee) => {
    setCurrentEmployee(emp);
    setIsEditing(true);
    setShowAddModal(true);
  };

  const openAdd = () => {
    setCurrentEmployee({ name: '', role: '', email: '' });
    setIsEditing(false);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setCurrentEmployee({});
    setIsEditing(false);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <PageHeader title="Instellingen" subtitle="Beheer workspace, medewerkers en systeemconfiguratie." />

      <div className="space-y-12 max-w-5xl mx-auto">
        
        {/* SECTION 1: PROMINENT SHARED WORKSPACE */}
        <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 border-l-4 border-l-emerald-500 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
             <div className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                 <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                        <Share2 size={24} className="text-emerald-600" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Gedeelde Workspace</h3>
                     </div>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
                        U werkt in een gedeelde omgeving. Alle wijzigingen zijn direct zichtbaar voor teamleden met toegang tot deze workspace-ID.
                     </p>
                 </div>
                 
                 <div className="w-full md:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 min-w-[300px]">
                     <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace ID</span>
                         <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                             <CheckCircle size={12} /> Actief
                         </span>
                     </div>
                     <div className="flex items-center gap-2">
                         <input 
                            type="text"
                            value={workspaceInput}
                            onChange={(e) => setWorkspaceInput(e.target.value)}
                            onBlur={handleWorkspaceUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleWorkspaceUpdate()}
                            className="flex-1 text-base font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                         />
                         <button 
                            onClick={handleCopyTeamsLink} 
                            className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-colors shadow-lg whitespace-nowrap"
                         >
                             KOPIEER TEAMS TAB-URL
                         </button>
                     </div>
                 </div>
             </div>
        </section>

        {/* SECTION 2: EMPLOYEE MANAGEMENT */}
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
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Naam & Email</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Functie</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Beheer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-16 text-center text-slate-400 italic">
                                        Geen medewerkers gevonden.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full ${emp.avatarColor || 'bg-slate-400'} flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white`}>
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
                                                <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteUser(emp)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* SECTION 3: DIVIDER */}
        <hr className="border-slate-200" />

        {/* SECTION 4: REDESIGNED SYSTEM MANAGEMENT */}
        <section className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8 relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                 {/* Left: Info */}
                 <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                         <div className="bg-slate-200 text-slate-600 p-1.5 rounded-lg">
                             <Database size={18} />
                         </div>
                         <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Systeembeheer</h3>
                     </div>
                     <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                         Exporteer data voor analyse of beheer de systeemstatus.
                         <br/>
                         <span className="italic mt-1 inline-block">Schakel de 'Dev Tools' in voor geavanceerde opties.</span>
                     </p>
                     
                     <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dev Tools:</span>
                        <button 
                            onClick={() => setDevMode(!devMode)} 
                            className={`transition-colors ${devMode ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                            {devMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                     </div>
                 </div>

                 {/* Right: Actions */}
                 <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                      {/* Row 1: Tools */}
                      <div className="flex flex-col gap-2">
                          <button
                            onClick={handleExportData}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                          >
                             <FileSpreadsheet size={16} />
                             Data Dump (Excel)
                          </button>
                          
                          {devMode && (
                              <button 
                                onClick={() => setShowInjectConfirm(true)}
                                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 w-full px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2"
                              >
                                  <Database size={16} /> Demo Data
                              </button>
                          )}
                      </div>

                      {/* Row 2: Danger Zone */}
                      {devMode && (
                          <div className="pt-2 border-t border-slate-200/50 text-center">
                              <button 
                                onClick={() => setShowResetConfirm(true)}
                                className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline decoration-red-200 underline-offset-4 transition-all flex items-center justify-center gap-1"
                              >
                                  <AlertTriangle size={12} /> Workspace Wissen
                              </button>
                          </div>
                      )}
                 </div>
             </div>
        </section>

      </div>

      {/* MODAL: Add / Edit Employee */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-200">
            <button onClick={closeModal} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-1">{isEditing ? 'Medewerker bewerken' : 'Nieuwe medewerker'}</h3>
            <form onSubmit={handleSaveEmployee} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Volledige naam</label>
                <input 
                  type="text" 
                  value={currentEmployee.name}
                  onChange={e => setCurrentEmployee({...currentEmployee, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mailadres</label>
                <input 
                  type="email" 
                  value={currentEmployee.email || ''}
                  onChange={e => setCurrentEmployee({...currentEmployee, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Rol / Afdeling</label>
                <input 
                  type="text" 
                  list="roles-options"
                  value={currentEmployee.role || ''}
                  onChange={e => setCurrentEmployee({...currentEmployee, role: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-800 uppercase"
                  placeholder="BV. MARKETING"
                />
                <datalist id="roles-options">
                  <option value="DIRECTIE" />
                  <option value="HR" />
                  <option value="OPERATIONS" />
                  <option value="MARKETING" />
                  <option value="IT" />
                  <option value="SALES" />
                  <option value="QA" />
                </datalist>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl">
                  {isEditing ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Batch Import */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowBatchModal(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-1">Bulk import</h3>
            <textarea 
               value={batchInput}
               onChange={e => setBatchInput(e.target.value)}
               className="w-full h-40 px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-100 outline-none font-medium text-sm text-slate-700 resize-none mt-4"
               placeholder="Jan de Vries, Pieter Post..."
            />
            <div className="pt-4">
              <button onClick={handleBatchImport} className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all">
                Importeren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Safe Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Weet je het zeker?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Alle data in workspace <strong>{workspaceInput}</strong> wordt definitief gewist.
            </p>
            <div className="flex gap-3">
               <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-black text-sm uppercase tracking-widest">
                 Annuleren
               </button>
               <button onClick={handleSystemReset} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl">
                 Alles wissen
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Inject Confirmation */}
      {showInjectConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowInjectConfirm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
              <Database size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">KERN Dataset</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              De huidige data wordt overschreven met een volledige demonstratie-set (15 medewerkers, 10 vergaderingen en rijke besluitdata).
            </p>
            <div className="flex gap-3">
               <button onClick={() => setShowInjectConfirm(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-black text-sm uppercase tracking-widest">
                 Annuleren
               </button>
               <button onClick={handleInjectMasterData} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl">
                 Injecteren
               </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
          <div className="bg-emerald-500 p-1 rounded-full">
            <CheckCircle size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;


import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Employee } from '../types';
import { UserPlus, Trash2, Edit3, Search, Users, UploadCloud, X, CheckCircle, Database, AlertTriangle, ToggleLeft, ToggleRight, Bomb, Share2, Copy } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const SettingsPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const currentWorkspace = db.getCurrentWorkspace();

  const loadData = () => {
    setEmployees(db.getEmployees());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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
    // Direct delete for better UX in Teams (can be undone by adding back)
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

  const handleCopyLink = () => {
     const url = window.location.href;
     navigator.clipboard.writeText(url);
     showToast("Deelbare link gekopieerd!");
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

  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <PageHeader title="Personeelsbeheer" subtitle="Beheer het centrale register van alle medewerkers en teams." />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Personnel List Area */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Zoek collega's op naam of rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium text-slate-700"
              />
            </div>
            <button 
              onClick={openAdd}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              <UserPlus size={20} />
              <span className="hidden sm:inline">Nieuwe medewerker</span>
            </button>
            <button 
              onClick={() => setShowBatchModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              title="Bulk import"
            >
              <UploadCloud size={20} />
            </button>
          </div>

          {/* Employee List */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medewerker</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol / Team</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acties</th>
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
                            <div className={`w-10 h-10 rounded-full ${emp.avatarColor || 'bg-slate-400'} flex items-center justify-center text-white font-black text-xs shadow-md`}>
                              {emp.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                              <div className="text-xs text-slate-400 font-medium">{emp.email || 'Geen e-mail'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {emp.role ? (
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wide">
                              {emp.role}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs italic">-</span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEdit(emp)}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(emp)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
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
        </div>

        {/* Sidebar Info & Developer Tools */}
        <div className="space-y-6">
           {/* Workspace Info Card */}
           <div className="bg-white p-8 rounded-[2rem] text-slate-900 shadow-xl shadow-slate-200/50 relative overflow-hidden border border-slate-200 border-l-4 border-l-emerald-500">
             <div className="absolute -right-6 -bottom-6 opacity-5">
               <Share2 size={120} className="text-slate-900" />
             </div>
             <h3 className="text-lg font-black mb-2 flex items-center gap-3">
               <Share2 size={20} className="text-emerald-600" /> Gedeelde Workspace
             </h3>
             <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed">
                Je werkt in een gedeelde omgeving. Iedereen met deze link ziet dezelfde data.
             </p>
             <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between mb-6 border border-slate-200">
                 <code className="text-xs font-mono text-slate-600 font-bold">{currentWorkspace}</code>
                 <button onClick={handleCopyLink} className="bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 p-2 rounded-lg border border-slate-200 transition-colors shadow-sm">
                     <Copy size={14} />
                 </button>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-3xl font-black tracking-tighter text-slate-900">{employees.length}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Actieve profielen</span>
             </div>
           </div>

           {/* DEVELOPER TOOLS CARD */}
           <div className="bg-white p-8 rounded-[2rem] text-slate-900 shadow-xl shadow-slate-200/50 relative overflow-hidden border border-slate-200 border-l-4 border-l-emerald-500">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-black flex items-center gap-3">
                 <Database size={20} className="text-emerald-600" /> Ontwikkelaarstools
               </h3>
               <button onClick={() => setDevMode(!devMode)} className="transition-colors">
                  {devMode ? <ToggleRight size={32} className="text-emerald-500"/> : <ToggleLeft size={32} className="text-slate-300"/>}
               </button>
             </div>

             {devMode ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                 <button 
                   onClick={() => setShowInjectConfirm(true)}
                   className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"
                 >
                   <Database size={16} /> Demo dataset injecteren
                 </button>
                 
                 <button 
                   onClick={() => setShowResetConfirm(true)}
                   className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-red-500/50 hover:bg-red-500/10 text-red-400 hover:text-red-300 p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                 >
                   <Bomb size={16} /> Workspace Wissen
                 </button>
                 <p className="text-[10px] text-slate-500 text-center italic mt-2">
                   Actief op: <strong>{currentWorkspace}</strong>
                 </p>
               </div>
             ) : (
               <p className="text-xs text-slate-400 py-2 italic font-medium">
                 Schakel in voor geavanceerd beheer.
               </p>
             )}
           </div>
        </div>
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
              Alle data in workspace <strong>{currentWorkspace}</strong> wordt definitief gewist.
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
              De huidige data wordt overschreven met een volledige demonstratie-set (15 medewerkers, 10 vergaderingen).
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

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../db';
import { Meeting, Note, Action, Decision, ActionStatus, MeetingType } from '../types';
import { Calendar, Users, FileEdit, Trash2, Save, AlertCircle, ClipboardList, CheckCircle, Printer, X, Download, Briefcase, Layout, Clock, Info, User, Gavel, Search, ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { PrintableMeeting } from '../components/PrintableMeeting';

const ArchivePage: React.FC = () => {
  const location = useLocation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<Action | Decision | null>(null);
  const [itemType, setItemType] = useState<'action' | 'decision' | null>(null);

  const loadMeetings = () => {
    const list = db.getMeetings();
    const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
    setMeetings(sorted);
  };

  useEffect(() => {
    loadMeetings();
    const handleUpdate = () => loadMeetings();
    window.addEventListener('kern-data-update', handleUpdate);

    if ((location.state as any)?.saved) {
        showToast("Vergadering succesvol gearchiveerd");
        window.history.replaceState({}, document.title);
    }
    
    return () => window.removeEventListener('kern-data-update', handleUpdate);
  }, []);

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (selectedItem) closeModal();
            if (showPrintPreview) setShowPrintPreview(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, showPrintPreview]);

  // Handle Deep Linking from Dashboard
  useEffect(() => {
    if (meetings.length > 0) {
        const stateMeetingId = (location.state as any)?.meetingId;
        if (stateMeetingId) {
            handleSelectMeeting(stateMeetingId, meetings);
            window.history.replaceState({}, document.title);
        } else if (!selectedMeetingId) {
            handleSelectMeeting(meetings[0].id, meetings);
        }
    }
  }, [meetings, location.state]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectMeeting = (id: string, list: Meeting[] = meetings) => {
    setSelectedMeetingId(id);
    const meeting = list.find(m => m.id === id);
    if (meeting) {
      const notesMap: Record<string, string> = {};
      meeting.notes.forEach(n => {
        notesMap[n.agendaItem] = n.content;
      });
      setEditNotes(notesMap);
    }
  };

  const handleUpdate = () => {
    if (!selectedMeetingId) return;
    setIsUpdating(true);
    
    const updatedNotes: Note[] = Object.entries(editNotes).map(([item, content]) => ({
      agendaItem: item,
      content: content as string
    }));

    db.updateMeetingNotes(selectedMeetingId, updatedNotes);
    
    setTimeout(() => {
      setIsUpdating(false);
      showToast("Notulen succesvol bijgewerkt!");
    }, 400);
  };

  const handleDeleteAction = (actionId: string) => {
    db.removeAction(selectedMeetingId, actionId);
    showToast("Actie verwijderd.");
    if (selectedItem?.id === actionId) closeModal();
  };

  const handleDeleteDecision = (decisionId: string) => {
    db.removeDecision(selectedMeetingId, decisionId);
    showToast("Besluit verwijderd.");
    if (selectedItem?.id === decisionId) closeModal();
  };

  const handlePrint = () => {
    if (!selectedMeetingId) return;
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-area');
    if (!element || !(window as any).html2pdf) return;

    const opt = {
      margin: 10,
      filename: `KERN_Verslag_${selectedMeeting?.date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    (window as any).html2pdf().set(opt).from(element).save();
    showToast("PDF wordt gegenereerd...");
  };

  const openItem = (item: Action | Decision, type: 'action' | 'decision') => {
    setSelectedItem(item);
    setItemType(type);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setItemType(null);
  };

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const lowerQ = searchTerm.toLowerCase();
    
    const allActions = db.getAllActions();
    const allDecisions = db.getAllDecisions();
    
    return {
        actions: allActions.filter(a => 
            (a.title && a.title.toLowerCase().includes(lowerQ)) || 
            (a.description && a.description.toLowerCase().includes(lowerQ)) ||
            (a.readable_id && a.readable_id.toLowerCase().includes(lowerQ)) ||
            (a.owners && a.owners.some(o => o.toLowerCase().includes(lowerQ)))
        ),
        decisions: allDecisions.filter(d => 
            (d.title && d.title.toLowerCase().includes(lowerQ)) || 
            (d.description && d.description.toLowerCase().includes(lowerQ)) ||
            (d.readable_id && d.readable_id.toLowerCase().includes(lowerQ)) ||
            (d.owners && d.owners.some(o => o.toLowerCase().includes(lowerQ)))
        )
    };
  }, [meetings, searchTerm]);

  return (
    <div className="pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      <PageHeader title="Archief & historie" subtitle="Raadpleeg en corrigeer vastgelegde notulen.">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
          <div className="relative w-full md:w-64 order-2 md:order-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
                 type="text"
                 placeholder="Zoek in archief..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 autoFocus
                 className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-bold text-slate-700 text-sm"
             />
          </div>

          {!searchTerm && (
            <div className="w-full md:w-80 order-1 md:order-2">
                <select 
                value={selectedMeetingId}
                onChange={(e) => handleSelectMeeting(e.target.value)}
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-black text-slate-800 appearance-none cursor-pointer"
                >
                {meetings.length === 0 ? (
                    <option disabled>Geen historie beschikbaar</option>
                ) : (
                    meetings.map(m => (
                    <option key={m.id} value={m.id}>{m.date} — {m.type} (Week {m.weekNumber})</option>
                    ))
                )}
                </select>
            </div>
          )}
          
          {selectedMeeting && !searchTerm && (
            <button
              onClick={handlePrint}
              className="order-3 px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              title="Download als pdf"
            >
              <Printer size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="font-black text-sm uppercase tracking-widest text-slate-600 group-hover:text-emerald-700">PDF</span>
            </button>
          )}
        </div>
      </PageHeader>

      {searchTerm ? (
        <div className="space-y-12 animate-in fade-in duration-300">
           <div className="bg-slate-900 text-white p-8 rounded-[2rem] flex items-center justify-between">
              <div>
                  <h3 className="text-xl font-black">Zoekresultaten voor "{searchTerm}"</h3>
                  <p className="text-slate-400 text-sm mt-1">
                      {searchResults ? searchResults.actions.length + searchResults.decisions.length : 0} resultaten gevonden
                  </p>
              </div>
              <button onClick={() => setSearchTerm('')} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors">
                  <X size={20} />
              </button>
           </div>

           {searchResults && searchResults.actions.length > 0 && (
               <div className="space-y-4">
                   <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 px-2">
                      <ClipboardList size={16} /> Gevonden acties
                   </h4>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                       {searchResults.actions.map(a => (
                           <div 
                               key={a.id} 
                               onClick={() => openItem(a, 'action')}
                               className={`group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg border-l-4 ${a.isLegacy ? 'border-l-slate-300' : 'border-l-transparent hover:border-l-blue-500'}`}
                           >
                               <div className="space-y-2">
                                   <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-md">{a.readable_id}</span>
                                       {a.isLegacy && <span className="text-[9px] font-black bg-slate-200 px-1 py-0.5 rounded uppercase tracking-widest">Excel</span>}
                                       {!a.isLegacy && <span className="text-[10px] font-bold text-slate-400 uppercase">Kern</span>}
                                   </div>
                                   <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{a.title}</div>
                                   <div className="text-xs text-slate-500 line-clamp-1">{a.description}</div>
                               </div>
                               <div className="mt-4 sm:mt-0 sm:text-right">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deadline</div>
                                   <div className="font-bold text-slate-700">{a.deadline}</div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {searchResults && searchResults.decisions.length > 0 && (
               <div className="space-y-4">
                   <h4 className="text-sm font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 px-2">
                      <Gavel size={16} /> Gevonden besluiten
                   </h4>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                       {searchResults.decisions.map(d => (
                           <div 
                               key={d.id} 
                               onClick={() => openItem(d, 'decision')}
                               className={`group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg border-l-4 ${d.isLegacy ? 'border-l-slate-300' : 'border-l-transparent hover:border-l-emerald-500'}`}
                           >
                               <div className="space-y-2">
                                   <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-md">{d.readable_id}</span>
                                       {d.isLegacy && <span className="text-[9px] font-black bg-slate-200 px-1 py-0.5 rounded uppercase tracking-widest">Excel</span>}
                                   </div>
                                   <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{d.title}</div>
                                   <div className="text-xs text-slate-500 line-clamp-1">{d.description}</div>
                               </div>
                               <div className="mt-4 sm:mt-0 sm:text-right">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eigenaar</div>
                                   <div className="font-bold text-slate-700">{d.owners && d.owners.length > 0 ? d.owners[0] : '-'}</div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}
           
           {searchResults && searchResults.actions.length === 0 && searchResults.decisions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <Search size={48} className="text-slate-300 mb-4" />
                  <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Geen resultaten</p>
              </div>
           )}
        </div>
      ) : selectedMeeting ? (
        <div className="space-y-12">
          <section className="bg-slate-900 p-12 rounded-[3rem] text-white flex flex-wrap gap-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <ClipboardList size={200} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Datum & periode</span>
              <div className="flex items-center gap-3 text-white font-black text-2xl">
                <Calendar size={24} className="text-blue-400" />
                {selectedMeeting.date} <span className="text-blue-400/40">/</span> Week {selectedMeeting.weekNumber}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Team aanwezig</span>
              <div className="flex items-center gap-3 text-white font-bold text-lg">
                <Users size={22} className="text-blue-400" />
                {selectedMeeting.attendees.join(', ')}
              </div>
            </div>
          </section>

          <div className="space-y-10">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <FileEdit size={18} className="text-blue-500" /> Revisie van notulen
              </h3>
              <button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-all disabled:opacity-50"
              >
                <Save size={20} />
                {isUpdating ? 'Bijwerken...' : 'Wijzigingen doorvoeren'}
              </button>
            </div>

            {selectedMeeting.notes.map((note) => {
              const itemActions = selectedMeeting.actions.filter(a => a.topic === note.agendaItem);
              const itemDecisions = selectedMeeting.decisions.filter(d => d.topic === note.agendaItem);

              return (
                <div key={note.agendaItem} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-10 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight">{note.agendaItem}</h4>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ID: {selectedMeeting.id}</span>
                  </div>
                  <div className="p-10 space-y-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Opgeslagen tekst</label>
                      <textarea 
                        rows={5}
                        value={editNotes[note.agendaItem] || ''}
                        onChange={(e) => setEditNotes(prev => ({ ...prev, [note.agendaItem]: e.target.value }))}
                        className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:bg-white focus:border-slate-900 outline-none transition-all resize-none font-medium text-lg text-slate-700 leading-relaxed"
                        placeholder="Geen notulen vastgelegd voor dit onderdeel..."
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <ClipboardList size={14} /> Actiepunten (Historie)
                        </h5>
                        {itemActions.length === 0 ? <p className="text-xs text-slate-300 italic px-2">Geen acties vastgelegd.</p> : (
                          <div className="space-y-3">
                            {itemActions.map(a => (
                              <div 
                                key={a.id} 
                                onClick={() => openItem(a, 'action')}
                                className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-md border-l-4 border-l-transparent hover:border-l-blue-500"
                              >
                                <div className="space-y-1">
                                  <div className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">{a.title || a.description}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {a.owners && a.owners.length > 0 ? a.owners.join(', ') : 'Geen eigenaar'} • {a.deadline}
                                  </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAction(a.id); }} 
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 size={16}/>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle size={14} /> Besluiten (Historie)
                        </h5>
                        {itemDecisions.length === 0 ? <p className="text-xs text-slate-300 italic px-2">Geen besluiten vastgelegd.</p> : (
                          <div className="space-y-3">
                            {itemDecisions.map(d => (
                              <div 
                                key={d.id} 
                                onClick={() => openItem(d, 'decision')}
                                className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-md border-l-4 border-l-transparent hover:border-l-emerald-500"
                              >
                                <div className="flex-1 pr-4 space-y-1">
                                    <div className="text-xs font-black text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-1">{d.title || d.description}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                       {d.owners && d.owners.length > 0 ? d.owners.join(', ') : 'Directie'} • {d.date}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDecision(d.id); }} 
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 size={16}/>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-32 rounded-[4rem] border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
          <AlertCircle size={80} className="mb-8 opacity-10" />
          <p className="text-2xl font-black tracking-tight text-slate-300 uppercase">Geen historie</p>
          <p className="text-sm opacity-50 mt-2">U heeft nog geen vergaderingen opgeslagen in de database.</p>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 p-8 md:p-12 animate-in zoom-in-95 duration-200">
            <button onClick={closeModal} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-xs font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  {selectedItem.readable_id}
                </span>
                {selectedItem.isLegacy && (
                    <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-200 px-2 py-1 rounded-lg border border-slate-300 border-dashed flex items-center gap-1">
                        <Info size={12} /> Excel import
                    </span>
                )}
                {itemType === 'action' ? (
                     <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Clock size={12} /> Actie
                     </span>
                ) : (
                     <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Gavel size={12} /> Besluit
                     </span>
                )}
                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                   <Briefcase size={12} /> {selectedItem.topic}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-2">
                {selectedItem.title || (itemType === 'action' ? 'Actiepunt' : 'Besluit')}
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                   <Info size={14} /> Volledige omschrijving
                </label>
                <p className="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                   {selectedItem.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-2">
                        <User size={14} /> Eigenaar / verantwoordelijke
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.owners && selectedItem.owners.length > 0 ? (
                        selectedItem.owners.map(owner => (
                          <span key={owner} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                            {owner}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm italic">Niemand toegewezen</span>
                      )}
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-2">
                        <Calendar size={14} /> {itemType === 'action' ? 'Deadline' : 'Datum vastlegging'}
                    </label>
                    <div className="text-sm font-black text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 inline-block shadow-sm">
                       {(selectedItem as any).deadline || (selectedItem as any).date}
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                {selectedItem.isLegacy && (
                    <span className="text-xs text-slate-400 italic">
                        Dit item is overgenomen uit de oude administratie en heeft geen gekoppeld verslag.
                    </span>
                )}
                <div className="flex-1 flex justify-end">
                    <button 
                    onClick={closeModal}
                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-colors"
                    >
                    Sluiten
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && selectedMeeting && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
           <div className="flex items-center justify-between px-8 py-6 bg-slate-900 border-b border-slate-800 shrink-0 z-50">
              <div className="flex items-center gap-4">
                 <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                    <Printer size={20} />
                 </div>
                 <div>
                    <h3 className="text-white font-bold text-lg">Printvoorbeeld</h3>
                    <p className="text-slate-400 text-xs">Controleer de lay-out voordat u het definitieve verslag downloadt.</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={handleDownloadPDF}
                   className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
                 >
                   <Download size={18} />
                   Download verslag (PDF)
                 </button>
                 <button 
                   onClick={() => setShowPrintPreview(false)}
                   className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-900/50" onClick={(e) => e.stopPropagation()}>
              <div id="printable-area" className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[15mm] md:p-[20mm] rounded-sm transform origin-top scale-100 sm:scale-100 lg:scale-100 xl:scale-110 mb-20 transition-transform relative z-50">
                 <PrintableMeeting meeting={selectedMeeting} />
              </div>
           </div>
        </div>
      )}

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

export default ArchivePage;

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../db';
import { Meeting, Note } from '../types';
import { Calendar, Users, FileEdit, Trash2, Save, AlertCircle, ClipboardList, CheckCircle, Printer, X, Download } from 'lucide-react';
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

  useEffect(() => {
    loadMeetings();
    // Check for saved state from NewMeeting redirect
    if ((location.state as any)?.saved) {
        showToast("Vergadering succesvol gearchiveerd");
        window.history.replaceState({}, document.title);
    }
  }, []);

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

  const loadMeetings = () => {
    const list = db.getMeetings();
    const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
    setMeetings(sorted);
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
      loadMeetings();
      setIsUpdating(false);
      showToast("Notulen succesvol bijgewerkt!");
    }, 400);
  };

  const handleDeleteAction = (actionId: string) => {
    db.removeAction(selectedMeetingId, actionId);
    loadMeetings();
    showToast("Actie verwijderd.");
  };

  const handleDeleteDecision = (decisionId: string) => {
    db.removeDecision(selectedMeetingId, decisionId);
    loadMeetings();
    showToast("Besluit verwijderd.");
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

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  return (
    <div className="pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      <PageHeader title="Archief & historie" subtitle="Raadpleeg en corrigeer vastgelegde notulen.">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="w-full md:w-80">
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
          
          {selectedMeeting && (
            <button
              onClick={handlePrint}
              className="px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              title="Download als pdf"
            >
              <Printer size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="font-black text-sm uppercase tracking-widest text-slate-600 group-hover:text-emerald-700">PDF</span>
            </button>
          )}
        </div>
      </PageHeader>

      {selectedMeeting ? (
        <div className="space-y-12">
          {/* Executive Summary Info */}
          <section className="bg-slate-900 p-12 rounded-[3rem] text-white flex flex-wrap gap-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <ClipboardList size={200} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Datum & Periode</span>
              <div className="flex items-center gap-3 text-white font-black text-2xl">
                <Calendar size={24} className="text-blue-400" />
                {selectedMeeting.date} <span className="text-blue-400/40">/</span> Week {selectedMeeting.weekNumber}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Team Aanwezig</span>
              <div className="flex items-center gap-3 text-white font-bold text-lg">
                <Users size={22} className="text-blue-400" />
                {selectedMeeting.attendees.join(', ')}
              </div>
            </div>
          </section>

          {/* Fix-It station Section */}
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
                    {/* Editable Note Area */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Opgeslagen tekst</label>
                      <textarea 
                        rows={5}
                        value={editNotes[note.agendaItem] || ''}
                        onChange={(e) => setEditNotes(prev => ({ ...prev, [note.agendaItem]: e.target.value }))}
                        className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:bg-white focus:border-slate-900 outline-none transition-all resize-none font-medium leading-relaxed"
                        placeholder="Geen notulen vastgelegd voor dit onderdeel..."
                      />
                    </div>

                    {/* Historical Records Interaction */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <ClipboardList size={14} /> Actiepunten (Historie)
                        </h5>
                        {itemActions.length === 0 ? <p className="text-xs text-slate-300 italic px-2">Geen acties vastgelegd.</p> : (
                          <div className="space-y-3">
                            {itemActions.map(a => (
                              <div key={a.id} className="group flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors">
                                <div className="space-y-1">
                                  <div className="text-xs font-black text-blue-900">{a.title || a.description}</div>
                                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                                    {a.owners && a.owners.length > 0 ? a.owners.join(', ') : 'Geen eigenaar'} • {a.deadline}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteAction(a.id)} className="text-red-300 hover:text-red-600 transition-colors p-2"><Trash2 size={18}/></button>
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
                              <div key={d.id} className="group flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 hover:bg-emerald-50 transition-colors">
                                <div className="text-xs font-black text-emerald-900 flex-1 pr-4">{d.text}</div>
                                <button onClick={() => handleDeleteDecision(d.id)} className="text-red-300 hover:text-red-600 transition-colors p-2"><Trash2 size={18}/></button>
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

      {/* PRINT PREVIEW OVERLAY */}
      {showPrintPreview && selectedMeeting && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
           {/* Toolbar */}
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
                   Download Verslag (PDF)
                 </button>
                 <button 
                   onClick={() => setShowPrintPreview(false)}
                   className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
           </div>

           {/* Scrollable Document Area */}
           <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-900/50" onClick={(e) => e.stopPropagation()}>
              <div id="printable-area" className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[15mm] md:p-[20mm] rounded-sm transform origin-top scale-100 sm:scale-100 lg:scale-100 xl:scale-110 mb-20 transition-transform relative z-50">
                 <PrintableMeeting meeting={selectedMeeting} />
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

export default ArchivePage;

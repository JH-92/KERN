
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Save, Plus, PlusCircle, Trash2, 
  CheckCircle, Info, ClipboardList, Clock, User, Briefcase, Layout,
  GripVertical, List, CheckSquare, Square, X, ChevronDown, RotateCcw,
  PenTool, ListTodo, AlertCircle, Edit2, AlertTriangle, Gavel
} from 'lucide-react';
import { db, MeetingDraft } from '../db';
import { MeetingType, ActionStatus, Employee, Action, Decision, Note, Meeting, Topic } from '../types';
import { PROJECT_AGENDA, PLANNING_AGENDA } from '../constants';
import PageHeader from '../components/PageHeader';
import { CustomDatePicker } from '../components/CustomDatePicker';

const getWeekNumber = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

// Helper to get local date string YYYY-MM-DD reliably without time offsets
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Extended Type for UI state
type DraftAction = Partial<Action> & { isLocked?: boolean };
type DraftDecision = Partial<Decision> & { isLocked?: boolean };

const NewMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  
  // Load Draft or Default
  const savedDraft = useMemo(() => db.getDraft(), []);

  // Form state initialized with Draft or Local Date
  const [date, setDate] = useState(savedDraft?.date || getLocalDateString());
  const [meetingType, setMeetingType] = useState<MeetingType>((savedDraft?.meetingType as MeetingType) || MeetingType.PROJECT);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(savedDraft?.selectedAttendees || []);
  
  // Agenda states initialized with Draft
  const [notes, setNotes] = useState<Record<string, string>>(savedDraft?.notes || {});
  const [topics, setTopics] = useState<Record<string, Topic[]>>(savedDraft?.topics || {});
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>(savedDraft?.topicInputs || {});
  
  // Action & Decision Cart initialized with Draft
  const [tempActions, setTempActions] = useState<Record<string, DraftAction[]>>(savedDraft?.tempActions || {});
  const [tempDecisions, setTempDecisions] = useState<Record<string, DraftDecision[]>>(savedDraft?.tempDecisions || {});
  
  // Past Actions State
  const [pastActions, setPastActions] = useState<Action[]>([]);
  
  // UI States (Alert replacement)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentAgenda = useMemo(() => {
    return meetingType === MeetingType.PROJECT ? PROJECT_AGENDA : PLANNING_AGENDA;
  }, [meetingType]);

  useEffect(() => {
    setEmployees(db.getEmployees());
    const allActions = db.getAllActions();
    setPastActions(allActions.filter(a => a.status !== ActionStatus.DONE));
  }, []);

  useEffect(() => {
    const draft: MeetingDraft = {
      date,
      meetingType,
      selectedAttendees,
      notes,
      topics,
      topicInputs,
      tempActions,
      tempDecisions
    };
    db.saveDraft(draft);
  }, [date, meetingType, selectedAttendees, notes, topics, topicInputs, tempActions, tempDecisions]);

  const weekNumber = useMemo(() => getWeekNumber(date), [date]);

  const hasDraftData = selectedAttendees.length > 0 || Object.keys(notes).length > 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleNewStart = () => {
    setShowResetConfirm(true);
  };

  const handleFullReset = () => {
    db.clearDraft();
    
    // Reset alle lokale scherm-velden naar leeg:
    setDate(getLocalDateString());
    setMeetingType(MeetingType.PROJECT);
    setSelectedAttendees([]);
    setNotes({});
    setTopics({});
    setTopicInputs({});
    setTempActions({});
    setTempDecisions({});
    
    setShowResetConfirm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Systeem volledig hersteld.");
  };

  const handleTogglePastAction = (actionId: string) => {
    const newStatus = db.toggleActionStatus(actionId);
    setPastActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus } : a));
  };

  const handleSave = () => {
    if (selectedAttendees.length === 0) {
      showToast("Selecteer ten minste één aanwezige.");
      return;
    }

    const meetingId = Date.now().toString();
    const formattedNotes: Note[] = [];
    currentAgenda.forEach(item => {
      const hasContent = notes[item] || (topics[item] && topics[item].length > 0);
      if (hasContent) {
        formattedNotes.push({
          agendaItem: item,
          content: notes[item] || '',
          topics: topics[item] || []
        });
      }
    });

    let actionCounter = db.getAllActions().length + 1;
    const formattedActions: Action[] = [];
    Object.entries(tempActions).forEach(([item, list]) => {
      if (!currentAgenda.includes(item)) return;
      (list as DraftAction[]).forEach((a) => {
        if (a.title && a.description) {
          formattedActions.push({
            id: `${meetingId}-act-${actionCounter}`,
            readable_id: `ACT-26-${actionCounter.toString().padStart(3, '0')}`,
            meetingId,
            title: a.title,
            description: a.description,
            owners: a.owners || [], 
            deadline: a.deadline || date,
            status: ActionStatus.OPEN,
            topic: item,
            originType: meetingType
          });
          actionCounter++;
        }
      });
    });

    let decisionCounter = db.getMeetings().flatMap(m => m.decisions).length + 1;
    const formattedDecisions: Decision[] = [];
    Object.entries(tempDecisions).forEach(([item, list]) => {
      if (!currentAgenda.includes(item)) return;
      (list as DraftDecision[]).forEach((d) => {
        if (d.title && d.description) {
          formattedDecisions.push({
            id: `${meetingId}-bes-${decisionCounter}`,
            readable_id: `BES-26-${decisionCounter.toString().padStart(3, '0')}`,
            meetingId,
            title: d.title,
            description: d.description,
            owners: d.owners || [],
            date: d.date || date,
            topic: item
          });
          decisionCounter++;
        }
      });
    });

    const newMeeting: Meeting = {
      id: meetingId,
      date,
      weekNumber,
      type: meetingType,
      attendees: selectedAttendees,
      notes: formattedNotes,
      actions: formattedActions,
      decisions: formattedDecisions
    };

    db.saveMeeting(newMeeting);
    db.clearDraft();
    navigate('/archief', { state: { saved: true } }); // Pass state to trigger toast in Archive
  };

  // --- UI Handlers ---
  const handleAddEmployee = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newEmployeeName.trim()) return;
    const exists = employees.some(e => e.name.toLowerCase() === newEmployeeName.trim().toLowerCase());
    if (exists) {
        showToast("Deze naam bestaat al.");
        return;
    }
    db.saveEmployee({ name: newEmployeeName.trim() });
    setEmployees(db.getEmployees());
    setNewEmployeeName('');
  };

  const toggleAttendee = (name: string) => {
    setSelectedAttendees(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const handleAddTopic = (item: string) => {
    const text = topicInputs[item]?.trim();
    if (!text) return;
    setTopics(prev => ({
      ...prev,
      [item]: [...(prev[item] || []), { id: Date.now().toString(), text, isCompleted: false }]
    }));
    setTopicInputs(prev => ({ ...prev, [item]: '' }));
  };

  const toggleTopic = (item: string, topicId: string) => {
    setTopics(prev => ({
      ...prev,
      [item]: prev[item]?.map(t => t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t) || []
    }));
  };

  const removeTopic = (item: string, topicId: string) => {
    setTopics(prev => ({ ...prev, [item]: prev[item]?.filter(t => t.id !== topicId) || [] }));
  };

  // --- ACTIONS LOGIC ---
  const addActionToCart = (item: string) => {
    setTempActions(prev => ({ 
      ...prev, 
      [item]: [...(prev[item] || []), { title: '', description: '', owners: [], deadline: date, isLocked: false }] 
    }));
  };

  const updateAction = (item: string, index: number, field: keyof Action, value: any) => {
    setTempActions(prev => {
      const newList = [...(prev[item] || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [item]: newList };
    });
  };

  const toggleActionOwner = (item: string, index: number, ownerName: string) => {
    setTempActions(prev => {
      const newList = [...(prev[item] || [])];
      const currentOwners = newList[index].owners || [];
      const isSelected = currentOwners.includes(ownerName);
      newList[index] = {
        ...newList[index],
        owners: isSelected ? currentOwners.filter(o => o !== ownerName) : [...currentOwners, ownerName]
      };
      return { ...prev, [item]: newList };
    });
  };

  const removeAction = (item: string, index: number) => {
    setTempActions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== index) }));
  };

  const lockAction = (item: string, index: number) => {
    const action = tempActions[item]?.[index];
    if (!action) return;
    
    if (!action.title?.trim()) {
        showToast("Vul een titel in om de actie op te slaan.");
        return;
    }

    setTempActions(prev => {
        const newList = [...(prev[item] || [])];
        newList[index] = { ...newList[index], isLocked: true };
        return { ...prev, [item]: newList };
    });
  };

  const unlockAction = (item: string, index: number) => {
    setTempActions(prev => {
        const newList = [...(prev[item] || [])];
        newList[index] = { ...newList[index], isLocked: false };
        return { ...prev, [item]: newList };
    });
  };

  // --- DECISIONS LOGIC ---
  const addDecisionToCart = (item: string) => {
    setTempDecisions(prev => ({ 
      ...prev, 
      [item]: [...(prev[item] || []), { title: '', description: '', owners: [], date: date, isLocked: false }] 
    }));
  };

  const updateDecision = (item: string, index: number, field: keyof Decision, value: any) => {
    setTempDecisions(prev => {
      const newList = [...(prev[item] || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [item]: newList };
    });
  };

  const toggleDecisionOwner = (item: string, index: number, ownerName: string) => {
    setTempDecisions(prev => {
      const newList = [...(prev[item] || [])];
      const currentOwners = newList[index].owners || [];
      const isSelected = currentOwners.includes(ownerName);
      newList[index] = {
        ...newList[index],
        owners: isSelected ? currentOwners.filter(o => o !== ownerName) : [...currentOwners, ownerName]
      };
      return { ...prev, [item]: newList };
    });
  };

  const removeDecision = (item: string, index: number) => {
    setTempDecisions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== index) }));
  };

  const lockDecision = (item: string, index: number) => {
    const decision = tempDecisions[item]?.[index];
    if (!decision) return;
    
    if (!decision.title?.trim()) {
        showToast("Vul een titel in om het besluit vast te leggen.");
        return;
    }

    setTempDecisions(prev => {
        const newList = [...(prev[item] || [])];
        newList[index] = { ...newList[index], isLocked: true };
        return { ...prev, [item]: newList };
    });
  };

  const unlockDecision = (item: string, index: number) => {
    setTempDecisions(prev => {
        const newList = [...(prev[item] || [])];
        newList[index] = { ...newList[index], isLocked: false };
        return { ...prev, [item]: newList };
    });
  };

  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      <PageHeader title="Nieuwe vergadering" subtitle="Configureer het overleg en start de verslaglegging.">
         <div className="flex flex-col sm:flex-row items-center gap-4 relative z-20">
           {hasDraftData && (
             <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-100 shadow-sm animate-pulse">
               <PenTool size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Concept in uitvoering</span>
             </div>
           )}
           <button 
             onClick={handleNewStart}
             className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 font-black text-xs uppercase tracking-widest hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95 cursor-pointer relative z-20"
           >
             <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
             <span>NIEUWE START</span>
           </button>
         </div>
      </PageHeader>

      <div className="space-y-12">
        {/* Config Block */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative group">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ClipboardList size={16} /> Overleg configuratie
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">Datum</label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <CustomDatePicker 
                            value={date} 
                            onChange={(newDate) => setDate(newDate)} 
                            placeholder="Selecteer datum"
                          />
                        </div>
                        <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl font-black text-center min-w-[80px]">
                          <div className="text-[8px] uppercase opacity-50 mb-1">Week</div>
                          <div className="text-xl">{weekNumber}</div>
                        </div>
                      </div>
                   </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">Type overleg</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                      onClick={() => setMeetingType(MeetingType.PROJECT)}
                      className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        meetingType === MeetingType.PROJECT 
                        ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Briefcase size={16} />
                      Projectleidersoverleg
                    </button>
                    <button
                      onClick={() => setMeetingType(MeetingType.PLANNING)}
                      className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        meetingType === MeetingType.PLANNING 
                        ? 'bg-white text-emerald-600 shadow-lg scale-[1.02]' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Layout size={16} />
                      Planningsoverleg
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={16} /> Wie zijn er aanwezig?
              </h3>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 h-[420px] flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar">
                  {employees.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Users size={32} className="mb-3 opacity-50"/>
                        <span className="text-xs font-black uppercase tracking-widest">Geen deelnemers</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {employees.map(emp => (
                        <div key={emp.id} className="group flex items-center gap-2">
                            <button 
                              onClick={() => toggleAttendee(emp.name)}
                              className={`flex-1 flex items-center justify-start gap-3 p-3 rounded-2xl border text-xs font-black transition-all ${
                                selectedAttendees.includes(emp.name) 
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg transform scale-[1.02]' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors ${
                                selectedAttendees.includes(emp.name) ? 'bg-emerald-400 border-emerald-400 text-slate-900' : 'bg-slate-100 border-slate-300'
                              }`}>
                                {selectedAttendees.includes(emp.name) && <Plus size={14} strokeWidth={4} />}
                              </div>
                              <span className="truncate uppercase tracking-wide text-left">{emp.name}</span>
                            </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddEmployee} className="pt-4 border-t border-slate-200 mt-auto">
                   <div className="flex items-center gap-2">
                       <input 
                           type="text"
                           value={newEmployeeName}
                           onChange={(e) => setNewEmployeeName(e.target.value)}
                           placeholder="Naam toevoegen..."
                           className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-medium"
                       />
                       <button 
                           type="submit"
                           disabled={!newEmployeeName.trim()}
                           className="bg-blue-600 disabled:bg-slate-200 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-100 disabled:shadow-none"
                       >
                           <Plus size={16} strokeWidth={3} />
                       </button>
                   </div>
               </form>
              </div>
            </div>
          </div>
        </section>

        {/* Agenda Loop */}
        <div className="space-y-16">
          {currentAgenda.map((item) => (
            <div key={item} className="animate-in fade-in duration-500">
              <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100">
                <div className="bg-slate-900 px-12 py-8 flex items-center justify-between rounded-t-[3rem]">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">{item}</h3>
                  <div className="hidden md:block bg-white/10 px-4 py-2 rounded-xl text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Onderdeel {currentAgenda.indexOf(item) + 1}
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  {/* Topics & Notes */}
                  <div className="space-y-10">
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                         <List size={14} /> Agendapunten
                       </label>
                       
                       <div className="space-y-3">
                         {topics[item]?.map((topic) => (
                           <div key={topic.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${
                             topic.isCompleted 
                               ? 'bg-emerald-50 border-emerald-100 opacity-80' 
                               : 'bg-slate-50 border-slate-200'
                           }`}>
                             <div className="cursor-grab text-slate-300 hover:text-slate-500">
                               <GripVertical size={16} />
                             </div>
                             <button onClick={() => toggleTopic(item, topic.id)} className="transition-colors">
                               {topic.isCompleted 
                                 ? <CheckSquare size={20} className="text-emerald-500" /> 
                                 : <Square size={20} className="text-slate-300 hover:text-slate-400" />
                               }
                             </button>
                             <span className={`flex-1 text-sm font-bold transition-all ${
                               topic.isCompleted ? 'text-emerald-800 line-through decoration-emerald-300' : 'text-slate-700'
                             }`}>
                               {topic.text}
                             </span>
                             <button onClick={() => removeTopic(item, topic.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                               <X size={16} />
                             </button>
                           </div>
                         ))}
                         <div className="flex items-center gap-3 pl-3 pr-2 py-2 bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-sm">
                            <Plus size={16} className="text-slate-400" />
                            <input 
                              type="text"
                              value={topicInputs[item] || ''}
                              onChange={(e) => setTopicInputs(prev => ({ ...prev, [item]: e.target.value }))}
                              placeholder="Typ een onderwerp..."
                              className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                            />
                            <button onClick={() => handleAddTopic(item)} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-blue-600 transition-colors">
                              <Plus size={14} strokeWidth={3} />
                            </button>
                         </div>
                       </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Notulen</label>
                      <textarea 
                        rows={6}
                        value={notes[item] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [item]: e.target.value }))}
                        placeholder={`Leg hier de bespreekpunten vast...`}
                        className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:bg-white focus:border-emerald-500 focus:ring-0 outline-none transition-all resize-none font-medium text-lg text-slate-700 leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Actions */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          <Plus size={16} /> Actie toevoegen
                        </h4>
                        <button onClick={() => addActionToCart(item)} className="bg-blue-600 text-white p-2 rounded-full hover:scale-110 transition-transform">
                          <Plus size={20} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {tempActions[item]?.map((action, idx) => (
                          <div key={`act-input-${idx}`} className={`bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 transition-all ${action.isLocked ? 'p-0 overflow-hidden' : 'p-6'}`}>
                             {!action.isLocked ? (
                               // EDIT MODE
                               <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel</label>
                                    <input 
                                      type="text"
                                      placeholder="Korte samenvatting (bijv. Offerte opvragen)"
                                      value={action.title || ''}
                                      onChange={(e) => updateAction(item, idx, 'title', e.target.value)}
                                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-800"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                                    <textarea 
                                      placeholder="Details van de actie..."
                                      value={action.description || ''}
                                      onChange={(e) => updateAction(item, idx, 'description', e.target.value)}
                                      className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 transition-colors"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <select 
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            toggleActionOwner(item, idx, e.target.value);
                                            e.target.value = '';
                                          }
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                     >
                                        <option value="">+ Eigenaar</option>
                                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                     </select>
                                     <CustomDatePicker
                                        value={action.deadline || date}
                                        onChange={(newDate) => updateAction(item, idx, 'deadline', newDate)}
                                        placeholder="Deadline"
                                     />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {action.owners?.map(owner => (
                                          <button key={owner} onClick={() => toggleActionOwner(item, idx, owner)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                             {owner} <X size={10} />
                                          </button>
                                      ))}
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                    <button onClick={() => removeAction(item, idx)} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1">
                                      <Trash2 size={14}/> Verwijderen
                                    </button>
                                    <button 
                                      onClick={() => lockAction(item, idx)}
                                      className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"
                                    >
                                        <CheckCircle size={16} />
                                        <span className="text-xs font-black uppercase tracking-widest">Actie Opslaan</span>
                                    </button>
                                  </div>
                               </div>
                             ) : (
                               // READ ONLY MODE
                               <div className="flex items-start justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                                  <div className="flex-1 pr-4">
                                      <h5 className="font-bold text-slate-800 text-sm mb-1">{action.title}</h5>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                             <Clock size={10} /> {action.deadline}
                                          </div>
                                          {action.owners?.map(owner => (
                                              <span key={owner} className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                                  {owner}
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                      <button onClick={() => unlockAction(item, idx)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                          <Edit2 size={16} />
                                      </button>
                                      <button onClick={() => removeAction(item, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Decisions */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                          <PlusCircle className="w-6 h-6 text-emerald-600 mr-3" /> Besluit vastleggen
                        </h4>
                        <button 
                          onClick={() => addDecisionToCart(item)} 
                          className="bg-emerald-600 text-white p-2 rounded-full hover:scale-110 transition-transform"
                        >
                            <Plus size={20} />
                        </button>
                      </div>

                      <div className="space-y-4">
                         {tempDecisions[item]?.map((decision, idx) => (
                           <div key={`dec-input-${idx}`} className={`bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 transition-all ${decision.isLocked ? 'p-0 overflow-hidden' : 'p-6'}`}>
                              {!decision.isLocked ? (
                                 // EDIT MODE
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel</label>
                                      <input 
                                        type="text"
                                        placeholder="Korte titel (bijv. Budget goedgekeurd)"
                                        value={decision.title || ''}
                                        onChange={(e) => updateDecision(item, idx, 'title', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-800"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                                      <textarea 
                                        placeholder="Details van het besluit..."
                                        value={decision.description || ''}
                                        onChange={(e) => updateDecision(item, idx, 'description', e.target.value)}
                                        className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 transition-colors"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       <select 
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              toggleDecisionOwner(item, idx, e.target.value);
                                              e.target.value = '';
                                            }
                                          }}
                                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none"
                                       >
                                          <option value="">+ Eigenaar</option>
                                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                       </select>
                                       <CustomDatePicker
                                          value={decision.date || date}
                                          onChange={(newDate) => updateDecision(item, idx, 'date', newDate)}
                                          placeholder="Datum"
                                       />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {decision.owners?.map(owner => (
                                            <button key={owner} onClick={() => toggleDecisionOwner(item, idx, owner)} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                               {owner} <X size={10} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                      <button onClick={() => removeDecision(item, idx)} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1">
                                        <Trash2 size={14}/> Verwijderen
                                      </button>
                                      <button 
                                        onClick={() => lockDecision(item, idx)}
                                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"
                                      >
                                          <Gavel size={16} />
                                          <span className="text-xs font-black uppercase tracking-widest">Besluit Opslaan</span>
                                      </button>
                                    </div>
                                 </div>
                              ) : (
                                 // READ ONLY MODE
                                 <div className="flex items-start justify-between p-4 bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors border-l-4 border-emerald-500">
                                    <div className="flex-1 pr-4">
                                        <h5 className="font-bold text-slate-800 text-sm mb-1">{decision.title}</h5>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                               <Clock size={10} /> {decision.date}
                                            </div>
                                            {decision.owners?.map(owner => (
                                                <span key={owner} className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                                                    {owner}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => unlockDecision(item, idx)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-100 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => removeDecision(item, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                 </div>
                              )}
                           </div>
                         ))}
                         {/* Empty State hint if needed, or left clean */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* FINAL SAVE */}
          <div className="mt-20 flex flex-col items-center gap-6">
            <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full max-w-2xl py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-4 shadow-2xl shadow-emerald-200 transition-all hover:scale-[1.02]">
              <CheckCircle size={28} />
              VERGADERING OPSLAAN
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOM CONFIRM MODAL FOR NEW START */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <RotateCcw size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Weet je het zeker?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Alle niet-opgeslagen gegevens van dit overleg worden definitief verwijderd.
            </p>
            <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-colors">
                    Annuleren
                </button>
                <button onClick={handleFullReset} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-red-700 transition-colors">
                    Wis alles
                </button>
            </div>
            </div>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default NewMeetingPage;

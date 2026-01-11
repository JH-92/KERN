import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Save, Plus, Trash2, 
  CheckCircle, ClipboardList, Clock, Briefcase, Layout,
  GripVertical, List, CheckSquare, Square, X, ChevronDown, RotateCcw,
  PenTool, AlertTriangle, Gavel, Play, Pause, Hourglass, Zap
} from 'lucide-react';
import { db, MeetingDraft } from '../db';
import { MeetingType, ActionStatus, Employee, Action, Decision, Note, Meeting, Topic, VotingState } from '../types';
import { PROJECT_AGENDA, PLANNING_AGENDA } from '../constants';
import PageHeader from '../components/PageHeader';
import { CustomDatePicker } from '../components/CustomDatePicker';

// --- TYPES ---
type DraftAction = Partial<Action> & { isLocked?: boolean };
type DraftDecision = Partial<Decision> & { isLocked?: boolean };

// --- HELPERS ---
const getWeekNumber = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const formatStopwatch = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const NewMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  
  // --- STATE: APP MODE & USERS ---
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  // --- STATE: MEETING CONFIG ---
  const savedDraft = useMemo(() => db.getDraft(), []);
  const [date, setDate] = useState(savedDraft?.date || new Date().toLocaleDateString('en-CA'));
  const [meetingType, setMeetingType] = useState<MeetingType>((savedDraft?.meetingType as MeetingType) || MeetingType.PROJECT);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(savedDraft?.selectedAttendees || []);

  // --- STATE: AGENDA & CONTENT ---
  const [notes, setNotes] = useState<Record<string, string>>(savedDraft?.notes || {});
  const [topics, setTopics] = useState<Record<string, Topic[]>>(savedDraft?.topics || {});
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>(savedDraft?.topicInputs || {});
  
  // --- STATE: ACTIONS & DECISIONS CART ---
  const [tempActions, setTempActions] = useState<Record<string, DraftAction[]>>(savedDraft?.tempActions || {});
  const [tempDecisions, setTempDecisions] = useState<Record<string, DraftDecision[]>>(savedDraft?.tempDecisions || {});

  // --- STATE: TIMER & VOTING (LIVE SYNC) ---
  const [stopwatchTime, setStopwatchTime] = useState(db.getTimerElapsed());
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(db.getTimerState().isRunning);
  const [timerMessage, setTimerMessage] = useState<string | null>(null);
  const [votingState, setVotingState] = useState<VotingState>({ isActive: false, topic: '', votes: [], startTime: 0 });
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [showVoteBubble, setShowVoteBubble] = useState(false);

  // --- STATE: UI ---
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [breakModal, setBreakModal] = useState<{isOpen: boolean, title: string, message: string}>({ isOpen: false, title: '', message: '' });

  // --- REFS ---
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const [particleStyle, setParticleStyle] = useState<React.CSSProperties>({});
  const focusedNoteRef = useRef<string | null>(null);
  const milestonesTriggered = useRef<Set<string>>(new Set());
  const noteSaveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const sessionId = useMemo(() => db.getSessionId(), []);

  // --- DERIVED ---
  const weekNumber = useMemo(() => getWeekNumber(date), [date]);
  const currentAgenda = useMemo(() => meetingType === MeetingType.PROJECT ? PROJECT_AGENDA : PLANNING_AGENDA, [meetingType]);
  const hasDraftData = selectedAttendees.length > 0 || Object.keys(notes).length > 0;
  const activeVotersCount = votingState.votes.length;
  const totalVoters = Math.max(activeUserCount, 1);
  const isMajority = activeVotersCount > (totalVoters / 2);

  // --- EFFECT: INITIAL LOAD ---
  useEffect(() => {
    setEmployees(db.getEmployees());
    setIsDirectorMode(document.documentElement.classList.contains('director-mode'));
    
    // Initial Sync
    setVotingState(db.getVotingState());
    setActiveUserCount(db.getActiveUserCount());
    setStopwatchTime(db.getTimerElapsed());
    setIsStopwatchRunning(db.getTimerState().isRunning);
  }, []);

  // --- EFFECT: LIVE SYNC ENGINE ---
  useEffect(() => {
    const handleSync = () => {
        // 1. Sync Timer State
        const dbTimerState = db.getTimerState();
        setIsStopwatchRunning(dbTimerState.isRunning);
        setStopwatchTime(db.getTimerElapsed());

        // 2. Sync Voting & Presence
        setVotingState(db.getVotingState());
        setActiveUserCount(db.getActiveUserCount());
        setIsDirectorMode(document.documentElement.classList.contains('director-mode'));

        // 3. Sync Notes (Granular merge to avoid overwriting focused field)
        const remoteDraft = db.getDraft();
        if (remoteDraft && remoteDraft.notes) {
            setNotes(prev => {
                const newNotes = { ...remoteDraft.notes };
                // If user is typing in a specific note, keep local state for that key
                if (focusedNoteRef.current && prev[focusedNoteRef.current] !== undefined) {
                    newNotes[focusedNoteRef.current] = prev[focusedNoteRef.current];
                }
                return newNotes;
            });
            // Sync other draft fields if changed remotely
            if (remoteDraft.selectedAttendees) setSelectedAttendees(remoteDraft.selectedAttendees);
            if (remoteDraft.meetingType) setMeetingType(remoteDraft.meetingType as MeetingType);
            if (remoteDraft.date) setDate(remoteDraft.date);
            if (remoteDraft.topics) setTopics(remoteDraft.topics);
            if (remoteDraft.tempActions) setTempActions(remoteDraft.tempActions);
            if (remoteDraft.tempDecisions) setTempDecisions(remoteDraft.tempDecisions);
        }
    };

    window.addEventListener('kern-data-update', handleSync);
    return () => window.removeEventListener('kern-data-update', handleSync);
  }, []);

  // --- EFFECT: TIMER INTERVAL & MILESTONES ---
  useEffect(() => {
    let interval: any;
    // Only run interval if timer is officially running
    if (isStopwatchRunning) {
        interval = setInterval(() => {
            const elapsed = db.getTimerElapsed();
            setStopwatchTime(elapsed);
            
            // Check Milestones
            const mins = Math.floor(elapsed / 60);
            const trigger = (k: string) => milestonesTriggered.current.add(k);
            const hasTriggered = (k: string) => milestonesTriggered.current.has(k);

            if (mins === 55 && !hasTriggered('55min')) {
                trigger('55min');
                setBreakModal({ isOpen: true, title: 'Koffiepauze?', message: 'Het uur is bijna om. Tijd voor een korte pauze?' });
            }
            if (mins === 115 && !hasTriggered('115min')) {
                trigger('115min');
                setBreakModal({ isOpen: true, title: 'Twee uur voorbij', message: 'De concentratieboog neemt af. Tijd om af te ronden?' });
            }
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // --- EFFECT: AUTO SAVE DRAFT ---
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
  }, [date, meetingType, selectedAttendees, topics, topicInputs, tempActions, tempDecisions]); 
  // Note: notes are saved via debounced handler, not here to avoid loop

  // --- HANDLERS ---

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleTimer = () => {
      if (isStopwatchRunning) {
          db.pauseTimer();
      } else {
          db.startTimer();
      }
      setIsStopwatchRunning(!isStopwatchRunning);
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!votingState.isActive) {
        db.startVote();
    }
    db.castVote(sessionId);
    
    if (isDirectorMode) {
        db.castVote(`${sessionId}_director_power`);
        showToast("⚖️ Director Power: Dubbele stem uitgebracht!");
    }
    setShowVoteBubble(true);
  };

  const handleNoteChange = (item: string, value: string) => {
      setNotes(prev => ({ ...prev, [item]: value }));
      
      if (noteSaveTimeoutRef.current[item]) clearTimeout(noteSaveTimeoutRef.current[item]);
      
      noteSaveTimeoutRef.current[item] = setTimeout(() => {
          db.updateDraftNote(item, value);
      }, 1000);
  };

  const handleAddEmployee = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newEmployeeName.trim()) return;
      db.saveEmployee({ name: newEmployeeName.trim() });
      setEmployees(db.getEmployees());
      setNewEmployeeName('');
  };

  const toggleAttendee = (name: string) => {
      setSelectedAttendees(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const handleSave = () => {
    if (selectedAttendees.length === 0) {
        showToast("Selecteer ten minste één aanwezige.");
        return;
    }

    // Animation Logic
    if (saveBtnRef.current) {
        const btnRect = saveBtnRef.current.getBoundingClientRect();
        setParticleStyle({
            top: btnRect.top,
            left: btnRect.left,
            '--tx': `-${window.innerWidth/2}px`,
            '--ty': '0px'
        } as React.CSSProperties);
        setIsSaving(true);
    }

    setTimeout(() => {
        const meetingId = Date.now().toString();
        // Convert notes
        const formattedNotes: Note[] = [];
        currentAgenda.forEach(item => {
            if (notes[item] || (topics[item] && topics[item].length > 0)) {
                formattedNotes.push({
                    agendaItem: item,
                    content: notes[item] || '',
                    topics: topics[item] || []
                });
            }
        });

        // Convert Actions
        let actionCounter = db.getAllActions().length + 1;
        const formattedActions: Action[] = [];
        Object.entries(tempActions).forEach(([item, list]) => {
            list.forEach(a => {
                if (a.title) {
                    formattedActions.push({
                        id: `${meetingId}-act-${actionCounter}`,
                        readable_id: `ACT-26-${actionCounter.toString().padStart(3, '0')}`,
                        meetingId,
                        title: a.title,
                        description: a.description || '',
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

        // Convert Decisions
        let decisionCounter = db.getAllDecisions().length + 1;
        const formattedDecisions: Decision[] = [];
        Object.entries(tempDecisions).forEach(([item, list]) => {
            list.forEach(d => {
                if (d.title) {
                    formattedDecisions.push({
                        id: `${meetingId}-dec-${decisionCounter}`,
                        readable_id: `BES-26-${decisionCounter.toString().padStart(3, '0')}`,
                        meetingId,
                        title: d.title,
                        description: d.description || '',
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
            decisions: formattedDecisions,
            duration: formatStopwatch(stopwatchTime)
        };

        db.saveMeeting(newMeeting);
        db.clearDraft();
        db.stopVote();
        db.resetTimer();
        setIsSaving(false);
        navigate('/archief', { state: { saved: true } });
    }, 1000);
  };

  const handleFullReset = () => {
      db.clearDraft();
      db.stopVote();
      db.resetTimer();
      setNotes({});
      setTopics({});
      setTempActions({});
      setTempDecisions({});
      setSelectedAttendees([]);
      setStopwatchTime(0);
      setIsStopwatchRunning(false);
      setShowResetConfirm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast("Systeem hersteld.");
  };

  // --- RENDER HELPERS ---
  const addActionToCart = (item: string) => setTempActions(prev => ({ ...prev, [item]: [...(prev[item] || []), { title: '', description: '', owners: [], deadline: date, isLocked: false }] }));
  const updateAction = (item: string, idx: number, field: keyof Action, val: any) => setTempActions(prev => { const arr = [...(prev[item]||[])]; arr[idx] = { ...arr[idx], [field]: val }; return { ...prev, [item]: arr }; });
  const toggleActionOwner = (item: string, idx: number, owner: string) => setTempActions(prev => { const arr = [...(prev[item]||[])]; const owners = arr[idx].owners || []; arr[idx].owners = owners.includes(owner) ? owners.filter(o => o!==owner) : [...owners, owner]; return { ...prev, [item]: arr }; });
  
  // --- JSX ---
  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      {isSaving && <div className="data-flow-particle" style={particleStyle}></div>}

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-8 right-8 z-[9999] group flex flex-col items-end gap-3 no-blur">
         <div className={`bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-2 transition-all origin-bottom-right duration-300 w-64 ${showVoteBubble || votingState.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}>
             <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                     {isMajority ? 'Tijd om af te ronden!' : 'Volgende punt?'}
                 </h4>
                 {votingState.isActive && (
                     <button onClick={() => db.stopVote()} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
                 )}
             </div>
             <p className="text-xs font-bold text-slate-300 mb-3 leading-snug">
                 {isMajority ? "De meerderheid wil doorgaan." : "Stem om door te gaan naar het volgende punt."}
             </p>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-500 ${isMajority ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(activeVotersCount / totalVoters) * 100}%` }}></div>
             </div>
         </div>

         <button
            onClick={handleVoteClick}
            className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative ${isMajority ? 'bg-amber-500 hover:bg-amber-600 animate-bounce' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
         >
            <Hourglass size={28} />
            {activeVotersCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white">
                    {activeVotersCount}
                </div>
            )}
         </button>
      </div>

      <PageHeader title="Nieuwe vergadering" subtitle="Configureer het overleg en start de verslaglegging.">
         <div className="flex flex-col sm:flex-row items-center gap-4 relative z-20">
           {hasDraftData && (
             <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-100 shadow-sm animate-pulse">
               <PenTool size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Concept in uitvoering</span>
             </div>
           )}
           <button onClick={() => setShowResetConfirm(true)} className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-xl text-slate-400 font-black text-xs uppercase tracking-widest hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95 cursor-pointer relative z-20">
             <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
             <span>NIEUWE START</span>
           </button>
         </div>
      </PageHeader>

      <div className="space-y-12">
        {/* CONFIG SECTION */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative group">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* LEFT: TIMER & METADATA */}
            <div className="space-y-8">
              {/* TIMER */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
                 <div className="flex items-center justify-between w-full mb-2">
                     <div className="flex-1 mr-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 transition-colors duration-300">
                            Vergaderduur
                        </span>
                        <div className={`text-3xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${(!isStopwatchRunning && stopwatchTime > 0) ? 'text-amber-500' : 'text-slate-900'}`}>
                            {formatStopwatch(stopwatchTime)}
                        </div>
                     </div>
                     <button 
                        onClick={handleToggleTimer}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all transform active:scale-95 shrink-0 ${isStopwatchRunning ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 shadow-red-100' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`}
                     >
                        {isStopwatchRunning ? <Pause size={18} /> : <Play size={18} />}
                        {isStopwatchRunning ? 'Pauzeren' : 'Start timer'}
                     </button>
                 </div>
                 {/* Milestones Area */}
                 <div className={`mt-2 h-6 overflow-hidden transition-all duration-500 ${timerMessage ? 'opacity-100' : 'opacity-0'}`}>
                     {timerMessage && (
                         <div className="flex items-center gap-2 text-xs font-bold text-slate-500 animate-in slide-in-from-top-2">
                             <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                             {timerMessage}
                         </div>
                     )}
                 </div>
              </div>

              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ClipboardList size={16} /> Overleg configuratie
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">Datum</label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <CustomDatePicker value={date} onChange={(d) => setDate(d)} placeholder="Selecteer datum" />
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
                      className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${meetingType === MeetingType.PROJECT ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Briefcase size={16} /> <span className="hidden sm:inline">Project</span>
                    </button>
                    <button
                      onClick={() => setMeetingType(MeetingType.PLANNING)}
                      className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${meetingType === MeetingType.PLANNING ? 'bg-white text-emerald-600 shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Layout size={16} /> <span className="hidden sm:inline">Planning</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: ATTENDEES */}
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
                              className={`flex-1 flex items-center justify-start gap-3 p-3 rounded-2xl border text-xs font-black transition-all ${selectedAttendees.includes(emp.name) ? 'bg-slate-900 border-slate-900 text-white shadow-lg transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors ${selectedAttendees.includes(emp.name) ? 'bg-emerald-400 border-emerald-400 text-slate-900' : 'bg-slate-100 border-slate-300'}`}>
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
                       <button type="submit" disabled={!newEmployeeName.trim()} className="bg-blue-600 disabled:bg-slate-200 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-100 disabled:shadow-none">
                           <Plus size={16} strokeWidth={3} />
                       </button>
                   </div>
               </form>
              </div>
            </div>
          </div>
        </section>

        {/* AGENDA ITEMS LOOP */}
        <div className="space-y-16">
          {currentAgenda.map((item, index) => (
            <div key={item} id={`agenda-item-${index}`} className="animate-in fade-in duration-500 scroll-mt-24">
              <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100">
                <div className="bg-slate-900 px-12 py-8 flex items-center justify-between rounded-t-[3rem]">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">{item}</h3>
                  <div className="hidden md:block bg-white/10 px-4 py-2 rounded-xl text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Onderdeel {currentAgenda.indexOf(item) + 1}
                  </div>
                </div>
                
                <div className="p-8 md:p-12 space-y-12">
                   {/* NOTES & TOPICS */}
                  <div className="space-y-10">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                         <List size={14} /> Agendapunten
                      </label>
                      <div className="space-y-3">
                         {topics[item]?.map((topic) => (
                           <div key={topic.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${topic.isCompleted ? 'bg-emerald-50 border-emerald-100 opacity-80' : 'bg-slate-50 border-slate-200'}`}>
                             <div className="cursor-grab text-slate-300 hover:text-slate-500"><GripVertical size={16} /></div>
                             <button onClick={() => setTopics(prev => ({ ...prev, [item]: prev[item]?.map(t => t.id === topic.id ? { ...t, isCompleted: !t.isCompleted } : t) || [] }))}>
                               {topic.isCompleted ? <CheckSquare size={20} className="text-emerald-500" /> : <Square size={20} className="text-slate-300 hover:text-slate-400" />}
                             </button>
                             <span className={`flex-1 text-sm font-bold ${topic.isCompleted ? 'text-emerald-800 line-through' : 'text-slate-700'}`}>{topic.text}</span>
                             <button onClick={() => setTopics(prev => ({ ...prev, [item]: prev[item]?.filter(t => t.id !== topic.id) || [] }))} className="text-slate-300 hover:text-red-400 p-1"><X size={16} /></button>
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
                            <button 
                                onClick={() => {
                                    const text = topicInputs[item]?.trim();
                                    if (text) {
                                        setTopics(prev => ({ ...prev, [item]: [...(prev[item] || []), { id: Date.now().toString(), text, isCompleted: false }] }));
                                        setTopicInputs(prev => ({ ...prev, [item]: '' }));
                                    }
                                }} 
                                className="bg-slate-900 text-white p-2 rounded-xl hover:bg-blue-600 transition-colors"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                         </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Notulen (Live Sync)</label>
                      <textarea 
                        rows={6}
                        value={notes[item] || ''}
                        onChange={(e) => handleNoteChange(item, e.target.value)}
                        onFocus={() => focusedNoteRef.current = item}
                        onBlur={() => focusedNoteRef.current = null}
                        placeholder={`Leg hier de bespreekpunten vast...`}
                        className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:bg-white focus:border-emerald-500 focus:ring-0 outline-none transition-all resize-none font-medium text-lg text-slate-700 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* ACTIONS & DECISIONS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                     {/* ACTIONS */}
                     <div className="space-y-8">
                       <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                         <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Zap size={16} /> Actie toevoegen</h4>
                         <button onClick={() => addActionToCart(item)} className="bg-blue-600 text-white p-2 rounded-full hover:scale-110 transition-transform"><Plus size={20} /></button>
                       </div>
                       <div className="space-y-4">
                        {tempActions[item]?.map((action, idx) => (
                          <div key={`act-input-${idx}`} className={`bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 transition-all ${action.isLocked ? 'p-0 overflow-hidden' : 'p-6'}`}>
                              {!action.isLocked ? (
                               <div className="space-y-4">
                                  <input type="text" placeholder="Titel" value={action.title || ''} onChange={(e) => updateAction(item, idx, 'title', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
                                  <textarea placeholder="Omschrijving..." value={action.description || ''} onChange={(e) => updateAction(item, idx, 'description', e.target.value)} className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none" />
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <select onChange={(e) => { if (e.target.value) { toggleActionOwner(item, idx, e.target.value); e.target.value = ''; } }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none">
                                        <option value="">+ Eigenaar</option>
                                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                     </select>
                                     <CustomDatePicker value={action.deadline || date} onChange={(newDate) => updateAction(item, idx, 'deadline', newDate)} placeholder="Deadline" />
                                  </div>
                                  <div className="flex flex-wrap gap-2">{action.owners?.map(owner => <span key={owner} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase">{owner}</span>)}</div>
                                  <div className="flex items-center justify-between pt-2">
                                    <button onClick={() => setTempActions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1"><Trash2 size={14}/> Verwijderen</button>
                                    <button onClick={() => { if (action.title) setTempActions(prev => { const arr = [...(prev[item]||[])]; arr[idx].isLocked = true; return { ...prev, [item]: arr }; }) }} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"><CheckCircle size={16} /><span className="text-xs font-black uppercase tracking-widest">Actie opslaan</span></button>
                                  </div>
                               </div>
                             ) : (
                               <div className="flex items-start justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                                  <div className="flex-1 pr-4">
                                      <h5 className="font-bold text-slate-800 text-sm mb-1">{action.title}</h5>
                                      <div className="flex flex-wrap gap-2 mb-2"><div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"><Clock size={10} /> {action.deadline}</div>{action.owners?.map(owner => <span key={owner} className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{owner}</span>)}</div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                      <button onClick={() => setTempActions(prev => { const arr = [...(prev[item]||[])]; arr[idx].isLocked = false; return { ...prev, [item]: arr }; })} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><PenTool size={16} /></button>
                                      <button onClick={() => setTempActions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== idx) }))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                             )}
                          </div>
                        ))}
                       </div>
                     </div>

                     {/* DECISIONS */}
                     <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Gavel size={16} /> Besluit vastleggen</h4>
                        <button onClick={() => setTempDecisions(prev => ({ ...prev, [item]: [...(prev[item] || []), { title: '', description: '', owners: [], date: date, isLocked: false }] }))} className="bg-emerald-600 text-white p-2 rounded-full hover:scale-110 transition-transform"><Plus size={20} /></button>
                      </div>
                      <div className="space-y-4">
                         {tempDecisions[item]?.map((decision, idx) => (
                           <div key={`dec-input-${idx}`} className={`bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 transition-all ${decision.isLocked ? 'p-0 overflow-hidden' : 'p-6'}`}>
                              {!decision.isLocked ? (
                                 <div className="space-y-4">
                                    <input type="text" placeholder="Titel" value={decision.title || ''} onChange={(e) => setTempDecisions(prev => { const arr = [...(prev[item]||[])]; arr[idx] = { ...arr[idx], title: e.target.value }; return { ...prev, [item]: arr }; })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
                                    <textarea placeholder="Omschrijving..." value={decision.description || ''} onChange={(e) => setTempDecisions(prev => { const arr = [...(prev[item]||[])]; arr[idx] = { ...arr[idx], description: e.target.value }; return { ...prev, [item]: arr }; })} className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none" />
                                    <div className="flex items-center justify-between pt-2">
                                      <button onClick={() => setTempDecisions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1"><Trash2 size={14}/> Verwijderen</button>
                                      <button onClick={() => { if (decision.title) setTempDecisions(prev => { const arr = [...(prev[item]||[])]; arr[idx].isLocked = true; return { ...prev, [item]: arr }; }) }} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"><Gavel size={16} /><span className="text-xs font-black uppercase tracking-widest">Besluit opslaan</span></button>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex items-start justify-between p-4 bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors border-l-4 border-emerald-500">
                                    <div className="flex-1 pr-4">
                                        <h5 className="font-bold text-slate-800 text-sm mb-1">{decision.title}</h5>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => setTempDecisions(prev => { const arr = [...(prev[item]||[])]; arr[idx].isLocked = false; return { ...prev, [item]: arr }; })} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"><PenTool size={16} /></button>
                                        <button onClick={() => setTempDecisions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== idx) }))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                             )}
                          </div>
                        ))}
                       </div>
                     </div>
                  </div>

                  <div className="flex justify-end pt-8 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        const nextId = `agenda-item-${index + 1}`;
                        const el = document.getElementById(nextId);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        else handleSave();
                      }}
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                      {index === currentAgenda.length - 1 ? 'Afronden' : 'Volgende punt'} <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FLOATING SAVE BUTTON */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 duration-1000">
           <button 
             ref={saveBtnRef}
             onClick={handleSave}
             disabled={isSaving}
             className="bg-slate-900 text-white pl-8 pr-10 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group border-4 border-white/10 ring-4 ring-slate-900/20"
           >
             <div className={`w-3 h-3 rounded-full ${hasDraftData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
             {isSaving ? 'Opslaan...' : 'Vergadering opslaan'}
             <Save size={20} className="group-hover:text-emerald-400 transition-colors" />
           </button>
        </div>

        {/* MODALS & TOASTS */}
        {showResetConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl border-2 border-red-100">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4"><RotateCcw size={32} /></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Opnieuw beginnen?</h3>
                        <p className="text-slate-500 text-sm mb-6">Alle niet-opgeslagen notities en acties in dit concept gaan verloren.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Annuleren</button>
                            <button onClick={handleFullReset} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-100">Bevestigen</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {breakModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setBreakModal({ ...breakModal, isOpen: false })}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-blue-100 p-4 rounded-full text-blue-500 mb-4"><AlertTriangle size={32} /></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">{breakModal.title}</h3>
                        <p className="text-slate-500 text-sm mb-6">{breakModal.message}</p>
                        <button onClick={() => setBreakModal({ ...breakModal, isOpen: false })} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest">Sluiten</button>
                    </div>
                </div>
            </div>
        )}
        
        {toastMsg && (
          <div className="fixed bottom-6 left-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
            <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle size={14} className="text-white" /></div>
            <span className="font-bold text-sm">{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewMeetingPage;
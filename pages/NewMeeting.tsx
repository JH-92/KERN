import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Save, Plus, PlusCircle, Trash2, 
  CheckCircle, Info, ClipboardList, Clock, User, Briefcase, Layout,
  GripVertical, List, CheckSquare, Square, X, ChevronDown, RotateCcw,
  PenTool, ListTodo, AlertCircle, Edit2, AlertTriangle, Gavel, Play, Pause, Hourglass, Zap, ShieldAlert,
  ChevronUp
} from 'lucide-react';
import { db, MeetingDraft } from '../db';
import { MeetingType, ActionStatus, Employee, Action, Decision, Note, Meeting, Topic, VotingState } from '../types';
import { PROJECT_AGENDA, PLANNING_AGENDA } from '../constants';
import PageHeader from '../components/PageHeader';
import { CustomDatePicker } from '../components/CustomDatePicker';

// Extended Type for UI state
type DraftAction = Partial<Action> & { isLocked?: boolean };
type DraftDecision = Partial<Decision> & { isLocked?: boolean };

const getWeekNumber = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

const NewMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDirectorMode, setIsDirectorMode] = useState(document.documentElement.classList.contains('director-mode'));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [hoverTimer, setHoverTimer] = useState(false);
  
  // Load Draft or Default
  const savedDraft = useMemo(() => db.getDraft(), []);

  // Form state initialized. 
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  
  const [meetingType, setMeetingType] = useState<MeetingType>((savedDraft?.meetingType as MeetingType) || MeetingType.PROJECT);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(savedDraft?.selectedAttendees || []);
  
  // Agenda states initialized with Draft
  const [notes, setNotes] = useState<Record<string, string>>(savedDraft?.notes || {});
  const [topics, setTopics] = useState<Record<string, Topic[]>>(savedDraft?.topics || {});
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>(savedDraft?.topicInputs || {});
  
  // Action & Decision Cart initialized with Draft
  const [tempActions, setTempActions] = useState<Record<string, DraftAction[]>>(savedDraft?.tempActions || {});
  const [tempDecisions, setTempDecisions] = useState<Record<string, DraftDecision[]>>(savedDraft?.tempDecisions || {});
  
  // UI States
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- GIZMO: STOPWATCH STATE (PERSISTENT) ---
  const [stopwatchTime, setStopwatchTime] = useState(db.getTimerElapsed());
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(db.getTimerState().isRunning);

  // --- GIZMO: DATA FLOW ANIMATION STATE ---
  const [isSaving, setIsSaving] = useState(false);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const [particleStyle, setParticleStyle] = useState<React.CSSProperties>({});

  // --- GIZMO: FLOATING ACTION BUTTON & VOTING ---
  const [votingState, setVotingState] = useState<VotingState>({ isActive: false, topic: '', votes: [], startTime: 0 });
  const [showVoteBubble, setShowVoteBubble] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(1);
  const sessionId = useMemo(() => db.getSessionId(), []);

  const currentAgenda = useMemo(() => {
    return meetingType === MeetingType.PROJECT ? PROJECT_AGENDA : PLANNING_AGENDA;
  }, [meetingType]);

  useEffect(() => {
    setEmployees(db.getEmployees());
    setIsDirectorMode(document.documentElement.classList.contains('director-mode'));
    
    // Initial Voting State & Presence
    setVotingState(db.getVotingState());
    setActiveUserCount(db.getActiveUserCount());
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

  // Persistent Stopwatch Effect
  useEffect(() => {
    const updateTimer = () => {
        setStopwatchTime(db.getTimerElapsed());
        setIsStopwatchRunning(db.getTimerState().isRunning);
    };

    updateTimer(); // Initial update

    const interval = setInterval(updateTimer, 1000); // Check every second
    const handleSync = () => updateTimer();

    window.addEventListener('kern-data-update', handleSync);
    return () => {
        clearInterval(interval);
        window.removeEventListener('kern-data-update', handleSync);
    };
  }, []);

  // Voting & Presence Sync Listener
  useEffect(() => {
    const handleSync = () => {
        setVotingState(db.getVotingState());
        setActiveUserCount(db.getActiveUserCount());
        setIsDirectorMode(document.documentElement.classList.contains('director-mode'));
    };
    window.addEventListener('kern-data-update', handleSync);
    return () => window.removeEventListener('kern-data-update', handleSync);
  }, []);

  // --- UX FEATURE 4: UNSAVED CHANGES GUARD ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Simple heuristic: if stopwatch running OR notes exist OR actions exist OR decisions exist
        const hasContent = 
            isStopwatchRunning || 
            Object.keys(notes).length > 0 || 
            Object.values(tempActions).some(list => list.length > 0) ||
            Object.values(tempDecisions).some(list => list.length > 0);
        
        if (hasContent) {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
            return ''; // Required for Legacy
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStopwatchRunning, notes, tempActions, tempDecisions]);

  const formatStopwatch = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleToggleTimer = () => {
      if (isStopwatchRunning) {
          db.pauseTimer();
      } else {
          db.startTimer();
      }
  };

  const weekNumber = useMemo(() => getWeekNumber(date), [date]);

  const hasDraftData = selectedAttendees.length > 0 || Object.keys(notes).length > 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // --- VOTING LOGIC ---
  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!votingState.isActive) {
        db.startVote(); 
    }
    
    // Cast regular vote
    db.castVote(sessionId);
    
    // Director Power Vote (2x Weight)
    if (isDirectorMode) {
        // We cast a second "ghost" vote using a modified session ID to weight the vote count
        db.castVote(`${sessionId}_director_power`);
        showToast("⚖️ Director Power: Dubbele stem uitgebracht!");
    }

    setShowVoteBubble(true);
  };

  const activeVotersCount = votingState.votes.length;
  // Use real-time presence for total voters, fallback to 1
  const totalVoters = Math.max(activeUserCount, 1);
  const isMajority = activeVotersCount > (totalVoters / 2);

  const handleNewStart = () => {
    setShowResetConfirm(true);
  };

  const handleFullReset = () => {
    db.clearDraft();
    db.stopVote();
    db.resetTimer();
    
    // Reset all fields to defaults
    setDate(new Date().toLocaleDateString('en-CA'));
    setMeetingType(MeetingType.PROJECT);
    setSelectedAttendees([]);
    setNotes({});
    setTopics({});
    setTopicInputs({});
    setTempActions({});
    setTempDecisions({});
    setStopwatchTime(0);
    setIsStopwatchRunning(false);
    
    setShowResetConfirm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Systeem volledig hersteld.");
  };

  // 8. SPLASH APPROVAL LOGIC
  const triggerSplash = (e: React.MouseEvent) => {
      if (!isDirectorMode) return;
      const btn = e.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const count = 8;
      
      for(let i=0; i<count; i++) {
          const particle = document.createElement('div');
          particle.classList.add('splash-particle');
          
          // Random spread
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 40;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          
          particle.style.setProperty('--tx', `${tx}px`);
          particle.style.setProperty('--ty', `${ty}px`);
          
          // Position relative to click
          particle.style.left = `${e.clientX}px`;
          particle.style.top = `${e.clientY}px`;
          
          document.body.appendChild(particle);
          setTimeout(() => particle.remove(), 600);
      }
  };

  const triggerSaveAnimation = (callback: () => void) => {
    if (saveBtnRef.current) {
        const btnRect = saveBtnRef.current.getBoundingClientRect();
        // Target: Archive Icon in Sidebar (id="nav-archive")
        const targetEl = document.getElementById('nav-archive');
        
        let tx = 0;
        let ty = 0;

        if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            // Calculate vector from Button Center to Icon Center
            const startX = btnRect.left + btnRect.width / 2;
            const startY = btnRect.top + btnRect.height / 2;
            const endX = targetRect.left + targetRect.width / 2;
            const endY = targetRect.top + targetRect.height / 2;
            tx = endX - startX;
            ty = endY - startY;
        } else {
            // Fallback if Sidebar collapsed or unavailable: move left and fade
            tx = -window.innerWidth / 2;
            ty = 0;
        }

        // Set CSS variables for animation
        setParticleStyle({
            top: btnRect.top + btnRect.height / 2 - 12, // Center vertically (12 is half size)
            left: btnRect.left + btnRect.width / 2 - 12,
            '--tx': `${tx}px`,
            '--ty': `${ty}px`
        } as React.CSSProperties);

        setIsSaving(true);

        // Wait for animation to finish (1s)
        setTimeout(() => {
            setIsSaving(false);
            callback();
        }, 1000);
    } else {
        callback();
    }
  };

  const handleSave = () => {
    if (selectedAttendees.length === 0) {
      showToast("Selecteer ten minste één aanwezige.");
      return;
    }

    // Trigger Animation then Process Save
    triggerSaveAnimation(() => {
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
          decisions: formattedDecisions,
          duration: formatStopwatch(stopwatchTime) // Save Duration
        };

        db.saveMeeting(newMeeting);
        db.clearDraft();
        db.stopVote(); // Reset voting on save
        db.resetTimer(); // Reset timer on save
        navigate('/archief', { state: { saved: true } });
    });
  };

  const handleAddEmployee = (e?: React.FormEvent) => { e?.preventDefault(); if (!newEmployeeName.trim()) return; db.saveEmployee({ name: newEmployeeName.trim() }); setEmployees(db.getEmployees()); setNewEmployeeName(''); };
  const toggleAttendee = (name: string) => setSelectedAttendees(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  const handleAddTopic = (item: string) => { const text = topicInputs[item]?.trim(); if (!text) return; setTopics(prev => ({ ...prev, [item]: [...(prev[item] || []), { id: Date.now().toString(), text, isCompleted: false }] })); setTopicInputs(prev => ({ ...prev, [item]: '' })); };
  const toggleTopic = (item: string, topicId: string, e?: React.MouseEvent) => { 
      if (e) triggerSplash(e); // Splash Trigger
      setTopics(prev => ({ ...prev, [item]: prev[item]?.map(t => t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t) || [] })); 
  };
  const removeTopic = (item: string, topicId: string) => setTopics(prev => ({ ...prev, [item]: prev[item]?.filter(t => t.id !== topicId) || [] }));
  const addActionToCart = (item: string) => setTempActions(prev => ({ ...prev, [item]: [...(prev[item] || []), { title: '', description: '', owners: [], deadline: date, isLocked: false }] }));
  const updateAction = (item: string, index: number, field: keyof Action, value: any) => setTempActions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], [field]: value }; return { ...prev, [item]: newList }; });
  const toggleActionOwner = (item: string, index: number, ownerName: string) => setTempActions(prev => { const newList = [...(prev[item] || [])]; const currentOwners = newList[index].owners || []; newList[index] = { ...newList[index], owners: currentOwners.includes(ownerName) ? currentOwners.filter(o => o !== ownerName) : [...currentOwners, ownerName] }; return { ...prev, [item]: newList }; });
  const removeAction = (item: string, index: number) => setTempActions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== index) }));
  const lockAction = (item: string, index: number) => { if (!tempActions[item]?.[index]?.title?.trim()) { showToast("Vul een titel in."); return; } setTempActions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], isLocked: true }; return { ...prev, [item]: newList }; }); };
  const unlockAction = (item: string, index: number) => setTempActions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], isLocked: false }; return { ...prev, [item]: newList }; });
  const addDecisionToCart = (item: string) => setTempDecisions(prev => ({ ...prev, [item]: [...(prev[item] || []), { title: '', description: '', owners: [], date: date, isLocked: false }] }));
  const updateDecision = (item: string, index: number, field: keyof Decision, value: any) => setTempDecisions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], [field]: value }; return { ...prev, [item]: newList }; });
  const toggleDecisionOwner = (item: string, index: number, ownerName: string) => setTempDecisions(prev => { const newList = [...(prev[item] || [])]; const currentOwners = newList[index].owners || []; newList[index] = { ...newList[index], owners: currentOwners.includes(ownerName) ? currentOwners.filter(o => o !== ownerName) : [...currentOwners, ownerName] }; return { ...prev, [item]: newList }; });
  const removeDecision = (item: string, index: number) => setTempDecisions(prev => ({ ...prev, [item]: prev[item].filter((_, i) => i !== index) }));
  const lockDecision = (item: string, index: number) => { if (!tempDecisions[item]?.[index]?.title?.trim()) { showToast("Vul een titel in."); return; } setTempDecisions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], isLocked: true }; return { ...prev, [item]: newList }; }); };
  const unlockDecision = (item: string, index: number) => setTempDecisions(prev => { const newList = [...(prev[item] || [])]; newList[index] = { ...newList[index], isLocked: false }; return { ...prev, [item]: newList }; });

  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      {isSaving && <div className="data-flow-particle" style={particleStyle}></div>}

      {/* GIZMO: FLOATING WRAP-IT-UP FAB / DIRECTOR VETO */}
      {/* Set Z-Index to 9999 to ensure it floats above everything */}
      <div className="fixed bottom-8 right-8 z-[9999] group flex flex-col items-end gap-3 no-blur">
         {/* Vote Bubble Overlay */}
         <div className={`bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-2 transition-all origin-bottom-right duration-300 w-64 ${
             showVoteBubble || votingState.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
         }`}>
             <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                     {isMajority ? 'Tijd om af te ronden!' : 'Volgende punt?'}
                 </h4>
                 {votingState.isActive && (
                     <button onClick={() => db.stopVote()} className="text-slate-500 hover:text-white transition-colors">
                         <X size={14} />
                     </button>
                 )}
             </div>
             <p className="text-xs font-bold text-slate-300 mb-3 leading-snug">
                 {isMajority 
                    ? "De meerderheid wil doorgaan. Rond dit punt af." 
                    : isDirectorMode 
                        ? "Stem voor volgend punt (2x)." 
                        : "Stem om door te gaan naar het volgende agendapunt."}
             </p>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                 <div 
                    className={`h-full transition-all duration-500 ${isMajority ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(activeVotersCount / totalVoters) * 100}%` }}
                 ></div>
             </div>
             <div className="flex justify-between mt-2 text-[10px] font-black uppercase text-slate-500">
                 <span>{activeVotersCount} stemmen</span>
                 <span>{totalVoters} online</span>
             </div>
         </div>

         {/* The Button */}
         <button
            onClick={handleVoteClick}
            className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative ${
                isMajority ? 'bg-amber-500 hover:bg-amber-600 animate-bounce' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
         >
            <Hourglass size={28} className="text-white" />
            
            {/* Notification Badge */}
            {activeVotersCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white">
                    {activeVotersCount}
                </div>
            )}
         </button>
      </div>

      <PageHeader title="Nieuwe vergadering" subtitle="Configureer het overleg en start de verslaglegging.">
         {/* ... Page Header Content ... */}
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
              {/* GIZMO: LIVE STOPWATCH CONTROL */}
              <div 
                className={`bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-center justify-between transition-all duration-300 ease-out ${
                    isDirectorMode && hoverTimer 
                    ? '-translate-y-1 shadow-lg shadow-cyan-100/50 border-cyan-200' 
                    : ''
                }`}
                onMouseEnter={() => isDirectorMode && setHoverTimer(true)}
                onMouseLeave={() => setHoverTimer(false)}
              >
                 <div>
                    <span className={`text-[10px] font-black tracking-widest block mb-1 transition-colors duration-300 ${
                        isDirectorMode && hoverTimer ? 'text-cyan-500' : 'text-slate-400 uppercase'
                    }`}>
                        {isDirectorMode && hoverTimer ? 'Session hangtime' : 'Vergaderduur'}
                    </span>
                    <div className={`text-3xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${
                        isDirectorMode && hoverTimer ? 'text-cyan-500' : 'text-slate-900'
                    }`}>
                        {formatStopwatch(stopwatchTime)}
                    </div>
                 </div>
                 <button 
                    onClick={handleToggleTimer}
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all transform active:scale-95 ${
                        isStopwatchRunning 
                        ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 shadow-red-100' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                    }`}
                 >
                    {isStopwatchRunning ? <Pause size={18} /> : <Play size={18} />}
                    {isStopwatchRunning ? 'Pauzeren' : 'Start timer'}
                 </button>
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
                      <span className="sm:hidden">Project</span>
                      <span className="hidden sm:inline">Projectleidersoverleg</span>
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
                      <span className="sm:hidden">Planning</span>
                      <span className="hidden sm:inline">Planningsvergadering</span>
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
                              } ${isDirectorMode ? 'hologram-effect' : ''}`}>
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
          {currentAgenda.map((item, index) => (
            <div key={item} id={`agenda-item-${index}`} className="animate-in fade-in duration-500 scroll-mt-24">
              <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100">
                <div className="bg-slate-900 px-12 py-8 flex items-center justify-between rounded-t-[3rem]">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter">{item}</h3>
                  <div className="hidden md:block bg-white/10 px-4 py-2 rounded-xl text-white/40 text-[10px] font-black uppercase tracking-widest">
                    Onderdeel {currentAgenda.indexOf(item) + 1}
                  </div>
                </div>
                {/* ... (Rest of Agenda Item content identical to previous) ... */}
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
                             <button onClick={(e) => toggleTopic(item, topic.id, e)} className="transition-colors">
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

                  {/* Actions & Decisions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                     {/* Actions Column */}
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
                              {/* Action Item Input Logic (same as before) */}
                              {!action.isLocked ? (
                               <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel</label>
                                    <input type="text" placeholder="Korte samenvatting" value={action.title || ''} onChange={(e) => updateAction(item, idx, 'title', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-800" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                                    <textarea placeholder="Details..." value={action.description || ''} onChange={(e) => updateAction(item, idx, 'description', e.target.value)} className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 transition-colors" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <select onChange={(e) => { if (e.target.value) { toggleActionOwner(item, idx, e.target.value); e.target.value = ''; } }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none">
                                        <option value="">+ Eigenaar</option>
                                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                     </select>
                                     <CustomDatePicker value={action.deadline || date} onChange={(newDate) => updateAction(item, idx, 'deadline', newDate)} placeholder="Deadline" />
                                  </div>
                                  <div className="flex flex-wrap gap-2">{action.owners?.map(owner => <button key={owner} onClick={() => toggleActionOwner(item, idx, owner)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">{owner} <X size={10} /></button>)}</div>
                                  <div className="flex items-center justify-between pt-2">
                                    <button onClick={() => removeAction(item, idx)} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1"><Trash2 size={14}/> Verwijderen</button>
                                    <button onClick={() => lockAction(item, idx)} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"><CheckCircle size={16} /><span className="text-xs font-black uppercase tracking-widest">Actie opslaan</span></button>
                                  </div>
                               </div>
                             ) : (
                               <div className="flex items-start justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                                  <div className="flex-1 pr-4">
                                      <h5 className="font-bold text-slate-800 text-sm mb-1">{action.title}</h5>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"><Clock size={10} /> {action.deadline}</div>
                                          {action.owners?.map(owner => <span key={owner} className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{owner}</span>)}
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                      <button onClick={() => unlockAction(item, idx)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                      <button onClick={() => removeAction(item, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                             )}
                          </div>
                        ))}
                       </div>
                     </div>
                     {/* Decisions Column */}
                     <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                          <PlusCircle className="w-6 h-6 text-emerald-600 mr-3" /> Besluit vastleggen
                        </h4>
                        <button onClick={() => addDecisionToCart(item)} className="bg-emerald-600 text-white p-2 rounded-full hover:scale-110 transition-transform"><Plus size={20} /></button>
                      </div>
                      <div className="space-y-4">
                         {tempDecisions[item]?.map((decision, idx) => (
                           <div key={`dec-input-${idx}`} className={`bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm animate-in zoom-in-95 transition-all ${decision.isLocked ? 'p-0 overflow-hidden' : 'p-6'}`}>
                              {!decision.isLocked ? (
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titel</label>
                                      <input type="text" placeholder="Korte titel" value={decision.title || ''} onChange={(e) => updateDecision(item, idx, 'title', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Omschrijving</label>
                                      <textarea placeholder="Details..." value={decision.description || ''} onChange={(e) => updateDecision(item, idx, 'description', e.target.value)} className="w-full min-h-[100px] text-sm font-medium bg-white px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 transition-colors" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       <select onChange={(e) => { if (e.target.value) { toggleDecisionOwner(item, idx, e.target.value); e.target.value = ''; } }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none">
                                          <option value="">+ Eigenaar</option>
                                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                       </select>
                                       <CustomDatePicker value={decision.date || date} onChange={(newDate) => updateDecision(item, idx, 'date', newDate)} placeholder="Datum" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">{decision.owners?.map(owner => <button key={owner} onClick={() => toggleDecisionOwner(item, idx, owner)} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">{owner} <X size={10} /></button>)}</div>
                                    <div className="flex items-center justify-between pt-2">
                                      <button onClick={() => removeDecision(item, idx)} className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1"><Trash2 size={14}/> Verwijderen</button>
                                      <button onClick={() => lockDecision(item, idx)} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 h-12 rounded-xl border border-emerald-100 transition-colors shadow-sm"><Gavel size={16} /><span className="text-xs font-black uppercase tracking-widest">Besluit opslaan</span></button>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex items-start justify-between p-4 bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors border-l-4 border-emerald-500">
                                    <div className="flex-1 pr-4">
                                        <h5 className="font-bold text-slate-800 text-sm mb-1">{decision.title}</h5>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200"><Clock size={10} /> {decision.date}</div>
                                            {decision.owners?.map(owner => <span key={owner} className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">{owner}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => unlockDecision(item, idx)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => removeDecision(item, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
        {/* Missing closing div added here */}
      </div>

        {/* Floating Save Button */}
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

        {/* Reset Confirmation Modal */}
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
        
        {toastMsg && (
          <div className="fixed bottom-6 left-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
            <div className="bg-emerald-500 p-1 rounded-full">
              <CheckCircle size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">{toastMsg}</span>
          </div>
        )}
    </div>
  );
};

export default NewMeetingPage;
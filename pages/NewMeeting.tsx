import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Save, Plus, Trash2, 
  CheckCircle, ClipboardList, Briefcase, Layout,
  List, CheckSquare, Square, X, RotateCcw,
  PenTool, Gavel, Play, Pause, Hourglass, Clock, User, AlertCircle,
  ArrowDown, Calendar as CalendarIcon, ChevronDown, ChevronRight, Check
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

// --- AGENDA ITEM COMPONENT (MEMOIZED) ---
const AgendaItemCard = React.memo(({ 
    item, 
    nextItem,
    notes, 
    topics, 
    topicInputs, 
    tempActions, 
    tempDecisions, 
    employees,
    selectedAttendees, 
    date,
    setNotes,
    setTopics,
    setTopicInputs,
    setTempActions,
    setTempDecisions,
    handleNoteChange,
    onNext
}: any) => {
    const [actionInput, setActionInput] = useState('');
    const [decisionInput, setDecisionInput] = useState('');
    const topicInputRef = useRef<HTMLInputElement>(null);
    const actionInputRef = useRef<HTMLInputElement>(null);
    const decisionInputRef = useRef<HTMLInputElement>(null);

    // --- LOGIC: ADD ITEMS ---
    const addActionItem = useCallback(() => {
        if (!actionInput.trim()) return;
        setTempActions((prev: any) => ({
            ...prev,
            [item]: [...(prev[item] || []), { 
                title: actionInput.trim(), 
                description: '', 
                owners: [], 
                deadline: date, 
                isLocked: false 
            }]
        }));
        setActionInput('');
        setTimeout(() => actionInputRef.current?.focus(), 10);
    }, [actionInput, item, date, setTempActions]);

    const addDecision = useCallback(() => {
        if (!decisionInput.trim()) return;
        setTempDecisions((prev: any) => ({
            ...prev,
            [item]: [...(prev[item] || []), { 
                title: decisionInput.trim(), 
                description: '', 
                owners: [], 
                date: date, 
                isLocked: false 
            }]
        }));
        setDecisionInput('');
        setTimeout(() => decisionInputRef.current?.focus(), 10);
    }, [decisionInput, item, date, setTempDecisions]);

    const addTopic = useCallback(() => {
        const text = topicInputs[item]?.trim();
        if (text) {
            setTopics((prev: any) => ({ 
                ...prev, 
                [item]: [...(prev[item] || []), { id: Date.now().toString(), text, isCompleted: false }] 
            }));
            setTopicInputs((prev: any) => ({ ...prev, [item]: '' }));
            setTimeout(() => topicInputRef.current?.focus(), 10);
        }
    }, [item, topicInputs, setTopics, setTopicInputs]);

    // --- LOGIC: UPDATE ITEMS ---
    const updateAction = (idx: number, field: keyof Action, value: any) => {
        setTempActions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], [field]: value };
            return { ...prev, [item]: list };
        });
    };

    const updateDecision = (idx: number, field: keyof Decision, value: any) => {
        setTempDecisions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], [field]: value };
            return { ...prev, [item]: list };
        });
    };

    const setActionOwner = (idx: number, ownerName: string) => {
        setTempActions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], owners: [ownerName] };
            return { ...prev, [item]: list };
        });
    };

    const setDecisionOwner = (idx: number, ownerName: string) => {
        setTempDecisions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], owners: [ownerName] };
            return { ...prev, [item]: list };
        });
    };

    const toggleActionLock = (idx: number) => {
        setTempActions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], isLocked: !list[idx].isLocked };
            return { ...prev, [item]: list };
        });
    };

    const toggleDecisionLock = (idx: number) => {
        setTempDecisions((prev: any) => {
            const list = [...(prev[item] || [])];
            list[idx] = { ...list[idx], isLocked: !list[idx].isLocked };
            return { ...prev, [item]: list };
        });
    };

    const removeAction = (idx: number) => {
        setTempActions((prev: any) => ({
            ...prev,
            [item]: prev[item].filter((_: any, i: number) => i !== idx)
        }));
    };

    const removeDecision = (idx: number) => {
        setTempDecisions((prev: any) => ({
            ...prev,
            [item]: prev[item].filter((_: any, i: number) => i !== idx)
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            action();
        }
    };

    const availableOwners = employees.filter((e: Employee) => selectedAttendees.includes(e.name));

    return (
        <div id={`agenda-item-${item}`} className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 mb-16 relative">
            <div className="bg-slate-900 px-10 py-8 flex items-center justify-between rounded-t-[3rem]">
                <h3 className="text-2xl font-black text-white tracking-tight">{item}</h3>
            </div>
            
            <div className="p-8 md:p-10 space-y-10">
                {/* 1. Agendapunten */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                        <List size={14} /> Agendapunten
                    </label>
                    <div className="space-y-3">
                        {topics[item]?.map((topic: Topic) => (
                            <div key={topic.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${topic.isCompleted ? 'bg-emerald-50 border-emerald-100 opacity-80' : 'bg-slate-50 border-slate-200'}`}>
                                <button onClick={() => setTopics((prev: any) => ({ ...prev, [item]: prev[item]?.map((t: Topic) => t.id === topic.id ? { ...t, isCompleted: !t.isCompleted } : t) || [] }))} className="cursor-pointer">
                                    {topic.isCompleted ? <CheckSquare size={20} className="text-emerald-500" /> : <Square size={20} className="text-slate-300 hover:text-slate-400" />}
                                </button>
                                <span className={`flex-1 text-sm font-bold ${topic.isCompleted ? 'text-emerald-800 line-through' : 'text-slate-700'}`}>{topic.text}</span>
                                <button onClick={() => setTopics((prev: any) => ({ ...prev, [item]: prev[item]?.filter((t: Topic) => t.id !== topic.id) || [] }))} className="text-slate-300 hover:text-red-400 p-1 cursor-pointer"><X size={16} /></button>
                            </div>
                        ))}
                        <div className="flex items-center gap-3 pl-4 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Plus size={16} className="text-slate-400" />
                            <input 
                                ref={topicInputRef}
                                type="text"
                                value={topicInputs[item] || ''}
                                onChange={(e) => setTopicInputs((prev: any) => ({ ...prev, [item]: e.target.value }))}
                                onKeyDown={(e) => handleKeyDown(e, addTopic)}
                                placeholder="Typ agendapunt..."
                                className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400"
                            />
                            <button onClick={addTopic} className="bg-white hover:bg-slate-100 text-slate-600 p-2 rounded-xl transition-colors shadow-sm cursor-pointer border border-slate-200">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Notulen */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Notulen</label>
                    <textarea 
                        rows={6}
                        value={notes[item] || ''}
                        onChange={(e) => handleNoteChange(item, e.target.value)}
                        placeholder={`Leg hier de notulen vast...`}
                        className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none font-medium text-slate-700 leading-relaxed shadow-sm"
                    />
                </div>

                {/* 3. Acties & Besluiten */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                    {/* Acties */}
                    <div className="bg-blue-50/40 rounded-[2.5rem] p-6 border border-blue-100 relative">
                        <div className="flex items-center justify-between mb-6 px-1">
                             <h4 className="text-sm font-black text-blue-700 uppercase tracking-widest flex items-center gap-3">
                                <ClipboardList size={20} />
                                Actiepunten
                             </h4>
                             <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                {tempActions[item]?.length || 0}
                             </span>
                        </div>

                        <div className="flex items-center gap-2 bg-white p-2 pl-4 rounded-2xl border border-blue-200 shadow-sm mb-6 focus-within:ring-2 focus-within:ring-blue-300 transition-all">
                            <input 
                                ref={actionInputRef}
                                type="text"
                                value={actionInput}
                                onChange={(e) => setActionInput(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, addActionItem)}
                                placeholder="Nieuw actiepunt..."
                                className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            <button onClick={addActionItem} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors shadow-md active:scale-95">
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {tempActions[item]?.map((action: DraftAction, idx: number) => (
                                <div key={idx} className={`bg-white p-5 rounded-[1.5rem] border transition-all group relative ${action.isLocked ? 'border-emerald-200 bg-emerald-50/20' : 'border-blue-100 hover:shadow-md'}`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <input 
                                            value={action.title}
                                            readOnly={action.isLocked}
                                            onChange={(e) => updateAction(idx, 'title', e.target.value)}
                                            className={`flex-1 bg-transparent font-black text-sm outline-none border-b border-transparent focus:border-blue-200 transition-colors pb-0.5 ${action.isLocked ? 'text-slate-500' : 'text-slate-800'}`}
                                            placeholder="Titel..."
                                        />
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggleActionLock(idx)} className={`p-1.5 rounded-lg transition-all ${action.isLocked ? 'text-emerald-600 bg-emerald-100' : 'text-slate-300 hover:text-emerald-500'}`}>
                                                {action.isLocked ? <CheckCircle size={16} /> : <Save size={16} />}
                                            </button>
                                            <button onClick={() => removeAction(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={action.description}
                                        readOnly={action.isLocked}
                                        onChange={(e) => updateAction(idx, 'description', e.target.value)}
                                        className="w-full text-xs font-medium text-slate-600 bg-slate-50/50 rounded-xl p-3 border border-transparent focus:bg-white focus:border-blue-200 resize-none outline-none mb-3 transition-all"
                                        placeholder="Toelichting..."
                                        rows={2}
                                    />
                                    <div className={`flex items-stretch gap-3 h-11 transition-opacity ${action.isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex-1 relative h-full">
                                            <div className="flex items-center bg-white rounded-xl px-3 border border-slate-200 gap-2 cursor-pointer hover:border-blue-400 transition-all h-full w-full">
                                                <User size={14} className="text-slate-400 shrink-0" />
                                                <select 
                                                    value={action.owners?.[0] || ''} 
                                                    onChange={(e) => setActionOwner(idx, e.target.value)}
                                                    className="bg-transparent text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer w-full h-full pr-6"
                                                >
                                                    <option value="" disabled>Eigenaar</option>
                                                    {availableOwners.map((e: Employee) => (
                                                        <option key={e.id} value={e.name}>{e.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="text-slate-400 absolute right-3 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="relative z-20 w-32 h-full"> 
                                            <CustomDatePicker 
                                                value={action.deadline || date} 
                                                onChange={(d) => updateAction(idx, 'deadline', d)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Besluiten */}
                    <div className="bg-emerald-50/40 rounded-[2.5rem] p-6 border border-emerald-100 relative">
                         <div className="flex items-center justify-between mb-6 px-1">
                             <h4 className="text-sm font-black text-emerald-700 uppercase tracking-widest flex items-center gap-3">
                                <Gavel size={20} />
                                Besluiten
                             </h4>
                             <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                {tempDecisions[item]?.length || 0}
                             </span>
                        </div>

                        <div className="flex items-center gap-2 bg-white p-2 pl-4 rounded-2xl border border-emerald-200 shadow-sm mb-6 focus-within:ring-2 focus-within:ring-emerald-300 transition-all">
                            <input 
                                ref={decisionInputRef}
                                type="text"
                                value={decisionInput}
                                onChange={(e) => setDecisionInput(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, addDecision)}
                                placeholder="Nieuw besluit..."
                                className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            <button onClick={addDecision} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition-colors shadow-md active:scale-95">
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {tempDecisions[item]?.map((decision: DraftDecision, idx: number) => (
                                <div key={idx} className={`bg-white p-5 rounded-[1.5rem] border transition-all group relative ${decision.isLocked ? 'border-emerald-200 bg-emerald-50/20' : 'border-emerald-100 hover:shadow-md'}`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <input 
                                            value={decision.title}
                                            readOnly={decision.isLocked}
                                            onChange={(e) => updateDecision(idx, 'title', e.target.value)}
                                            className={`flex-1 bg-transparent font-black text-sm outline-none border-b border-transparent focus:border-emerald-200 transition-colors pb-0.5 ${decision.isLocked ? 'text-slate-500' : 'text-slate-800'}`}
                                            placeholder="Besluit..."
                                        />
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggleDecisionLock(idx)} className={`p-1.5 rounded-lg transition-all ${decision.isLocked ? 'text-emerald-600 bg-emerald-100' : 'text-slate-300 hover:text-emerald-500'}`}>
                                                {decision.isLocked ? <CheckCircle size={16} /> : <Save size={16} />}
                                            </button>
                                            <button onClick={() => removeDecision(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={decision.description}
                                        readOnly={decision.isLocked}
                                        onChange={(e) => updateDecision(idx, 'description', e.target.value)}
                                        className="w-full text-xs font-medium text-slate-600 bg-slate-50/50 rounded-xl p-3 border border-transparent focus:bg-white focus:border-emerald-200 resize-none outline-none mb-3 transition-all"
                                        placeholder="Toelichting..."
                                        rows={2}
                                    />
                                    <div className={`flex items-stretch gap-3 h-11 transition-opacity ${decision.isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex-1 relative h-full">
                                            <div className="flex items-center bg-white rounded-xl px-3 border border-slate-200 gap-2 cursor-pointer hover:border-emerald-400 transition-all h-full w-full">
                                                <User size={14} className="text-slate-400 shrink-0" />
                                                <select 
                                                    value={decision.owners?.[0] || ''} 
                                                    onChange={(e) => setDecisionOwner(idx, e.target.value)}
                                                    className="bg-transparent text-[11px] font-bold text-slate-700 outline-none appearance-none cursor-pointer w-full h-full pr-6"
                                                >
                                                    <option value="" disabled>Verantwoordelijke</option>
                                                    {availableOwners.map((e: Employee) => (
                                                        <option key={e.id} value={e.name}>{e.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="text-slate-400 absolute right-3 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="relative z-20 w-32 h-full">
                                            <CustomDatePicker 
                                                value={decision.date || date} 
                                                onChange={(d) => updateDecision(idx, 'date', d)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {nextItem && (
                    <div className="flex justify-center pt-12 pb-2">
                        <button 
                            onClick={() => onNext(nextItem)}
                            className="group flex items-center gap-3 px-10 py-4 bg-slate-50 border border-slate-200 rounded-full text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95"
                        >
                            Volgende onderwerp <ArrowDown size={14} className="group-hover:animate-bounce" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.notes[prev.item] === next.notes[next.item] &&
        prev.topics[prev.item] === next.topics[next.item] &&
        prev.topicInputs[prev.item] === next.topicInputs[next.item] &&
        prev.tempActions[prev.item] === next.tempActions[next.item] &&
        prev.tempDecisions[prev.item] === next.tempDecisions[next.item] &&
        prev.selectedAttendees === next.selectedAttendees
    );
});

export default function NewMeetingPage() {
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const savedDraft = useMemo(() => db.getDraft(), []);
  const [date, setDate] = useState(savedDraft?.date || new Date().toLocaleDateString('en-CA'));
  const [meetingType, setMeetingType] = useState<MeetingType>((savedDraft?.meetingType as MeetingType) || MeetingType.PROJECT);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(savedDraft?.selectedAttendees || []);

  const [notes, setNotes] = useState<Record<string, string>>(savedDraft?.notes || {});
  const [topics, setTopics] = useState<Record<string, Topic[]>>(savedDraft?.topics || {});
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>(savedDraft?.topicInputs || {});
  
  const [tempActions, setTempActions] = useState<Record<string, DraftAction[]>>(savedDraft?.tempActions || {});
  const [tempDecisions, setTempDecisions] = useState<Record<string, DraftDecision[]>>(savedDraft?.tempDecisions || {});

  const [stopwatchTime, setStopwatchTime] = useState(db.getTimerElapsed());
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(db.getTimerState().isRunning);
  const [votingState, setVotingState] = useState<VotingState>({ isActive: false, topic: '', votes: [], startTime: 0 });
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [showVoteBubble, setShowVoteBubble] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const sessionId = useMemo(() => db.getSessionId(), []);
  const weekNumber = useMemo(() => getWeekNumber(date), [date]);
  const currentAgenda = useMemo(() => meetingType === MeetingType.PROJECT ? PROJECT_AGENDA : PLANNING_AGENDA, [meetingType]);
  const hasDraftData = selectedAttendees.length > 0 || Object.keys(notes).length > 0;
  const activeVotersCount = votingState.votes.length;
  const totalVoters = Math.max(activeUserCount, 1);
  const isMajority = activeVotersCount > (totalVoters / 2);

  const noteSaveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setEmployees(db.getEmployees());
    setVotingState(db.getVotingState());
    setActiveUserCount(db.getActiveUserCount());
    setStopwatchTime(db.getTimerElapsed());
    setIsStopwatchRunning(db.getTimerState().isRunning);

    const handleSync = () => {
        const dbTimer = db.getTimerState();
        if (dbTimer.isRunning !== isStopwatchRunning) setIsStopwatchRunning(dbTimer.isRunning);
        setStopwatchTime(db.getTimerElapsed());
        setVotingState(db.getVotingState());
        setActiveUserCount(db.getActiveUserCount());
    };

    window.addEventListener('kern-data-update', handleSync);
    return () => window.removeEventListener('kern-data-update', handleSync);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isStopwatchRunning) {
        interval = setInterval(() => {
            setStopwatchTime(db.getTimerElapsed()); 
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  useEffect(() => {
    const draft: MeetingDraft = { date, meetingType, selectedAttendees, notes, topics, topicInputs, tempActions, tempDecisions };
    db.saveDraft(draft);
  }, [date, meetingType, selectedAttendees, topics, topicInputs, tempActions, tempDecisions]); 

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleToggleTimer = useCallback(() => {
      const newState = !isStopwatchRunning;
      setIsStopwatchRunning(newState); 
      if (newState) db.startTimer(); else db.pauseTimer();
  }, [isStopwatchRunning]);

  const handleVoteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!votingState.isActive) db.startVote();
    db.castVote(sessionId);
    setShowVoteBubble(true);
  }, [votingState.isActive, sessionId]);

  const handleNoteChange = useCallback((item: string, value: string) => {
      setNotes(prev => ({ ...prev, [item]: value }));
      if (noteSaveTimeoutRef.current[item]) clearTimeout(noteSaveTimeoutRef.current[item]);
      noteSaveTimeoutRef.current[item] = setTimeout(() => {
          db.updateDraftNote(item, value);
      }, 1000);
  }, []);

  const handleAddEmployee = useCallback((e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newEmployeeName.trim()) return;
      db.saveEmployee({ name: newEmployeeName.trim() });
      setEmployees(db.getEmployees());
      setNewEmployeeName('');
  }, [newEmployeeName]);

  const toggleAttendee = useCallback((name: string) => {
      setSelectedAttendees(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  }, []);

  const scrollToItem = useCallback((item: string) => {
      const el = document.getElementById(`agenda-item-${item}`);
      if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
      }
  }, []);

  const handleSave = useCallback(() => {
    if (selectedAttendees.length === 0) {
        showToast("Selecteer ten minste één aanwezige.");
        return;
    }
    setIsSaving(true);
    
    setTimeout(() => {
        const meetingId = Date.now().toString();
        const formattedNotes: Note[] = [];
        currentAgenda.forEach(item => {
            if (notes[item] || (topics[item] && topics[item].length > 0)) {
                formattedNotes.push({ agendaItem: item, content: notes[item] || '', topics: topics[item] || [] });
            }
        });

        let actionCounter = db.getAllActions().length + 1;
        const formattedActions: Action[] = [];
        Object.entries(tempActions).forEach(([item, list]) => {
          if (!currentAgenda.includes(item)) return;
          (list as DraftAction[]).forEach((a) => {
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

        let decisionCounter = db.getAllDecisions().length + 1;
        const formattedDecisions: Decision[] = [];
        Object.entries(tempDecisions).forEach(([item, list]) => {
          if (!currentAgenda.includes(item)) return;
          (list as DraftDecision[]).forEach((d) => {
            if (d.title) {
              formattedDecisions.push({
                id: `${meetingId}-bes-${decisionCounter}`,
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
  }, [selectedAttendees, notes, topics, tempActions, tempDecisions, meetingType, date, stopwatchTime, currentAgenda, showToast, navigate]);

  const handleFullReset = useCallback(() => {
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
  }, [showToast]);

  return (
    <div className="pb-40 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
      <div className="fixed bottom-8 right-8 z-[100] group flex flex-col items-end gap-3 pointer-events-auto">
         <div className={`bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-2 transition-all origin-bottom-right duration-300 w-64 ${showVoteBubble || votingState.isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}>
             <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                     {isMajority ? 'Tijd om af te ronden!' : 'Volgende punt?'}
                 </h4>
                 {votingState.isActive && (
                     <button onClick={() => db.stopVote()} className="text-slate-500 hover:text-white transition-colors cursor-pointer"><X size={14} /></button>
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
            className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative cursor-pointer ${isMajority ? 'bg-amber-500 hover:bg-amber-600 animate-bounce' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
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
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative group z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
                 <div className="flex items-center justify-between w-full mb-2">
                     <div className="flex-1 mr-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Vergaderduur</span>
                        <div className={`text-3xl font-black tabular-nums tracking-tighter ${(!isStopwatchRunning && stopwatchTime > 0) ? 'text-amber-500' : 'text-slate-900'}`}>
                            {formatStopwatch(stopwatchTime)}
                        </div>
                     </div>
                     <button onClick={handleToggleTimer} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all transform active:scale-95 shrink-0 cursor-pointer ${isStopwatchRunning ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 shadow-red-100' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'}`}>
                        {isStopwatchRunning ? <Pause size={18} /> : <Play size={18} />}
                        {isStopwatchRunning ? 'Pauzeren' : 'Start timer'}
                     </button>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">Datum</label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1 z-20 h-[58px]">
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
                    <button onClick={() => setMeetingType(MeetingType.PROJECT)} className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${meetingType === MeetingType.PROJECT ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Briefcase size={16} /> <span className="hidden sm:inline">Project</span>
                    </button>
                    <button onClick={() => setMeetingType(MeetingType.PLANNING)} className={`flex-1 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${meetingType === MeetingType.PLANNING ? 'bg-white text-emerald-600 shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Layout size={16} /> <span className="hidden sm:inline">Planning</span>
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
                            <button onClick={() => toggleAttendee(emp.name)} className={`flex-1 flex items-center justify-start gap-3 p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer active:scale-95 ${selectedAttendees.includes(emp.name) ? 'bg-slate-900 border-slate-900 text-white shadow-lg transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
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
                       <input type="text" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} placeholder="Naam toevoegen..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-medium" />
                       <button type="submit" disabled={!newEmployeeName.trim()} className="bg-blue-600 disabled:bg-slate-200 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-100 disabled:shadow-none cursor-pointer active:scale-95"><Plus size={16} strokeWidth={3} /></button>
                   </div>
               </form>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-16">
          {currentAgenda.map((item, index) => (
            <AgendaItemCard 
                key={item}
                item={item}
                nextItem={index < currentAgenda.length - 1 ? currentAgenda[index + 1] : null}
                notes={notes}
                topics={topics}
                topicInputs={topicInputs}
                tempActions={tempActions}
                tempDecisions={tempDecisions}
                employees={employees}
                selectedAttendees={selectedAttendees}
                date={date}
                setNotes={setNotes}
                setTopics={setTopics}
                setTopicInputs={setTopicInputs}
                setTempActions={setTempActions}
                setTempDecisions={setTempDecisions}
                handleNoteChange={handleNoteChange}
                onNext={scrollToItem}
            />
          ))}
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-1000">
           <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white pl-8 pr-10 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group border-4 border-white/10 ring-4 ring-slate-900/20 cursor-pointer">
             <div className={`w-3 h-3 rounded-full ${hasDraftData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
             {isSaving ? 'Opslaan...' : 'Vergadering opslaan'}
             <Save size={20} className="group-hover:text-emerald-400 transition-colors" />
           </button>
        </div>

        {showResetConfirm && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)}></div>
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 shadow-2xl border-2 border-red-100">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4"><RotateCcw size={32} /></div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Opnieuw beginnen?</h3>
                        <p className="text-slate-500 text-sm mb-6">Alle niet-opgeslagen notities en acties gaan verloren.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer">Annuleren</button>
                            <button onClick={handleFullReset} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 shadow-lg cursor-pointer">Bevestigen</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {toastMsg && (
          <div className="fixed bottom-6 left-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 z-[120] flex items-center gap-3">
            <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle size={14} className="text-white" /></div>
            <span className="font-bold text-sm">{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

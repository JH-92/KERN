import { Employee, Meeting, Action, ActionStatus, Note, Topic, MeetingType, Decision, VotingState } from './types';

// --- WORKSPACE MANAGEMENT (TEAMS COMPATIBLE) ---
const getWorkspaceId = (): string => {
  if (typeof window === 'undefined') return 'default';
  
  const params = new URLSearchParams(window.location.search);
  const wsParam = params.get('ws');

  if (wsParam) {
    const cleanId = wsParam.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    localStorage.setItem('kern_workspace_id', cleanId);
    return cleanId;
  }

  const storedId = localStorage.getItem('kern_workspace_id');
  if (storedId) {
    return storedId;
  }

  return 'default';
};

let currentWorkspaceId = getWorkspaceId();

const getKey = (key: string) => `mm2026_${currentWorkspaceId}_${key}`;

const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  MEETINGS: 'meetings',
  DRAFT: 'draft_v1',
  VOTING: 'voting_state',
  PRESENCE: 'presence_heartbeat',
  LEGACY_ACTIONS: 'legacy_actions',
  LEGACY_DECISIONS: 'legacy_decisions',
  TIMER: 'meeting_timer_state'
};

interface PresenceRecord {
  sessionId: string;
  lastActive: number;
}

interface TimerState {
  isRunning: boolean;
  startTime: number;
  accumulated: number;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
  'bg-rose-500'
];

const getRandomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Jan de Vries', role: 'Directie', email: 'jan@bedrijf.nl', avatarColor: 'bg-blue-500' },
  { id: '2', name: 'Annelies Bakker', role: 'HR', email: 'annelies@bedrijf.nl', avatarColor: 'bg-pink-500' },
  { id: '3', name: 'Pieter Post', role: 'Operations', email: 'pieter@bedrijf.nl', avatarColor: 'bg-emerald-500' },
  { id: '4', name: 'Sanne Smit', role: 'Marketing', email: 'sanne@bedrijf.nl', avatarColor: 'bg-purple-500' },
  { id: '5', name: 'Willem van Dijk', role: 'IT', email: 'willem@bedrijf.nl', avatarColor: 'bg-slate-500' }
];

export interface MeetingDraft {
  date: string;
  meetingType: string;
  selectedAttendees: string[];
  notes: Record<string, string>;
  topics: Record<string, Topic[]>;
  topicInputs: Record<string, string>;
  tempActions: Record<string, (Partial<Action> & { isLocked?: boolean })[]>;
  tempDecisions: Record<string, (Partial<Decision> & { isLocked?: boolean })[]>;
}

// --- SYNC ENGINE ---
const notifySubscribers = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kern-data-update'));
  }
};

// Helper for safe storage access
const storage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  set: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

export const db = {
  // --- METADATA ---
  getCurrentWorkspace: () => currentWorkspaceId,
  
  setWorkspace: (id: string): string => {
    const cleanId = id.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    currentWorkspaceId = cleanId;
    localStorage.setItem('kern_workspace_id', cleanId);
    notifySubscribers();
    return cleanId;
  },

  getSessionId: (): string => {
    if (typeof window === 'undefined') return 'server';
    let sid = sessionStorage.getItem('kern_session_id');
    if (!sid) {
        sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('kern_session_id', sid);
    }
    return sid;
  },

  // --- HEARTBEAT & PRESENCE ---
  sendHeartbeat: (sessionId: string) => {
    const key = getKey(STORAGE_KEYS.PRESENCE);
    const raw = storage.get(key);
    let presenceList: PresenceRecord[] = raw ? JSON.parse(raw) : [];
    
    const now = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000;

    presenceList = presenceList.filter(p => (now - p.lastActive) < TWO_MINUTES);

    const existingIndex = presenceList.findIndex(p => p.sessionId === sessionId);
    if (existingIndex >= 0) {
        presenceList[existingIndex].lastActive = now;
    } else {
        presenceList.push({ sessionId, lastActive: now });
    }

    storage.set(key, JSON.stringify(presenceList));
    notifySubscribers();
  },

  getActiveUserCount: (): number => {
    const raw = storage.get(getKey(STORAGE_KEYS.PRESENCE));
    if (!raw) return 1;
    
    const presenceList: PresenceRecord[] = JSON.parse(raw);
    const now = Date.now();
    const SIXTY_SECONDS = 60 * 1000;
    
    const active = presenceList.filter(p => (now - p.lastActive) < SIXTY_SECONDS);
    return Math.max(1, active.length);
  },

  // --- TIMER MANAGEMENT (PERSISTENT) ---
  getTimerState: (): TimerState => {
    const data = storage.get(getKey(STORAGE_KEYS.TIMER));
    return data ? JSON.parse(data) : { isRunning: false, startTime: 0, accumulated: 0 };
  },

  getTimerElapsed: (): number => {
    const state = db.getTimerState();
    if (!state.isRunning) return state.accumulated;
    const now = Date.now();
    const currentRun = Math.floor((now - state.startTime) / 1000);
    return state.accumulated + currentRun;
  },

  startTimer: (): void => {
    const state = db.getTimerState();
    if (!state.isRunning) {
        state.isRunning = true;
        state.startTime = Date.now();
        storage.set(getKey(STORAGE_KEYS.TIMER), JSON.stringify(state));
        notifySubscribers();
    }
  },

  pauseTimer: (): void => {
    const state = db.getTimerState();
    if (state.isRunning) {
        const now = Date.now();
        const elapsed = Math.floor((now - state.startTime) / 1000);
        state.accumulated += elapsed;
        state.isRunning = false;
        storage.set(getKey(STORAGE_KEYS.TIMER), JSON.stringify(state));
        notifySubscribers();
    }
  },

  resetTimer: (): void => {
    storage.remove(getKey(STORAGE_KEYS.TIMER));
    notifySubscribers();
  },

  // --- READS ---
  getEmployees: (): Employee[] => {
    const data = storage.get(getKey(STORAGE_KEYS.EMPLOYEES));
    if (data === null) {
      storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(DEFAULT_EMPLOYEES));
      return DEFAULT_EMPLOYEES;
    }
    return JSON.parse(data);
  },

  getMeetings: (): Meeting[] => {
    const data = storage.get(getKey(STORAGE_KEYS.MEETINGS));
    return data ? JSON.parse(data) : [];
  },

  getLegacyActions: (): Action[] => {
    const data = storage.get(getKey(STORAGE_KEYS.LEGACY_ACTIONS));
    return data ? JSON.parse(data) : [];
  },

  getLegacyDecisions: (): Decision[] => {
    const data = storage.get(getKey(STORAGE_KEYS.LEGACY_DECISIONS));
    return data ? JSON.parse(data) : [];
  },

  getAllActions: (): Action[] => {
    const meetings = db.getMeetings();
    const meetingActions = meetings.flatMap(m => m.actions);
    const legacyActions = db.getLegacyActions();
    return [...meetingActions, ...legacyActions];
  },

  getAllDecisions: (): Decision[] => {
    const meetings = db.getMeetings();
    const meetingDecisions = meetings.flatMap(m => m.decisions);
    const legacyDecisions = db.getLegacyDecisions();
    return [...meetingDecisions, ...legacyDecisions];
  },

  getDraft: (): MeetingDraft | null => {
    const data = storage.get(getKey(STORAGE_KEYS.DRAFT));
    return data ? JSON.parse(data) : null;
  },

  getVotingState: (): VotingState => {
    const data = storage.get(getKey(STORAGE_KEYS.VOTING));
    return data ? JSON.parse(data) : { isActive: false, topic: '', votes: [], startTime: 0 };
  },

  // --- WRITES ---
  startVote: (topic: string = 'Afronden'): void => {
    const newState: VotingState = {
        isActive: true,
        topic: topic,
        votes: [],
        startTime: Date.now()
    };
    storage.set(getKey(STORAGE_KEYS.VOTING), JSON.stringify(newState));
    notifySubscribers();
  },

  castVote: (sessionId: string): void => {
    const currentState = db.getVotingState();
    if (!currentState.isActive) return;
    
    if (!currentState.votes.includes(sessionId)) {
        currentState.votes.push(sessionId);
        storage.set(getKey(STORAGE_KEYS.VOTING), JSON.stringify(currentState));
        notifySubscribers();
    }
  },

  stopVote: (): void => {
    storage.remove(getKey(STORAGE_KEYS.VOTING));
    notifySubscribers();
  },

  saveEmployee: (data: Partial<Employee> & { name: string }): void => {
    const employees = db.getEmployees();
    const newEmployee: Employee = { 
      id: Date.now().toString(), 
      name: data.name,
      email: data.email || '',
      role: data.role || 'Algemeen',
      avatarColor: data.avatarColor || getRandomColor()
    };
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify([...employees, newEmployee]));
    notifySubscribers();
  },

  addEmployees: (names: string[]): void => {
    const employees = db.getEmployees();
    const newEmployees = names.map((name, index) => ({
      id: (Date.now() + index).toString(),
      name: name.trim(),
      email: '',
      role: 'Nieuw',
      avatarColor: getRandomColor()
    })).filter(e => e.name.length > 0);
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify([...employees, ...newEmployees]));
    notifySubscribers();
  },

  updateEmployee: (id: string, data: Partial<Employee>): void => {
    const employees = db.getEmployees();
    const updated = employees.map(e => e.id === id ? { ...e, ...data } : e);
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(updated));
    notifySubscribers();
  },

  removeEmployee: (id: string): Employee[] => {
    const employees = db.getEmployees();
    const empToRemove = employees.find(e => e.id === id);
    const updated = employees.filter(e => e.id !== id);
    
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(updated));

    if (empToRemove) {
      const draft = db.getDraft();
      if (draft && draft.selectedAttendees.includes(empToRemove.name)) {
        draft.selectedAttendees = draft.selectedAttendees.filter(name => name !== empToRemove.name);
        db.saveDraft(draft);
      }
    }
    notifySubscribers();
    return updated;
  },

  saveMeeting: (meeting: Meeting): void => {
    const meetings = db.getMeetings();
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify([...meetings, meeting]));
    notifySubscribers();
  },

  // --- LEGACY IMPORT HANDLERS ---
  saveLegacyAction: (action: Action): void => {
    const current = db.getLegacyActions();
    storage.set(getKey(STORAGE_KEYS.LEGACY_ACTIONS), JSON.stringify([...current, action]));
    notifySubscribers();
  },

  saveLegacyDecision: (decision: Decision): void => {
    const current = db.getLegacyDecisions();
    storage.set(getKey(STORAGE_KEYS.LEGACY_DECISIONS), JSON.stringify([...current, decision]));
    notifySubscribers();
  },

  updateMeetingNotes: (meetingId: string, updatedNotes: Note[]): void => {
    const meetings = db.getMeetings();
    const updatedMeetings = meetings.map(m => 
      m.id === meetingId ? { ...m, notes: updatedNotes } : m
    );
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
    notifySubscribers();
  },

  removeAction: (meetingId: string | null, actionId: string): void => {
    if (!meetingId) {
      // Legacy Item
      const legacy = db.getLegacyActions();
      const updated = legacy.filter(a => a.id !== actionId);
      storage.set(getKey(STORAGE_KEYS.LEGACY_ACTIONS), JSON.stringify(updated));
    } else {
      // Meeting Item
      const meetings = db.getMeetings();
      const updatedMeetings = meetings.map(m => {
        if (m.id === meetingId) {
          return { ...m, actions: m.actions.filter(a => a.id !== actionId) };
        }
        return m;
      });
      storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
    }
    notifySubscribers();
  },

  removeDecision: (meetingId: string | null, decisionId: string): void => {
    if (!meetingId) {
      // Legacy Item
      const legacy = db.getLegacyDecisions();
      const updated = legacy.filter(d => d.id !== decisionId);
      storage.set(getKey(STORAGE_KEYS.LEGACY_DECISIONS), JSON.stringify(updated));
    } else {
      // Meeting Item
      const meetings = db.getMeetings();
      const updatedMeetings = meetings.map(m => {
        if (m.id === meetingId) {
          return { ...m, decisions: m.decisions.filter(d => d.id !== decisionId) };
        }
        return m;
      });
      storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
    }
    notifySubscribers();
  },

  updateActionStatus: (meetingId: string | null, actionId: string, newStatus: ActionStatus): void => {
    const today = new Date().toISOString().split('T')[0];
    
    if (!meetingId) {
        // Legacy Action Update
        const legacy = db.getLegacyActions();
        const updated = legacy.map(a => a.id === actionId ? {
            ...a,
            status: newStatus,
            completedAt: newStatus === ActionStatus.DONE ? today : undefined
        } : a);
        storage.set(getKey(STORAGE_KEYS.LEGACY_ACTIONS), JSON.stringify(updated));
    } else {
        // Meeting Action Update
        const meetings = db.getMeetings();
        const updatedMeetings = meetings.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              actions: m.actions.map(a => a.id === actionId ? { 
                ...a, 
                status: newStatus,
                completedAt: newStatus === ActionStatus.DONE ? today : undefined
              } : a)
            };
          }
          return m;
        });
        storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
    }
    notifySubscribers();
  },

  toggleActionStatus: (actionId: string): ActionStatus => {
    return ActionStatus.OPEN;
  },

  saveDraft: (draft: MeetingDraft): void => {
    storage.set(getKey(STORAGE_KEYS.DRAFT), JSON.stringify(draft));
    notifySubscribers();
  },

  clearDraft: (): void => {
    storage.remove(getKey(STORAGE_KEYS.DRAFT));
    notifySubscribers();
  },

  removeDraftAction: (agendaItem: string, index: number): void => {
    const draft = db.getDraft();
    if (draft && draft.tempActions[agendaItem]) {
      draft.tempActions[agendaItem] = draft.tempActions[agendaItem].filter((_, i) => i !== index);
      db.saveDraft(draft);
    }
  },

  removeDraftDecision: (agendaItem: string, index: number): void => {
    const draft = db.getDraft();
    if (draft && draft.tempDecisions && draft.tempDecisions[agendaItem]) {
      draft.tempDecisions[agendaItem] = draft.tempDecisions[agendaItem].filter((_, i) => i !== index);
      db.saveDraft(draft);
    }
  },

  // --- MASTER DEVELOPER TOOL: MASS DATA INJECTION ---
  injectMasterData: (): void => {
    db.resetWorkspace();
    const masterEmployees: Employee[] = [
      { id: 'dev-emp-1', name: 'Jan de Vries', role: 'Directie', email: 'jan@bedrijf.nl', avatarColor: 'bg-blue-600' },
      { id: 'dev-emp-2', name: 'Annelies Bakker', role: 'HR Manager', email: 'annelies@bedrijf.nl', avatarColor: 'bg-pink-500' },
      { id: 'dev-emp-3', name: 'Pieter Post', role: 'Operations', email: 'pieter@bedrijf.nl', avatarColor: 'bg-emerald-600' },
      { id: 'dev-emp-4', name: 'Sanne Smit', role: 'Marketing', email: 'sanne@bedrijf.nl', avatarColor: 'bg-purple-500' },
      { id: 'dev-emp-5', name: 'Willem van Dijk', role: 'IT Manager', email: 'willem@bedrijf.nl', avatarColor: 'bg-slate-600' },
      { id: 'dev-emp-6', name: 'Eva de Jong', role: 'Sales Lead', email: 'eva@bedrijf.nl', avatarColor: 'bg-orange-500' },
      { id: 'dev-emp-7', name: 'Tom Jansen', role: 'Productie', email: 'tom@bedrijf.nl', avatarColor: 'bg-amber-600' },
      { id: 'dev-emp-8', name: 'Lisa Kuipers', role: 'Support', email: 'lisa@bedrijf.nl', avatarColor: 'bg-teal-500' },
      { id: 'dev-emp-9', name: 'Mark Visser', role: 'Finance', email: 'mark@bedrijf.nl', avatarColor: 'bg-cyan-600' },
      { id: 'dev-emp-10', name: 'Sophie de Boer', role: 'R&D', email: 'sophie@bedrijf.nl', avatarColor: 'bg-indigo-500' },
      { id: 'dev-emp-11', name: 'Kevin Meijer', role: 'Logistiek', email: 'kevin@bedrijf.nl', avatarColor: 'bg-lime-600' }
    ];
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(masterEmployees));

    const decisionsPool = [
        ["Budget Q1", "Het budget voor Q1 is na herziening goedgekeurd door de directie."],
        ["Servermigratie", "De datum voor de servermigratie is definitief vastgelegd op 23 maart."],
        ["Aannamebeleid", "Het nieuwe aannamebeleid treedt per direct in werking."],
        ["Zomercampagne", "Startschot gegeven voor de 'Summer Vibes' marketingcampagne."],
        ["Leverancier", "IT-Supplies BV is geselecteerd als nieuwe vaste hardware leverancier."],
        ["Thuiswerken", "Thuiswerkbeleid is aangepast: minimaal 2 dagen op kantoor verplicht."]
    ];
    
    const actionsPool = [
        ["Offerte opvragen", "Opvragen van offertes bij leverancier X en Y voor de nieuwe hardware."],
        ["Sollicitatiegesprekken", "Eerste ronde gesprekken voeren met kandidaten voor de vacature van Developer."],
        ["Presentatie MT", "Voorbereiden van de kwartaalcijfers presentatie voor het Management Team."],
        ["Klantonderzoek", "Analyseren van de resultaten van het jaarlijkse klanttevredenheidsonderzoek."],
        ["Laptops bestellen", "Bestellen van 5 nieuwe laptops voor de nieuwe medewerkers."],
        ["Veiligheidsinspectie", "Jaarlijkse inspectie van de brandblussers en nooduitgangen uitvoeren."]
    ];

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const getWeek = (date: Date) => {
        const d = new Date(date.getTime());
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const meetings: Meeting[] = [];
    const today = new Date();
    
    let globalActionIndex = 0;
    let globalDecisionIndex = 0;

    for (let i = 0; i < 5; i++) {
        const meetingDate = new Date(today);
        meetingDate.setDate(meetingDate.getDate() - (i * 7 + 2)); 
        const dateStr = formatDate(meetingDate);
        const meetingId = `dev-mtg-${1000 + i}`;
        
        const meetingType = i < 3 ? MeetingType.PROJECT : MeetingType.PLANNING;
        
        const attendees = masterEmployees
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map(e => e.name);

        const meetingDecisions = [];
        const numDecisions = 2;
        
        for(let d=0; d < numDecisions; d++) {
            const [decTitle, decDesc] = decisionsPool[globalDecisionIndex % decisionsPool.length];
            meetingDecisions.push({
                id: `dev-dec-${globalDecisionIndex}`,
                readable_id: `BES-26-${(globalDecisionIndex + 1).toString().padStart(3, '0')}`,
                meetingId: meetingId,
                title: decTitle,
                description: decDesc,
                owners: [attendees[0]],
                date: dateStr,
                topic: 'Algemeen'
            });
            globalDecisionIndex++;
        }

        const meetingActions = [];
        const numActions = 3; 
        for(let a=0; a < numActions; a++) {
            let status = ActionStatus.OPEN;
            let deadlineDate = new Date(meetingDate);
            deadlineDate.setDate(deadlineDate.getDate() + 7);

            const [title, desc] = actionsPool[globalActionIndex % actionsPool.length];

            meetingActions.push({
                id: `dev-act-${globalActionIndex}`,
                readable_id: `ACT-26-${(globalActionIndex + 1).toString().padStart(3, '0')}`,
                meetingId: meetingId,
                title: title,
                description: desc,
                owners: [attendees[1]],
                deadline: formatDate(deadlineDate),
                status: status,
                topic: 'Actielijst',
                originType: meetingType
            });
            globalActionIndex++;
        }

        meetings.push({
            id: meetingId,
            date: dateStr,
            weekNumber: getWeek(meetingDate),
            type: meetingType,
            attendees: attendees,
            notes: [{ agendaItem: 'Opening', content: `Start vergadering. Aanwezigen: ${attendees.join(', ')}.` }],
            actions: meetingActions,
            decisions: meetingDecisions
        });
    }

    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(meetings));
    notifySubscribers();
  },

  resetWorkspace: (): void => {
    storage.remove(getKey(STORAGE_KEYS.EMPLOYEES));
    storage.remove(getKey(STORAGE_KEYS.MEETINGS));
    storage.remove(getKey(STORAGE_KEYS.DRAFT));
    storage.remove(getKey(STORAGE_KEYS.VOTING));
    storage.remove(getKey(STORAGE_KEYS.PRESENCE));
    storage.remove(getKey(STORAGE_KEYS.LEGACY_ACTIONS));
    storage.remove(getKey(STORAGE_KEYS.LEGACY_DECISIONS));
    storage.remove(getKey(STORAGE_KEYS.TIMER));
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(DEFAULT_EMPLOYEES));
    notifySubscribers();
  }
};
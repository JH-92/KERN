
import { Employee, Meeting, Action, ActionStatus, Note, Topic, MeetingType, Decision } from './types';

// --- WORKSPACE MANAGEMENT (TEAMS COMPATIBLE) ---
// Uses URL query param ?ws=... to isolate data.
// Logic: URL > LocalStorage > Default
const getWorkspaceId = (): string => {
  if (typeof window === 'undefined') return 'default';
  
  const params = new URLSearchParams(window.location.search);
  const wsParam = params.get('ws');

  // 1. URL is LEADING. If present, use it and update persistence.
  if (wsParam) {
    const cleanId = wsParam.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    localStorage.setItem('kern_workspace_id', cleanId);
    return cleanId;
  }

  // 2. Fallback to Persisted ID (Safety net for reloads/navigation)
  const storedId = localStorage.getItem('kern_workspace_id');
  if (storedId) {
    return storedId;
  }

  // 3. Default
  return 'default';
};

// Mutable variable to allow dynamic switching without page reload
let currentWorkspaceId = getWorkspaceId();

// Namespace keys to simulate "Cloud Buckets" in LocalStorage
const getKey = (key: string) => `mm2026_${currentWorkspaceId}_${key}`;

const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  MEETINGS: 'meetings',
  DRAFT: 'draft_v1',
};

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
    return cleanId;
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

  getAllActions: (): Action[] => {
    const meetings = db.getMeetings();
    return meetings.flatMap(m => m.actions);
  },

  getDraft: (): MeetingDraft | null => {
    const data = storage.get(getKey(STORAGE_KEYS.DRAFT));
    return data ? JSON.parse(data) : null;
  },

  // --- WRITES (Simulating Cloud Push) ---
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
  },

  updateEmployee: (id: string, data: Partial<Employee>): void => {
    const employees = db.getEmployees();
    const updated = employees.map(e => e.id === id ? { ...e, ...data } : e);
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(updated));
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
    return updated;
  },

  saveMeeting: (meeting: Meeting): void => {
    const meetings = db.getMeetings();
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify([...meetings, meeting]));
  },

  updateMeetingNotes: (meetingId: string, updatedNotes: Note[]): void => {
    const meetings = db.getMeetings();
    const updatedMeetings = meetings.map(m => 
      m.id === meetingId ? { ...m, notes: updatedNotes } : m
    );
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
  },

  removeAction: (meetingId: string, actionId: string): void => {
    const meetings = db.getMeetings();
    const updatedMeetings = meetings.map(m => {
      if (m.id === meetingId) {
        return { ...m, actions: m.actions.filter(a => a.id !== actionId) };
      }
      return m;
    });
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
  },

  removeDecision: (meetingId: string, decisionId: string): void => {
    const meetings = db.getMeetings();
    const updatedMeetings = meetings.map(m => {
      if (m.id === meetingId) {
        return { ...m, decisions: m.decisions.filter(d => d.id !== decisionId) };
      }
      return m;
    });
    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
  },

  updateActionStatus: (meetingId: string, actionId: string, newStatus: ActionStatus): void => {
    const meetings = db.getMeetings();
    const today = new Date().toISOString().split('T')[0];
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
  },

  toggleActionStatus: (actionId: string): ActionStatus => {
    const meetings = db.getMeetings();
    const today = new Date().toISOString().split('T')[0];
    let newStatus = ActionStatus.OPEN;

    const updatedMeetings = meetings.map(m => ({
      ...m,
      actions: m.actions.map(a => {
        if (a.id === actionId) {
          newStatus = a.status === ActionStatus.DONE ? ActionStatus.OPEN : ActionStatus.DONE;
          return {
            ...a,
            status: newStatus,
            completedAt: newStatus === ActionStatus.DONE ? today : undefined
          };
        }
        return a;
      })
    }));

    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(updatedMeetings));
    return newStatus;
  },

  saveDraft: (draft: MeetingDraft): void => {
    storage.set(getKey(STORAGE_KEYS.DRAFT), JSON.stringify(draft));
  },

  clearDraft: (): void => {
    storage.remove(getKey(STORAGE_KEYS.DRAFT));
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
    // 1. Wipe current workspace
    db.resetWorkspace();

    // 2. Inject 15 Employees with diverse roles
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
      { id: 'dev-emp-11', name: 'Kevin Meijer', role: 'Logistiek', email: 'kevin@bedrijf.nl', avatarColor: 'bg-lime-600' },
      { id: 'dev-emp-12', name: 'Linda Groot', role: 'Office', email: 'linda@bedrijf.nl', avatarColor: 'bg-rose-500' },
      { id: 'dev-emp-13', name: 'Rick Bakker', role: 'Stagiair', email: 'rick@bedrijf.nl', avatarColor: 'bg-yellow-500' },
      { id: 'dev-emp-14', name: 'Jasper Veenstra', role: 'IT Support', email: 'jasper@bedrijf.nl', avatarColor: 'bg-sky-600' },
      { id: 'dev-emp-15', name: 'Roos van der Meer', role: 'Recruitment', email: 'roos@bedrijf.nl', avatarColor: 'bg-fuchsia-500' }
    ];
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(masterEmployees));

    // 3. Generators
    // Updated Decisions Pool: [Title, Description]
    const decisionsPool = [
        ["Budget Q1", "Het budget voor Q1 is na herziening goedgekeurd door de directie."],
        ["Servermigratie", "De datum voor de servermigratie is definitief vastgelegd op 23 maart."],
        ["Aannamebeleid", "Het nieuwe aannamebeleid treedt per direct in werking."],
        ["Zomercampagne", "Startschot gegeven voor de 'Summer Vibes' marketingcampagne."],
        ["Leverancier", "IT-Supplies BV is geselecteerd als nieuwe vaste hardware leverancier."],
        ["Thuiswerken", "Thuiswerkbeleid is aangepast: minimaal 2 dagen op kantoor verplicht."],
        ["Investering", "Akkoord op de investering voor een nieuwe verpakkingslijn."],
        ["Bedrijfsuitje", "Datum voor het bedrijfsuitje is geprikt op 15 juni."],
        ["Klachten", "De procedure voor klachtenafhandeling is aangescherpt na feedback."],
        ["Veiligheid", "Update van de veiligheidsprotocollen in het magazijn is goedgekeurd."]
    ];
    
    // Updated Actions Pool: [Title, Description]
    const actionsPool = [
        ["Offerte opvragen", "Opvragen van offertes bij leverancier X en Y voor de nieuwe hardware."],
        ["Sollicitatiegesprekken", "Eerste ronde gesprekken voeren met kandidaten voor de vacature van Developer."],
        ["Presentatie MT", "Voorbereiden van de kwartaalcijfers presentatie voor het Management Team."],
        ["Klantonderzoek", "Analyseren van de resultaten van het jaarlijkse klanttevredenheidsonderzoek."],
        ["Laptops bestellen", "Bestellen van 5 nieuwe laptops voor de nieuwe medewerkers die volgende maand starten."],
        ["Veiligheidsinspectie", "Jaarlijkse inspectie van de brandblussers en nooduitgangen uitvoeren."],
        ["Website update", "Nieuwe content plaatsen op de 'Over Ons' pagina en teamfoto's bijwerken."],
        ["Nieuwsbrief versturen", "Opstellen en versturen van de maandelijkse nieuwsbrief naar alle klanten."],
        ["Jaarrekening check", "Controleren van de concept jaarrekening in samenwerking met de accountant."],
        ["Onderhoudscontracten", "Nalopen van alle lopende onderhoudscontracten op vervaldata."],
        ["Teamuitje regelen", "Locatie en datum prikken voor het jaarlijkse teamuitje."],
        ["Vakantieplanning", "Inventariseren van de zomervakantieplannen van het hele team."],
        ["Evaluaties voeren", "Inplannen en voeren van de halfjaarlijkse evaluatiegesprekken."],
        ["Inwerken nieuwe collega", "Opstellen van het inwerkschema voor de nieuwe collega."],
        ["Backups controleren", "Testen van de restore-procedure van de server backups."],
        ["Budget herzien", "Herzien van het marketingbudget voor Q3 en Q4."],
        ["Klantenbestand opschonen", "Verwijderen van inactieve klanten uit het CRM systeem conform AVG."],
        ["Social media plan", "Schrijven van het contentplan voor LinkedIn en Instagram voor komende maand."],
        ["Voorraad tellen", "Uitvoeren van een steekproefsgewijze voorraadtelling in het magazijn."],
        ["Facturatie optimaliseren", "Onderzoeken van mogelijkheden om het facturatieproces te automatiseren."],
        ["Contracten check", "Juridische check laten uitvoeren op de nieuwe standaard leveringsvoorwaarden."],
        ["Concurrentieanalyse", "In kaart brengen van de prijzen en diensten van onze top 3 concurrenten."],
        ["Interne audit", "Voorbereiden van de afdeling op de komende interne ISO-audit."],
        ["Licenties vernieuwen", "Inventariseren en verlengen van alle softwarelicenties."],
        ["Verzuimcijfers", "Analyseren van de verzuimcijfers van het afgelopen kwartaal."],
        ["Klachtafhandeling", "Evalueren van de klachtafhandeling en processen bijstellen."],
        ["Sales targets", "Vaststellen van de individuele sales targets voor het komende jaar."],
        ["Trainingsbehoefte", "Peilen van de behoefte aan training en opleiding binnen het team."],
        ["Energielabel", "Onderzoek doen naar maatregelen om het energielabel van het kantoor te verbeteren."],
        ["AVG check", "Controleren of alle verwerkingsovereenkomsten nog up-to-date zijn."]
    ];

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const getWeek = (date: Date) => {
        const d = new Date(date.getTime());
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // 4. Generate 10 Meetings
    const meetings: Meeting[] = [];
    const today = new Date();
    
    let globalActionIndex = 0;
    let globalDecisionIndex = 0;

    for (let i = 0; i < 10; i++) {
        const meetingDate = new Date(today);
        meetingDate.setDate(meetingDate.getDate() - (i * 7 + 2)); 
        const dateStr = formatDate(meetingDate);
        const meetingId = `dev-mtg-${1000 + i}`;
        
        // Distribution: 6 Project, 4 Planning
        const meetingType = i < 6 ? MeetingType.PROJECT : MeetingType.PLANNING;
        
        const attendees = masterEmployees
            .sort(() => 0.5 - Math.random())
            .slice(0, 5 + Math.floor(Math.random() * 4))
            .map(e => e.name);

        // Decisions: Ensure rich data structure
        const meetingDecisions = [];
        // Generate 2 to 3 decisions per meeting
        const numDecisions = 2 + Math.floor(Math.random() * 2);
        
        for(let d=0; d < numDecisions; d++) {
            if (globalDecisionIndex >= decisionsPool.length * 2) break; // limit total decisions
            const [decTitle, decDesc] = decisionsPool[globalDecisionIndex % decisionsPool.length];
            
            // Random owner from attendees or default to first
            const owner = attendees.length > 0 ? attendees[Math.floor(Math.random() * attendees.length)] : 'Directie';

            meetingDecisions.push({
                id: `dev-dec-${globalDecisionIndex}`,
                readable_id: `BES-26-${(globalDecisionIndex + 1).toString().padStart(3, '0')}`,
                meetingId: meetingId,
                title: decTitle,
                description: decDesc,
                owners: [owner],
                date: dateStr, // Synchronized with meeting date
                topic: ['Financiën', 'HR', 'IT', 'Operations', 'Sales'][Math.floor(Math.random() * 5)]
            });
            globalDecisionIndex++;
        }

        // Actions
        const meetingActions = [];
        const numActions = i % 2 === 0 ? 3 : 2; 
        for(let a=0; a < numActions; a++) {
            if (globalActionIndex >= 30) break;
            
            // Status Logic: 12 Open, 8 Pending, 5 Done
            let status = ActionStatus.OPEN;
            let deadlineDate = new Date(meetingDate);
            let completedAt = undefined;

            if (globalActionIndex < 5) { // 5 Done
                status = ActionStatus.DONE;
                completedAt = dateStr;
                deadlineDate.setDate(deadlineDate.getDate() + 7);
            } else if (globalActionIndex < 13) { // 8 Pending
                status = ActionStatus.PROGRESS;
                deadlineDate.setDate(deadlineDate.getDate() + 14);
            } else { // 12 Open (some overdue)
                status = ActionStatus.OPEN;
                const daysOffset = globalActionIndex % 2 === 0 ? -5 : 10; 
                deadlineDate.setDate(deadlineDate.getDate() + daysOffset);
            }

            const [title, desc] = actionsPool[globalActionIndex % actionsPool.length];
            const owner = attendees.length > 0 ? attendees[Math.floor(Math.random() * attendees.length)] : 'Actiehouder';

            meetingActions.push({
                id: `dev-act-${globalActionIndex}`,
                readable_id: `ACT-26-${(globalActionIndex + 1).toString().padStart(3, '0')}`,
                meetingId: meetingId,
                title: title,
                description: desc,
                owners: [owner],
                deadline: formatDate(deadlineDate),
                status: status,
                topic: ['Rondvraag', 'Projecten', 'Planning', 'Actielijst'][Math.floor(Math.random() * 4)],
                originType: meetingType,
                completedAt: completedAt
            });
            globalActionIndex++;
        }

        meetings.push({
            id: meetingId,
            date: dateStr,
            weekNumber: getWeek(meetingDate),
            type: meetingType,
            attendees: attendees,
            notes: [
                { agendaItem: 'Opening', content: `Vergadering geopend om 09:00 uur. Aanwezigen: ${attendees.join(', ')}.` },
                { agendaItem: 'Mededelingen', content: "De voortgang is besproken en vastgelegd." },
                { agendaItem: 'Rondvraag', content: 'Geen verdere vragen. De vergadering wordt gesloten.' }
            ],
            actions: meetingActions,
            decisions: meetingDecisions
        });
    }

    storage.set(getKey(STORAGE_KEYS.MEETINGS), JSON.stringify(meetings));
  },

  resetWorkspace: (): void => {
    storage.remove(getKey(STORAGE_KEYS.EMPLOYEES));
    storage.remove(getKey(STORAGE_KEYS.MEETINGS));
    storage.remove(getKey(STORAGE_KEYS.DRAFT));
    // Re-initialize with defaults
    storage.set(getKey(STORAGE_KEYS.EMPLOYEES), JSON.stringify(DEFAULT_EMPLOYEES));
  }
};

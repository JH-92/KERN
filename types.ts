
export enum MeetingType {
  PLANNING = 'Planningsoverleg',
  PROJECT = 'Projectleidersoverleg'
}

export enum ActionStatus {
  OPEN = 'Open',
  PROGRESS = 'In behandeling',
  DONE = 'Gereed'
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarColor?: string;
}

export interface Action {
  id: string;
  readable_id: string;
  meetingId: string | null; // Nullable for legacy items
  title: string; 
  description: string; 
  owners: string[]; 
  deadline: string;
  status: ActionStatus;
  topic: string;
  originType?: MeetingType;
  completedAt?: string;
  isLegacy?: boolean; // New flag
}

export interface Decision {
  id: string;
  readable_id: string;
  meetingId: string | null; // Nullable for legacy items
  title: string;       
  description: string; 
  owners: string[];    
  date: string;        
  topic: string;
  isLegacy?: boolean; // New flag
}

export interface Topic {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Note {
  agendaItem: string;
  content: string;
  topics?: Topic[];
}

export interface Meeting {
  id: string;
  date: string;
  weekNumber: number;
  type: MeetingType;
  attendees: string[];
  notes: Note[];
  actions: Action[];
  decisions: Decision[];
  duration?: string;
}

export interface VotingState {
  isActive: boolean;
  topic: string;
  votes: string[]; 
  startTime: number;
}

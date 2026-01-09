
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
  meetingId: string;
  title: string; // New field for short summary
  description: string; // Detailed description
  owners: string[]; 
  deadline: string;
  status: ActionStatus;
  topic: string;
  originType?: MeetingType;
  completedAt?: string;
}

export interface Decision {
  id: string;
  readable_id: string;
  meetingId: string;
  text: string;
  topic: string;
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
}

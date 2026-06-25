export type UserRole = 'admin' | 'jury' | 'debater' | 'spectator';

export type DebaterStatus = 'rookie' | 'open' | null;

export interface User {
  id: string;
  username: string; // Nickname
  fullName: string; // Ad Soyad
  phoneNumber: string; // Telefon
  email: string;
  password?: string;
  city: string; // Şehir
  age: number; // Yaş
  school: string; // Okul
  role: UserRole;
  status: DebaterStatus;
  createdAt: string;
}

export interface Motion {
  id: string;
  text: string;
  infoSlide?: string;
  category?: string;
}

export type SpeakerRole = 'PM' | 'LO' | 'DPM' | 'DLO' | 'MG' | 'MO' | 'GW' | 'OW';

export const SPEAKER_NAMES: Record<SpeakerRole, string> = {
  PM: 'Prime Minister (Başbakan)',
  LO: 'Leader of Opposition (Muhalefet Lideri)',
  DPM: 'Deputy Prime Minister (Başbakan Yardımcısı)',
  DLO: 'Deputy Leader of Opposition (Muhalefet Lideri Yardımcısı)',
  MG: 'Member of Government (Hükümet Üyesi)',
  MO: 'Member of Opposition (Muhalefet Üyesi)',
  GW: 'Government Whip (Hükümet Kamçısı)',
  OW: 'Opposition Whip (Muhalefet Kamçısı)',
};

export const SPEAKER_TEAMS: Record<SpeakerRole, 'Opening Government' | 'Opening Opposition' | 'Closing Government' | 'Closing Opposition'> = {
  PM: 'Opening Government',
  LO: 'Opening Opposition',
  DPM: 'Opening Government',
  DLO: 'Opening Opposition',
  MG: 'Closing Government',
  MO: 'Closing Opposition',
  GW: 'Closing Government',
  OW: 'Closing Opposition',
};

export type DebateStatus = 'lobby' | 'preparation' | 'debate' | 'scoring' | 'finished';

export interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'finished';
  elapsedSeconds: number; // current speaker speaking duration
  startedAt: number | null; // epoch timestamp
  pausedAt: number | null; // epoch timestamp if paused
}

export interface POIRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterTeam: string;
  requestedAt: number; // timestamp
  acceptedAt: number | null; // timestamp if accepted
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface SpectatorVote {
  userId: string;
  username: string;
  team: 'HA' | 'MA' | 'HK' | 'MK';
  timestamp: number;
}

export interface DebateResult {
  // Team rankings (1st, 2nd, 3rd, 4th)
  // Values are team names (e.g. 'Opening Government' -> 1)
  rankings: {
    'Opening Government': number;
    'Opening Opposition': number;
    'Closing Government': number;
    'Closing Opposition': number;
  };
  // Speaker points (50 to 100 per speaker role)
  speakerPoints: Record<SpeakerRole, number>;
  juryNotes: string;
  submittedAt: string;
}

export interface RoomState {
  roomId: string;
  roomName: string;
  status: DebateStatus;
  motion: Motion | null;
  isMotionReleased: boolean;
  areSpectatorVotesReleased: boolean;
  prepStartedAt: number | null; // epoch timestamp for 15-min prep countdown
  activeSpeaker: SpeakerRole | null;
  timer: TimerState;
  activePoi: POIRequest | null;
  spectatorVotes: SpectatorVote[];
  result: DebateResult | null;
  matchMode?: 'physical' | 'online';
  // Dynamic list of active participants inside the room with their roles
  participants: {
    [userId: string]: {
      id: string;
      username: string;
      role: UserRole;
      status: DebaterStatus;
      assignedSpeakerRole?: SpeakerRole | null;
      isMuted: boolean;
      joinedAt: number;
    };
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, mapToRoomState } from '../database/database';
import { supabase } from '../database/supabaseClient';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import type { RoomState, SpeakerRole } from '../types';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Award, 
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  FileText,
  ChevronRight,
  ArrowLeftRight,
  Loader2
} from 'lucide-react';
import { JuryPanel } from './JuryPanel';
import './RoomPage.css';

interface RoomPageProps {
  roomId: string;
  onLeave: () => void;
}

const SPEAKER_ORDER: SpeakerRole[] = ['PM', 'LO', 'DPM', 'DLO', 'MG', 'MO', 'GW', 'OW'];

const SPEAKER_DETAILS: Record<SpeakerRole, { name: string; team: string; label: 'HA' | 'MA' | 'HK' | 'MK'; side: 'Gov' | 'Opp' }> = {
  PM: { name: 'Başbakan (PM)', team: 'Hükümet Açılış', label: 'HA', side: 'Gov' },
  LO: { name: 'Muhalefet Lideri (LO)', team: 'Muhalefet Açılış', label: 'MA', side: 'Opp' },
  DPM: { name: 'Başbakan Yardımcısı (DPM)', team: 'Hükümet Açılış', label: 'HA', side: 'Gov' },
  DLO: { name: 'M. Lideri Yardımcısı (DLO)', team: 'Muhalefet Açılış', label: 'MA', side: 'Opp' },
  MG: { name: 'Hükümet Üyesi (MG)', team: 'Hükümet Kapanış', label: 'HK', side: 'Gov' },
  MO: { name: 'Muhalefet Üyesi (MO)', team: 'Muhalefet Kapanış', label: 'MK', side: 'Opp' },
  GW: { name: 'Hükümet Kamçısı (GW)', team: 'Hükümet Kapanış', label: 'HK', side: 'Gov' },
  OW: { name: 'Muhalefet Kamçısı (OW)', team: 'Muhalefet Kapanış', label: 'MK', side: 'Opp' },
};

// Sub-component to dynamically publish/unpublish local audio track
const LocalAudioPublisher = ({ isMicEnabled }: { isMicEnabled: boolean }) => {
  const { localParticipant } = useLocalParticipant();
  
  useEffect(() => {
    if (!localParticipant) return;
    // Her zaman mevcut state'i uygula — hasAttemptedRef gereksiz kısıtlama yapıyordu
    localParticipant.setMicrophoneEnabled(isMicEnabled).catch(err => {
      console.error("Mikrofon izni alınamadı veya yayın başlatılamadı:", err);
    });
  }, [isMicEnabled, localParticipant]);
  
  return null;
};

// Active Speakers Indicator Component
const ActiveSpeakersOverlay = () => {
  const participants = useParticipants();
  const speakers = participants.filter(p => p.isSpeaking);
  
  if (speakers.length === 0) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      background: 'rgba(0,0,0,0.85)',
      padding: '10px 16px',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999,
      border: '1px solid rgba(16, 185, 129, 0.3)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      animation: 'fadeIn 0.3s ease'
    }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Şu An Konuşanlar</span>
      {speakers.map(s => (
        <div key={s.identity} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="hero-audio-waves" style={{ height: '14px', gap: '3px' }}>
             <div className="hero-wave-bar" style={{ width: '3px', animationDuration: '0.5s', background: 'var(--color-success)' }} />
             <div className="hero-wave-bar" style={{ width: '3px', animationDuration: '0.7s', background: 'var(--color-success)' }} />
             <div className="hero-wave-bar" style={{ width: '3px', animationDuration: '0.6s', background: 'var(--color-success)' }} />
             <div className="hero-wave-bar" style={{ width: '3px', animationDuration: '0.8s', background: 'var(--color-success)' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.identity}</span>
        </div>
      ))}
    </div>
  );
};

export const RoomPage: React.FC<RoomPageProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomState | null>(null);
  
  const [liveKitToken, setLiveKitToken] = useState<string>('');
  const [liveKitError, setLiveKitError] = useState<string>('');
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const tokenApiUrl = import.meta.env.VITE_TOKEN_API_URL || 'http://localhost:3001';
  const [isLocalMicEnabled, setIsLocalMicEnabled] = useState(false);

  const [localElapsed, setLocalElapsed] = useState(0);
  const [localPrepRemaining, setLocalPrepRemaining] = useState(900); // 15 mins prep
  const [showPollWidget, setShowPollWidget] = useState(false);
  const [showParticipantsWidget, setShowParticipantsWidget] = useState(false);
  const [showJuryNotepadWidget, setShowJuryNotepadWidget] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [drawMode, setDrawMode] = useState<'individual' | 'team'>('individual');
  const [indNames, setIndNames] = useState<string[]>(Array(8).fill(''));
  const [teamNames, setTeamNames] = useState<{ name: string; m1: string; m2: string }[]>([
    { name: 'Takım 1', m1: '', m2: '' },
    { name: 'Takım 2', m1: '', m2: '' },
    { name: 'Takım 3', m1: '', m2: '' },
    { name: 'Takım 4', m1: '', m2: '' }
  ]);
  const [showMotionDetailModal, setShowMotionDetailModal] = useState(false);
  const [hasSeenMotion, setHasSeenMotion] = useState(false);

  // Jury private notepad (saved locally)
  const [draftScores, setDraftScores] = useState<Record<SpeakerRole, string>>(() => {
    try {
      const saved = localStorage.getItem(`kursu_draft_scores_${roomId}`);
      return saved ? JSON.parse(saved) : {
        PM: '75', LO: '75', DPM: '75', DLO: '75', MG: '75', MO: '75', GW: '75', OW: '75'
      };
    } catch {
      return { PM: '75', LO: '75', DPM: '75', DLO: '75', MG: '75', MO: '75', GW: '75', OW: '75' };
    }
  });
  const [draftNotes, setDraftNotes] = useState(() => {
    return localStorage.getItem(`kursu_draft_notes_${roomId}`) || '';
  });

  const timerIntervalRef = useRef<any>(null);
  const prepIntervalRef = useRef<any>(null);

  // Determine user seat/role
  const isJuryOrAdmin = user ? (user.role === 'jury' || user.role === 'admin') : false;

  // Keep the latest onLeave callback in a ref to avoid reconnecting to Supabase Realtime on every render
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  // Load and subscribe to room data using Supabase Realtime
  useEffect(() => {
    if (!user || !roomId) return;
    const fetchToken = async () => {
      try {
        setLiveKitError('');
        const livekitUsername = user.username || user.email || user.id || 'Admin';
        const response = await fetch(`${tokenApiUrl}/api/token?room=${roomId}&username=${encodeURIComponent(livekitUsername)}`);
        if (response.ok) {
          const data = await response.json();
          setLiveKitToken(data.token);
        } else {
          console.error('LiveKit token API returned error status:', response.status);
          setLiveKitError('Ses sunucusuna bağlanılamadı (token hatası).');
        }
      } catch (error) {
        console.error('LiveKit token fetch error:', error);
        setLiveKitError('Ses sunucusuna ulaşılamıyor. Lütfen sunucunun çalıştığından emin olun.');
      }
    };
    fetchToken();
  }, [user?.id, roomId, tokenApiUrl]);

  useEffect(() => {
    const fetchInitialRoom = async () => {
      try {
        const { data: dbRoom, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_id', roomId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching initial room:', error);
          return;
        }

        if (dbRoom) {
          setRoom(mapToRoomState(dbRoom));
        } else {
          onLeaveRef.current();
        }
      } catch (err) {
        console.error('Error fetching initial room:', err);
      }
    };

    fetchInitialRoom();

    const roomChannel = supabase
      .channel(`room-update-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            onLeaveRef.current();
          } else if (payload.new) {
            setRoom(mapToRoomState(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [roomId]);

  // Auto open motion details when released
  useEffect(() => {
    if (room?.isMotionReleased && !hasSeenMotion) {
      setShowMotionDetailModal(true);
      setHasSeenMotion(true);
    }
  }, [room?.isMotionReleased, hasSeenMotion]);

  // Synchronize timers locally
  useEffect(() => {
    if (!room) return;

    if (room.status === 'debate' && room.timer.status === 'running' && room.timer.startedAt) {
      const updateSpeechTimer = () => {
        const elapsed = Math.floor((Date.now() - (room.timer.startedAt || 0)) / 1000);
        setLocalElapsed(elapsed);

        // Auto expire active POI request if expired
        if (isJuryOrAdmin && room.activePoi && room.activePoi.status === 'pending') {
          const poiAge = Date.now() - room.activePoi.requestedAt;
          if (poiAge > 15000) {
            Database.updateRoom(roomId, (r) => {
              r.activePoi = null;
            }).catch(err => console.error("Error auto-expiring POI:", err));
          }
        }
        
        // Auto expire accepted POI floor after 15 seconds
        if (isJuryOrAdmin && room.activePoi && room.activePoi.status === 'accepted' && room.activePoi.acceptedAt) {
          const acceptedAge = Date.now() - room.activePoi.acceptedAt;
          if (acceptedAge > 15000) {
            Database.updateRoom(roomId, (r) => {
              r.activePoi = null;
            }).catch(err => console.error("Error auto-expiring POI floor:", err));
          }
        }
      };

      updateSpeechTimer();
      timerIntervalRef.current = setInterval(updateSpeechTimer, 200);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setLocalElapsed(room.timer.elapsedSeconds);
    }

    if (room.status === 'preparation' && room.prepStartedAt) {
      const updatePrepTimer = () => {
        const elapsed = Math.floor((Date.now() - (room.prepStartedAt || 0)) / 1000);
        const remaining = Math.max(900 - elapsed, 0);
        setLocalPrepRemaining(remaining);
      };

      updatePrepTimer();
      prepIntervalRef.current = setInterval(updatePrepTimer, 500);
    } else {
      if (prepIntervalRef.current) {
        clearInterval(prepIntervalRef.current);
        prepIntervalRef.current = null;
      }
      setLocalPrepRemaining(900);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (prepIntervalRef.current) {
        clearInterval(prepIntervalRef.current);
        prepIntervalRef.current = null;
      }
    };
  }, [room, roomId, isJuryOrAdmin]);

  if (!user || !room) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '80vh', 
        gap: '16px' 
      }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--color-primary)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Oda bilgileri yükleniyor...</span>
      </div>
    );
  }

  // Determine user seat/role
  const userSeat = Object.entries(room.participants).find(([_, p]) => p.id === user.id && p.assignedSpeakerRole);
  const userSpeakerRole = userSeat ? (userSeat[1].assignedSpeakerRole as SpeakerRole) : null;

  // Helpers
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getTimerStyles = () => {
    if (localElapsed < 60) {
      return { color: 'var(--color-warning)', label: 'Korumalı Süre (POI Alınamaz)', width: `${(localElapsed / 60) * 100}%` };
    } else if (localElapsed <= 360) {
      return { color: 'var(--color-success)', label: 'Soru Alımı Serbest (POI Open)', width: `${((localElapsed - 60) / 300) * 100}%` };
    } else if (localElapsed <= 440) {
      return { color: 'var(--color-warning)', label: 'Korumalı Süre (POI Alınamaz)', width: `${((localElapsed - 360) / 80) * 100}%` };
    } else {
      return { color: 'var(--color-danger)', label: 'Süre Aşıldı (Overtime)', width: '100%' };
    }
  };

  const timerConfig = getTimerStyles();

  // Draft Notepad changes
  const handleDraftScoreChange = (role: SpeakerRole, val: string) => {
    const nextDraft = { ...draftScores, [role]: val };
    setDraftScores(nextDraft);
    localStorage.setItem(`kursu_draft_scores_${roomId}`, JSON.stringify(nextDraft));
  };

  const handleDraftNotesChange = (val: string) => {
    setDraftNotes(val);
    localStorage.setItem(`kursu_draft_notes_${roomId}`, val);
  };

  const handleAutoFillParticipants = () => {
    if (!room) return;
    const debaters = Object.values(room.participants)
      .filter(p => p.role === 'debater')
      .map(p => p.username);
    
    if (drawMode === 'individual') {
      const newIndNames = [...indNames];
      for (let i = 0; i < 8; i++) {
        newIndNames[i] = debaters[i] || '';
      }
      setIndNames(newIndNames);
    } else {
      const newTeams = [...teamNames];
      let pIdx = 0;
      for (let i = 0; i < 4; i++) {
        newTeams[i].m1 = debaters[pIdx++] || '';
        newTeams[i].m2 = debaters[pIdx++] || '';
      }
      setTeamNames(newTeams);
    }
  };

  const handleDraw = async () => {
    if (!room) return;

    let assignments: Record<string, SpeakerRole> = {};
    
    if (drawMode === 'individual') {
      const names = indNames.map(n => n.trim()).filter(Boolean);
      if (names.length < 8) {
        alert('Lütfen kura için 8 münazır ismi giriniz.');
        return;
      }
      
      const roles: SpeakerRole[] = ['PM', 'LO', 'DPM', 'DLO', 'MG', 'MO', 'GW', 'OW'];
      const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
      names.forEach((name, i) => {
        assignments[name] = shuffledRoles[i];
      });
    } else {
      for (let i = 0; i < 4; i++) {
        if (!teamNames[i].m1.trim() || !teamNames[i].m2.trim()) {
          alert('Lütfen tüm takımların her iki münazır ismini de doldurunuz.');
          return;
        }
      }
      
      const positions: ('OG' | 'OO' | 'CG' | 'CO')[] = ['OG', 'OO', 'CG', 'CO'];
      const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);
      
      teamNames.forEach((team, i) => {
        const pos = shuffledPositions[i];
        let r1: SpeakerRole, r2: SpeakerRole;
        if (pos === 'OG') { r1 = 'PM'; r2 = 'DPM'; }
        else if (pos === 'OO') { r1 = 'LO'; r2 = 'DLO'; }
        else if (pos === 'CG') { r1 = 'MG'; r2 = 'GW'; }
        else { r1 = 'MO'; r2 = 'OW'; }
        
        assignments[team.m1.trim()] = r1;
        assignments[team.m2.trim()] = r2;
      });
    }

    const res = await Database.updateRoom(roomId, (r) => {
      Object.keys(r.participants).forEach(id => {
        r.participants[id].assignedSpeakerRole = null;
        if (id.startsWith('virtual_')) {
          delete r.participants[id];
        }
      });
      
      Object.entries(assignments).forEach(([name, role]) => {
        const onlineP = Object.values(r.participants).find(p => p.username === name);
        if (onlineP) {
          onlineP.assignedSpeakerRole = role;
        } else {
          const virtualId = `virtual_${role.toLowerCase()}`;
          r.participants[virtualId] = {
            id: virtualId,
            username: name,
            role: 'debater',
            status: 'open',
            assignedSpeakerRole: role,
            isMuted: true,
            joinedAt: Date.now()
          };
        }
      });
    });

    if (res.success && res.room) {
      setRoom(res.room);
      setShowDrawModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleSwapRoles = async (role1: SpeakerRole, role2: SpeakerRole) => {
    if (!room) return;
    const res = await Database.updateRoom(roomId, (r) => {
      const p1 = Object.values(r.participants).find(p => p.assignedSpeakerRole === role1);
      const p2 = Object.values(r.participants).find(p => p.assignedSpeakerRole === role2);
      
      if (p1) p1.assignedSpeakerRole = role2;
      if (p2) p2.assignedSpeakerRole = role1;
    });
    if (res.success && res.room) setRoom(res.room);
  };

  // Seating
  const handleSit = async (role: SpeakerRole) => {
    const res = await Database.updateRoom(roomId, (r) => {
      Object.keys(r.participants).forEach(id => {
        if (r.participants[id].id === user.id) {
          r.participants[id].assignedSpeakerRole = null;
        }
      });
      if (r.participants[user.id]) {
        r.participants[user.id].assignedSpeakerRole = role;
      } else {
        r.participants[user.id] = {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          assignedSpeakerRole: role,
          isMuted: true,
          joinedAt: Date.now()
        };
      }
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleStandUp = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      if (r.participants[user.id]) {
        r.participants[user.id].assignedSpeakerRole = null;
      }
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleToggleLocalMic = async () => {
    const newState = !isLocalMicEnabled;
    
    // Eğer mikrofon açılıyorsa, doğrudan tıklama anında tarayıcıdan izin iste.
    // Bu sayede useEffect içindeki LiveKit çağrısı tarayıcı engeline takılmaz.
    if (newState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // İzni aldık, akışı kapat ki LiveKit kendi içinden tekrar sorunsuz alabilsin.
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Kullanıcı mikrofon izni vermedi veya cihaz bulunamadı:", err);
        return; // İzin verilmezse işlemi iptal et
      }
    }

    setIsLocalMicEnabled(newState);
    
    // Yalnızca bir sandalyede oturuyorsa (debater) Supabase üzerindeki görünür isMuted durumunu güncelle
    if (userSpeakerRole) {
      const res = await Database.updateRoom(roomId, (r) => {
        if (r.participants[user.id]) {
          r.participants[user.id].isMuted = !newState;
        }
      });
      if (res.success && res.room) setRoom(res.room);
    }
  };

  // States
  const handleStartPrep = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      r.status = 'preparation';
      r.prepStartedAt = Date.now();
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleSkipPrep = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      r.status = 'debate';
      r.prepStartedAt = null;
      r.activeSpeaker = 'PM'; // automatically start PM
      r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
      r.activePoi = null;
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleRevealMotion = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      r.isMotionReleased = true;
    });
    if (res.success && res.room) setRoom(res.room);
  };

  // Automated next speaker sequencing PM -> LO -> DPM -> DLO -> MG -> MO -> GW -> OW
  const handleNextSpeaker = async () => {
    if (!room.activeSpeaker) return;
    const currentIndex = SPEAKER_ORDER.indexOf(room.activeSpeaker);
    if (currentIndex === -1) return;

    const res = await Database.updateRoom(roomId, (r) => {
      if (currentIndex === SPEAKER_ORDER.length - 1) {
        r.status = 'scoring';
        r.activeSpeaker = null;
        r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
        r.activePoi = null;
      } else {
        r.activeSpeaker = SPEAKER_ORDER[currentIndex + 1];
        r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
        r.activePoi = null;
      }
    });
    if (res.success && res.room) setRoom(res.room);
  };

  // Chronometer
  const handleStartTimer = async () => {
    if (room) {
      setRoom({
        ...room,
        timer: {
          ...room.timer,
          status: 'running',
          startedAt: Date.now() - (room.timer.elapsedSeconds * 1000)
        }
      });
    }

    try {
      await Database.updateRoom(roomId, (r) => {
        r.timer.status = 'running';
        r.timer.startedAt = Date.now() - (r.timer.elapsedSeconds * 1000);
      });
    } catch (err) {
      console.error("Error starting timer on database:", err);
    }
  };

  const handlePauseTimer = async () => {
    if (room) {
      setRoom({
        ...room,
        timer: {
          ...room.timer,
          status: 'paused',
          elapsedSeconds: localElapsed,
          startedAt: null
        }
      });
    }

    try {
      await Database.updateRoom(roomId, (r) => {
        r.timer.status = 'paused';
        r.timer.elapsedSeconds = localElapsed;
        r.timer.startedAt = null;
      });
    } catch (err) {
      console.error("Error pausing timer on database:", err);
    }
  };

  const handleResetTimer = async () => {
    if (room) {
      setRoom({
        ...room,
        timer: {
          status: 'idle',
          elapsedSeconds: 0,
          startedAt: null,
          pausedAt: null
        },
        activePoi: null
      });
    }

    try {
      await Database.updateRoom(roomId, (r) => {
        r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
        r.activePoi = null;
      });
    } catch (err) {
      console.error("Error resetting timer on database:", err);
    }
  };

  // POI
  const handleRequestPoi = async () => {
    if (!userSpeakerRole) return;
    const res = await Database.updateRoom(roomId, (r) => {
      r.activePoi = {
        id: Math.random().toString(),
        requesterId: user.id,
        requesterName: user.username,
        requesterTeam: SPEAKER_DETAILS[userSpeakerRole].label,
        requestedAt: Date.now(),
        acceptedAt: null,
        status: 'pending'
      };
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleAcceptPoi = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      if (r.activePoi) {
        r.activePoi.status = 'accepted';
        r.activePoi.acceptedAt = Date.now();
      }
    });
    if (res.success && res.room) setRoom(res.room);
  };

  const handleDeclinePoi = async () => {
    const res = await Database.updateRoom(roomId, (r) => {
      r.activePoi = null;
    });
    if (res.success && res.room) setRoom(res.room);
  };

  // Votes
  const handleVote = async (team: 'HA' | 'MA' | 'HK' | 'MK') => {
    const res = await Database.updateRoom(roomId, (r) => {
      const existingVoteIndex = r.spectatorVotes.findIndex(v => v.userId === user.id);
      if (existingVoteIndex !== -1) {
        r.spectatorVotes[existingVoteIndex].team = team;
      } else {
        r.spectatorVotes.push({
          userId: user.id,
          username: user.username,
          team,
          timestamp: Date.now()
        });
      }
    });
    if (res.success && res.room) setRoom(res.room);
  };




  // Anket progress values calculator
  const totalVotes = room.spectatorVotes.length;
  const getVotePercentage = (team: 'HA' | 'MA' | 'HK' | 'MK') => {
    if (totalVotes === 0) return 0;
    const teamVotes = room.spectatorVotes.filter(v => v.team === team).length;
    return Math.round((teamVotes / totalVotes) * 100);
  };

  const userSpectatorVote = room.spectatorVotes.find(v => v.userId === user.id)?.team;

  // Active speaker details
  const activeSpeakerUsername = room.activeSpeaker
    ? Object.values(room.participants).find(p => p.assignedSpeakerRole === room.activeSpeaker)?.username || 'Katılımcı Bekleniyor'
    : null;

  const isActiveSpeakerUnmuted = room.activeSpeaker
    ? !Object.values(room.participants).find(p => p.assignedSpeakerRole === room.activeSpeaker)?.isMuted
    : false;

  const renderSeat = (role: SpeakerRole) => {
    const seatOwner = Object.values(room.participants).find(p => p.assignedSpeakerRole === role);
    const side = SPEAKER_DETAILS[role].side;

    if (seatOwner) {
      const isMe = seatOwner.id === user.id;
      return (
        <div key={role} className={`slim-seat-box occupied ${side === 'Gov' ? 'gov-side' : 'opp-side'}`}>
          <div className="slim-seat-meta">
            <span className="slim-seat-role">{role}</span>
            <span className="slim-seat-name" title={seatOwner.username}>
              {seatOwner.username} {isMe && '(Siz)'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {room.matchMode !== 'physical' && (
              seatOwner.isMuted ? (
                <MicOff size={10} className="text-danger" style={{ opacity: 0.6 }} />
              ) : (
                <Mic size={10} className="text-success animate-pulse" />
              )
            )}
            {isMe && room.status === 'lobby' && (
              <button 
                className="btn btn-secondary" 
                onClick={handleStandUp} 
                style={{ padding: '2px 4px', fontSize: '0.6rem', border: 'none', background: 'rgba(239,68,68,0.2)', color: 'white' }}
                title="Kalk"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div key={role} className="slim-seat-box">
          <div className="slim-seat-meta">
            <span className="slim-seat-role" style={{ color: 'var(--text-muted)' }}>{role}</span>
            <span className="slim-seat-name" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Boş</span>
          </div>
          {user.role === 'debater' && room.status === 'lobby' && (
            <button 
              className="btn btn-secondary" 
              onClick={() => handleSit(role)} 
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
            >
              Otur
            </button>
          )}
        </div>
      );
    }
  };

  const renderPollPercentages = () => (
    <div className="vote-results-bar-container" style={{ width: '100%' }}>
      {(['HA', 'MA', 'HK', 'MK'] as const).map(t => {
        const pct = getVotePercentage(t);
        const nameMap = { HA: 'Hükümet Açılış', MA: 'Muhalefet Açılış', HK: 'Hükümet Kapanış', MK: 'Muhalefet Kapanış' };
        return (
          <div key={t} className="vote-progress-item">
            <div className="vote-progress-label">
              <span>{nameMap[t]} ({t})</span>
              <strong>%{pct}</strong>
            </div>
            <div className="vote-progress-track">
              <div 
                className={`vote-progress-fill vote-fill-${t.toLowerCase()}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="room-container animate-fade-in">
      <ActiveSpeakersOverlay />
      {liveKitToken && livekitUrl && (
        <div style={{ display: 'none' }}>
          <LiveKitRoom
            video={false}
            audio={false}
            token={liveKitToken}
            serverUrl={livekitUrl}
            connect={true}
            onDisconnected={() => {
              // Bağlantı kopunca mikrofon state'ini sıfırla
              setIsLocalMicEnabled(false);
              console.warn('LiveKit bağlantısı kesildi, mikrofon state sıfırlandı.');
            }}
          >
            <RoomAudioRenderer />
            <LocalAudioPublisher isMicEnabled={isLocalMicEnabled} />
          </LiveKitRoom>
        </div>
      )}

      {/* Ses sunucusu bağlantı hatası banner'ı */}
      {liveKitError && room.matchMode !== 'physical' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.30)',
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: 'var(--color-danger)',
          fontWeight: 500,
          flexShrink: 0
        }}>
          <MicOff size={14} style={{ flexShrink: 0 }} />
          <span>⚠️ Ses sistemi: {liveKitError}</span>
        </div>
      )}

      {/* 1. Compact Header Banner */}
      <div className="room-header-compact">
        <div className="room-title-section">
          <span className={`badge badge-${room.status === 'debate' ? 'rookie' : 'open'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            {room.status === 'lobby' && 'Lobi'}
            {room.status === 'preparation' && 'Prep'}
            {room.status === 'debate' && 'Live'}
            {room.status === 'scoring' && 'Karar'}
            {room.status === 'finished' && 'Bitti'}
          </span>
          <h1 className="room-title-text">{room.roomName}</h1>
          <p className="room-motion-compact" style={{ cursor: room.isMotionReleased ? 'pointer' : 'default' }} onClick={() => room.isMotionReleased && setShowMotionDetailModal(true)}>
            Konu:{' '}
            {room.isMotionReleased ? (
              <strong style={{ color: 'var(--text-primary)', textDecoration: 'underline' }} title="Konuyu ve Bilgi Slaytını Göster">{room.motion ? room.motion.text : 'Belirlenmedi'}</strong>
            ) : (
              <span style={{ color: 'var(--color-warning)', fontStyle: 'italic', fontWeight: 600 }}>Açıklanacak...</span>
            )}
          </p>
          {!room.isMotionReleased && isJuryOrAdmin && (
            <button 
              className="btn btn-primary"
              onClick={handleRevealMotion}
              style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: '8px' }}
            >
              Açıkla
            </button>
          )}
        </div>
        
        {/* Compact Info Slide */}
        {room.isMotionReleased && room.motion?.infoSlide && (
          <div 
            onClick={() => setShowMotionDetailModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)', maxWidth: '400px', cursor: 'pointer' }} 
            title="Detaylı bilgi slaytı için tıklayın"
          >
            <HelpCircle size={12} className="text-primary" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
              Bilgi Slaytı: {room.motion.infoSlide}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {liveKitToken && room.matchMode !== 'physical' && isJuryOrAdmin && (
            <button 
              className={`btn ${isLocalMicEnabled ? 'btn-danger' : 'btn-success'}`}
              onClick={handleToggleLocalMic}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              title="Yönetici/Jüri Sesinizi Açar"
            >
              {isLocalMicEnabled ? <MicOff size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <Mic size={14} style={{ display: 'inline', marginRight: '4px' }} />}
              {isLocalMicEnabled ? 'Sesimi Kapat' : 'Sesimi Aç'}
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}
            onClick={onLeave}
          >
            Odadan Ayrıl
          </button>
        </div>
      </div>

      {/* POI Active Notification Banner */}
      {room.matchMode !== 'physical' && room.status === 'debate' && room.activePoi && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          margin: '0 auto',
          width: '100%',
          maxWidth: '600px',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} className="animate-pulse" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {room.activePoi.status === 'pending' ? (
                <>POI Talebi: <strong>@{room.activePoi.requesterName} ({room.activePoi.requesterTeam})</strong> soru istiyor!</>
              ) : (
                <>POI Kabul Edildi: <strong>@{room.activePoi.requesterName} ({room.activePoi.requesterTeam})</strong> konuşuyor (15s)</>
              )}
            </span>
          </div>
          {room.activePoi.status === 'pending' && (room.activeSpeaker === userSpeakerRole || isJuryOrAdmin) && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-primary" onClick={handleAcceptPoi} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Kabul</button>
              <button className="btn btn-secondary" onClick={handleDeclinePoi} style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>Reddet</button>
            </div>
          )}
        </div>
      )}

      {/* 2. Hero Center Section (Timer/Status) */}
      {room.status === 'lobby' && (
        <div className="hero-center-section">
          <div className="hero-timer-display hero-timer-glow-idle">
            15:00
          </div>
          <div className="hero-speaker-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            Hazırlık Süresi
          </div>
          <h2 className="hero-speaker-username" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Münazara Odası Lobisi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 12px 0', maxWidth: '400px', textAlign: 'center' }}>
            Münazırlar masalara oturarak yerlerini alır. Hazırlık sürecine geçmeden önce jüri beklenir.
          </p>
          <div className="hero-controls-row">
            {isJuryOrAdmin ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={handleStartPrep} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Hazırlığı Başlat (15 Dk Prep)
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDrawModal(true)} style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎲 Kura Çekim Paneli
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                Jürinin ortak hazırlık süresini başlatması bekleniyor...
              </span>
            )}
          </div>
        </div>
      )}

      {room.status === 'preparation' && (
        <div className="hero-center-section">
          <div className="hero-timer-display hero-timer-glow-protected">
            {formatTime(localPrepRemaining)}
          </div>
          <div className="hero-speaker-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' }}>
            Ortak Hazırlık Süresi
          </div>
          <h2 className="hero-speaker-username" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Münazır Hazırlığı</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 12px 0', maxWidth: '400px', textAlign: 'center' }}>
            Münazırların 15 dakikalık hazırlık süresi devam etmektedir. Konuşmalara geçmek için jüri başkanı bekleniyor.
          </p>
          <div className="hero-controls-row">
            {isJuryOrAdmin && (
              <button className="btn btn-primary" onClick={handleSkipPrep} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Hazırlığı Bitir (Münazarayı Başlat)
              </button>
            )}
          </div>
        </div>
      )}

      {room.status === 'debate' && (
        <div className="hero-center-section">
          {room.activeSpeaker ? (
            <>
              {/* Massive Chronometer with Glow based on phase */}
              <div className={`hero-timer-display ${
                room.timer.status === 'running'
                  ? localElapsed < 60 || (localElapsed >= 360 && localElapsed <= 440)
                    ? 'hero-timer-glow-protected'
                    : localElapsed > 440
                      ? 'hero-timer-glow-overtime'
                      : 'hero-timer-glow-active'
                  : 'hero-timer-glow-idle'
              }`}>
                {formatTime(localElapsed)}
              </div>
              
              <div className="hero-speaker-badge" style={{ 
                background: SPEAKER_DETAILS[room.activeSpeaker].side === 'Gov' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                color: SPEAKER_DETAILS[room.activeSpeaker].side === 'Gov' ? 'var(--color-primary)' : 'var(--color-secondary)'
              }}>
                {SPEAKER_DETAILS[room.activeSpeaker].team}
              </div>

              <h2 className="hero-speaker-username">
                {activeSpeakerUsername}
              </h2>
              
              <span className="hero-speaker-role">
                {SPEAKER_DETAILS[room.activeSpeaker].name}
              </span>

              {/* Progress Line */}
              <div className="hero-progress-line-outer">
                <div 
                  className="hero-progress-line-inner" 
                  style={{ 
                    width: timerConfig.width, 
                    backgroundColor: timerConfig.color 
                  }} 
                />
              </div>
              
              <span style={{ fontSize: '0.7rem', color: timerConfig.color, marginTop: '4px', fontWeight: 600 }}>
                {timerConfig.label}
              </span>

              {/* Speaker Audio Waves */}
              {room.matchMode !== 'physical' && room.timer.status === 'running' && isActiveSpeakerUnmuted && (
                <div className="hero-audio-waves">
                  <div className="hero-wave-bar" />
                  <div className="hero-wave-bar" />
                  <div className="hero-wave-bar" />
                  <div className="hero-wave-bar" />
                  <div className="hero-wave-bar" />
                </div>
              )}

              {/* Speaker & Jury Controls */}
              <div className="hero-controls-row">
                {/* Microphone button for Debaters (always visible, disabled if not their turn) */}
                {liveKitToken && room.matchMode !== 'physical' && !isJuryOrAdmin && (
                  <button 
                    className={`btn ${isLocalMicEnabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={handleToggleLocalMic}
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.75rem',
                      opacity: (room.activeSpeaker === userSpeakerRole || (room.activePoi?.status === 'accepted' && room.activePoi?.requesterId === user.id)) ? 1 : 0.5,
                      cursor: (room.activeSpeaker === userSpeakerRole || (room.activePoi?.status === 'accepted' && room.activePoi?.requesterId === user.id)) ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!(room.activeSpeaker === userSpeakerRole || (room.activePoi?.status === 'accepted' && room.activePoi?.requesterId === user.id))}
                    title={(room.activeSpeaker === userSpeakerRole || (room.activePoi?.status === 'accepted' && room.activePoi?.requesterId === user.id)) ? (isLocalMicEnabled ? 'Sesi Kapat' : 'Sesi Aç') : 'Sıranız geldiğinde sesinizi açabilirsiniz'}
                  >
                    {isLocalMicEnabled ? <MicOff size={12} /> : <Mic size={12} />}
                    {isLocalMicEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
                  </button>
                )}

                {/* POI Requester */}
                {room.matchMode !== 'physical' && room.timer.status === 'running' && 
                 localElapsed >= 60 && localElapsed <= 360 && 
                 userSpeakerRole && 
                 SPEAKER_DETAILS[userSpeakerRole].side !== SPEAKER_DETAILS[room.activeSpeaker].side && 
                 !room.activePoi && (
                  <button className="btn btn-primary" onClick={handleRequestPoi} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <HelpCircle size={12} />
                    POI (Soru İste)
                  </button>
                )}

                {/* Jury Controls */}
                {isJuryOrAdmin && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {room.timer.status !== 'running' ? (
                      <button className="btn btn-success" onClick={handleStartTimer} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        <Play size={12} /> Başlat
                      </button>
                    ) : (
                      <button className="btn btn-warning" onClick={handlePauseTimer} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        <Pause size={12} /> Duraklat
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleResetTimer} style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>
                      <RotateCcw size={12} /> Sıfırla
                    </button>
                    <button className="btn btn-primary" onClick={handleNextSpeaker} style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Sıradaki Konuşmacı <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <UserIcon size={32} className="text-secondary" style={{ marginBottom: '8px' }} />
              <h3>Kürsü Boş</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                Jürinin konuşmayı başlatması bekleniyor...
              </span>
            </div>
          )}
        </div>
      )}

      {room.status === 'scoring' && (
        isJuryOrAdmin ? (
          <JuryPanel
            roomId={roomId}
            matchMode={room.matchMode}
            onClose={onLeave}
            onSuccess={(updatedRoom) => setRoom(updatedRoom)}
          />
        ) : (
          <div className="hero-center-section">
            <Award size={48} className="text-primary animate-pulse" style={{ marginBottom: '12px' }} />
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 6px 0' }}>Münazara Değerlendirme Aşaması</h2>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 10px auto' }}></div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Jüri sonuçları değerlendiriyor...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                Sonuçlar jüri başkanı tarafından onaylandığında salona yayınlanacaktır.
              </p>
            </div>
          </div>
        )
      )}

      {room.status === 'finished' && room.result && (
        <div className="hero-center-section" style={{ justifyContent: 'flex-start', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', width: '100%', justifyContent: 'center' }}>
            <Award size={24} style={{ color: '#fbbf24' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Resmi Maç Sonuçları</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '600px' }}>
            {Object.entries(room.result.rankings)
              .sort((a, b) => a[1] - b[1])
              .map(([teamName, rank]) => (
                <div key={teamName} className={`trophy-card glass-panel rank-${rank}`} style={{ flex: '1', minWidth: '110px', padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: rank === 1 ? '#fbbf24' : rank === 2 ? '#9ca3af' : rank === 3 ? '#b45309' : 'var(--text-muted)' }}>
                    {rank}.
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', display: 'block' }}>
                    {teamName === 'Opening Government' && 'HA (Hükümet Açılış)'}
                    {teamName === 'Opening Opposition' && 'MA (Muhalefet Açılış)'}
                    {teamName === 'Closing Government' && 'HK (Hükümet Kapanış)'}
                    {teamName === 'Closing Opposition' && 'MK (Muhalefet Kapanış)'}
                  </span>
                </div>
              ))}
          </div>

          <div style={{ 
            display: room.matchMode === 'physical' ? 'block' : 'grid', 
            gridTemplateColumns: room.matchMode === 'physical' ? 'none' : '1fr 1fr', 
            gap: '16px', 
            width: '100%', 
            maxWidth: room.matchMode === 'physical' ? '400px' : '600px', 
            marginTop: '12px' 
          }}>
            <div>
              <h3 style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '0 0 6px 0' }}>Konuşmacı Puanları</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <tbody>
                  {SPEAKER_ORDER.map(role => (
                    <tr key={role} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '2px 0', color: 'var(--text-secondary)' }}>{SPEAKER_DETAILS[role].name}</td>
                      <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold' }}>{room.result?.speakerPoints[role]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {room.matchMode !== 'physical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {room.result.juryNotes && (
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid var(--border-color)', flexGrow: 1 }}>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Jüri Karar Gerekçesi (RFD):</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '110px', overflowY: 'auto' }}>{room.result.juryNotes}</p>
                  </div>
                )}
                
                {room.areSpectatorVotesReleased ? (
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Seyirci Anketi:</span>
                    {renderPollPercentages()}
                  </div>
                ) : (
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Seyirci anketi sonuçları jüri kararıyla gizlenmiştir.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Bottom Grid of Horizontal Team Benches */}
      {room.status !== 'finished' && (
        <div className="bottom-benches-grid">
          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-primary)' }}>Hükümet Açılış</span>
              <span className="slim-bench-team-code">HA</span>
            </div>
            <div className="slim-bench-seats" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderSeat('PM')}
              {room.status === 'lobby' && isJuryOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSwapRoles('PM', 'DPM')}
                  className="swap-btn"
                  title="Rolleri Değiştir"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    backdropFilter: 'blur(4px)',
                    transition: 'opacity 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                >
                  <ArrowLeftRight size={12} />
                </button>
              )}
              {renderSeat('DPM')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-secondary)' }}>Muhalefet Açılış</span>
              <span className="slim-bench-team-code">MA</span>
            </div>
            <div className="slim-bench-seats" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderSeat('LO')}
              {room.status === 'lobby' && isJuryOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSwapRoles('LO', 'DLO')}
                  className="swap-btn"
                  title="Rolleri Değiştir"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    backdropFilter: 'blur(4px)',
                    transition: 'opacity 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                >
                  <ArrowLeftRight size={12} />
                </button>
              )}
              {renderSeat('DLO')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-primary)' }}>Hükümet Kapanış</span>
              <span className="slim-bench-team-code">HK</span>
            </div>
            <div className="slim-bench-seats" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderSeat('MG')}
              {room.status === 'lobby' && isJuryOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSwapRoles('MG', 'GW')}
                  className="swap-btn"
                  title="Rolleri Değiştir"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    backdropFilter: 'blur(4px)',
                    transition: 'opacity 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                >
                  <ArrowLeftRight size={12} />
                </button>
              )}
              {renderSeat('GW')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-secondary)' }}>Muhalefet Kapanış</span>
              <span className="slim-bench-team-code">MK</span>
            </div>
            <div className="slim-bench-seats" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderSeat('MO')}
              {room.status === 'lobby' && isJuryOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSwapRoles('MO', 'OW')}
                  className="swap-btn"
                  title="Rolleri Değiştir"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    backdropFilter: 'blur(4px)',
                    transition: 'opacity 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                >
                  <ArrowLeftRight size={12} />
                </button>
              )}
              {renderSeat('OW')}
            </div>
          </div>
        </div>
      )}

      {/* 4. Floating Glassmorphic Panels / Toggles */}
      
      {/* Salondakiler Toggle & Panel */}
      {room.matchMode !== 'physical' && (
        <>
          <div className="floating-widget-toggle widget-top-right">
            <button 
              className={`floating-widget-btn ${showParticipantsWidget ? 'active' : ''}`}
              onClick={() => setShowParticipantsWidget(!showParticipantsWidget)}
              title="Salondakiler"
            >
              <UserIcon size={18} />
            </button>
          </div>
          {showParticipantsWidget && (
            <div className="floating-overlay-card card-top-right">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Salondakiler ({Object.keys(room.participants).length + 1})</span>
                <button className="btn" style={{ padding: 0, background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowParticipantsWidget(false)}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{user.username} (Siz)</span>
                  <span className={`badge badge-${user.role}`} style={{ fontSize: '0.5rem', padding: '1px 4px' }}>
                    {user.role === 'admin' ? 'Yönetici' : user.role === 'jury' ? 'Jüri' : user.role === 'debater' ? 'Münazır' : 'Seyirci'}
                  </span>
                </div>
                {Object.values(room.participants)
                  .filter(p => p.id !== user.id)
                  .map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.75rem' }}>{p.username}</span>
                      <span className={`badge badge-${p.role}`} style={{ fontSize: '0.5rem', padding: '1px 4px' }}>
                        {p.role === 'admin' ? 'Yönetici' : p.role === 'jury' ? 'Jüri' : p.role === 'debater' ? 'Münazır' : 'Seyirci'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Seyirci Anketi Toggle & Panel */}
      {room.matchMode !== 'physical' && room.status !== 'finished' && (
        <>
          <div className="floating-widget-toggle widget-bottom-right">
            <button 
              className={`floating-widget-btn ${showPollWidget ? 'active' : ''}`}
              onClick={() => setShowPollWidget(!showPollWidget)}
              title="Seyirci Anketi"
            >
              <TrendingUp size={18} />
            </button>
          </div>
          {showPollWidget && (
            <div className="floating-overlay-card card-bottom-right">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Seyirci Anketi</span>
                <button className="btn" style={{ padding: 0, background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowPollWidget(false)}>
                  <X size={14} />
                </button>
              </div>
              
              {user.role === 'spectator' ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: '0 0 6px 0' }}>
                    Sizce maçı hangi takım kazanacak?
                  </p>
                  <div className="vote-options-grid">
                    {(['HA', 'MA', 'HK', 'MK'] as const).map(t => (
                      <button 
                        key={t}
                        className={`vote-option-btn ${userSpectatorVote === t ? 'selected' : ''}`}
                        onClick={() => handleVote(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: '0 0 6px 0' }}>
                  Jüriler ve münazırlar ankette oy kullanamazlar.
                </p>
              )}

              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  OY ORANLARI ({totalVotes} Oy)
                </span>
                
                {room.status === 'scoring' && isJuryOrAdmin ? (
                  renderPollPercentages()
                ) : room.status === 'scoring' && !isJuryOrAdmin ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                    Sonuçlar jüri kararıyla açıklanacaktır.
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Maç tamamlanana kadar oylar gizlidir.
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Jüri Taslak Not Defteri Toggle & Panel */}
      {room.matchMode !== 'physical' && isJuryOrAdmin && room.status === 'debate' && (
        <>
          <div className="floating-widget-toggle widget-bottom-left">
            <button 
              className={`floating-widget-btn ${showJuryNotepadWidget ? 'active' : ''}`}
              onClick={() => setShowJuryNotepadWidget(!showJuryNotepadWidget)}
              title="Jüri Not Defteri"
            >
              <FileText size={18} />
            </button>
          </div>
          {showJuryNotepadWidget && (
            <div className="floating-overlay-card card-bottom-left">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>Jüri Taslak Not Defteri</span>
                <button className="btn" style={{ padding: 0, background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowJuryNotepadWidget(false)}>
                  <X size={14} />
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'block', marginBottom: '4px' }}>HÜKÜMET</span>
                  {['PM', 'DPM', 'MG', 'GW'].map(role => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                      <label htmlFor={`draft-pts-${role}`} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{role}:</label>
                      <input 
                        id={`draft-pts-${role}`}
                        type="number" 
                        className="input-field"
                        style={{ padding: '2px 4px', fontSize: '0.7rem', width: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}
                        min="50"
                        max="100"
                        value={draftScores[role as SpeakerRole]}
                        onChange={(e) => handleDraftScoreChange(role as SpeakerRole, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--color-secondary)', display: 'block', marginBottom: '4px' }}>MUHALEFET</span>
                  {['LO', 'DLO', 'MO', 'OW'].map(role => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                      <label htmlFor={`draft-pts-${role}`} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{role}:</label>
                      <input 
                        id={`draft-pts-${role}`}
                        type="number" 
                        className="input-field"
                        style={{ padding: '2px 4px', fontSize: '0.7rem', width: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }}
                        min="50"
                        max="100"
                        value={draftScores[role as SpeakerRole]}
                        onChange={(e) => handleDraftScoreChange(role as SpeakerRole, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" htmlFor="draft-notes" style={{ fontSize: '0.65rem' }}>RFD Karar Gerekçesi Taslağı</label>
                <textarea 
                  id="draft-notes"
                  className="input-field" 
                  style={{ minHeight: '60px', fontSize: '0.75rem', padding: '4px 6px', resize: 'vertical' }}
                  placeholder="Notlarınızı yazın (Otomatik kaydolur)..."
                  value={draftNotes}
                  onChange={(e) => handleDraftNotesChange(e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}
      {/* Modal: Yüz Yüze Maç Kura */}
      {showDrawModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>Münazır Kurası (Yüz Yüze)</h2>
              <button className="password-toggle-btn" style={{ position: 'static' }} onClick={() => setShowDrawModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Toggle Kura Modu */}
            <div className="auth-tabs" style={{ marginBottom: '20px' }}>
              <button 
                type="button"
                className={`auth-tab ${drawMode === 'individual' ? 'active' : ''}`}
                onClick={() => setDrawMode('individual')}
                style={{ flex: 1 }}
              >
                Bireysel Kura
              </button>
              <button 
                type="button"
                className={`auth-tab ${drawMode === 'team' ? 'active' : ''}`}
                onClick={() => setDrawMode('team')}
                style={{ flex: 1 }}
              >
                Takım Bazlı Kura
              </button>
            </div>

            {/* Auto Fill Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {drawMode === 'individual' ? '8 Münazır giriniz:' : '4 Takım (toplam 8 Münazır) giriniz:'}
              </span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={handleAutoFillParticipants}
              >
                Odaki Münazırları Doldur
              </button>
            </div>

            {/* Form Fields */}
            {drawMode === 'individual' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {indNames.map((name, i) => (
                  <div key={i} className="input-group" style={{ margin: 0 }}>
                    <label className="input-label" htmlFor={`ind-name-${i}`} style={{ fontSize: '0.65rem' }}>{i + 1}. MÜNAZIR</label>
                    <input 
                      id={`ind-name-${i}`}
                      type="text" 
                      className="input-field" 
                      placeholder={`İsim ${i + 1}`}
                      value={name}
                      onChange={(e) => {
                        const copy = [...indNames];
                        copy[i] = e.target.value;
                        setIndNames(copy);
                      }}
                      style={{ padding: '8px' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teamNames.map((team, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>
                      Takım {i + 1}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label" htmlFor={`team-m1-${i}`} style={{ fontSize: '0.6rem' }}>1. MÜNAZIR</label>
                        <input 
                          id={`team-m1-${i}`}
                          type="text" 
                          className="input-field" 
                          placeholder="Münazır A"
                          value={team.m1}
                          onChange={(e) => {
                            const copy = [...teamNames];
                            copy[i].m1 = e.target.value;
                            setTeamNames(copy);
                          }}
                          style={{ padding: '8px' }}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label" htmlFor={`team-m2-${i}`} style={{ fontSize: '0.6rem' }}>2. MÜNAZIR</label>
                        <input 
                          id={`team-m2-${i}`}
                          type="text" 
                          className="input-field" 
                          placeholder="Münazır B"
                          value={team.m2}
                          onChange={(e) => {
                            const copy = [...teamNames];
                            copy[i].m2 = e.target.value;
                            setTeamNames(copy);
                          }}
                          style={{ padding: '8px' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDrawModal(false)}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDraw} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎲 Kura Çek ve Dağıt
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Modal: Konu ve Bilgi Slaytı Detayı */}
      {showMotionDetailModal && room?.motion && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px', width: '90%', textAlign: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
              <button 
                type="button"
                className="password-toggle-btn" 
                style={{ position: 'static' }} 
                onClick={() => setShowMotionDetailModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-warning)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Münazara Konusu Açıklandı!
            </h2>
            
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: '1.5', color: 'var(--text-primary)' }}>
                {room.motion.text}
              </p>
            </div>

            {room.motion.infoSlide && (
              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.15)', textAlign: 'left', marginBottom: '20px' }}>
                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '6px', color: 'var(--color-primary)' }}>
                  Bilgi Slaytı (Info Slide)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {room.motion.infoSlide}
                </p>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => setShowMotionDetailModal(false)}
              style={{ padding: '10px 24px', fontSize: '0.9rem', fontWeight: 600, width: '100%' }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

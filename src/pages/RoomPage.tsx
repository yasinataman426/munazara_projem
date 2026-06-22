import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import type { RoomState, SpeakerRole, DebateResult } from '../types';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Award, 
  AlertTriangle,
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  FileText,
  ChevronRight
} from 'lucide-react';
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

export const RoomPage: React.FC<RoomPageProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [localElapsed, setLocalElapsed] = useState(0);
  const [localPrepRemaining, setLocalPrepRemaining] = useState(900); // 15 mins prep
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showPollWidget, setShowPollWidget] = useState(false);
  const [showParticipantsWidget, setShowParticipantsWidget] = useState(false);
  const [showJuryNotepadWidget, setShowJuryNotepadWidget] = useState(false);

  // Jury scoring form local states
  const [rankings, setRankings] = useState<Record<string, number>>({
    'Opening Government': 1,
    'Opening Opposition': 2,
    'Closing Government': 3,
    'Closing Opposition': 4,
  });
  const [speakerPoints, setSpeakerPoints] = useState<Record<SpeakerRole, string>>({
    PM: '75', LO: '75', DPM: '75', DLO: '75', MG: '75', MO: '75', GW: '75', OW: '75'
  });
  const [juryNotes, setJuryNotes] = useState('');
  const [releaseVotes, setReleaseVotes] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  // Jury private notepad (saved locally)
  const [draftScores, setDraftScores] = useState<Record<SpeakerRole, string>>(() => {
    try {
      const saved = localStorage.getItem(`parla_draft_scores_${roomId}`);
      return saved ? JSON.parse(saved) : {
        PM: '75', LO: '75', DPM: '75', DLO: '75', MG: '75', MO: '75', GW: '75', OW: '75'
      };
    } catch {
      return { PM: '75', LO: '75', DPM: '75', DLO: '75', MG: '75', MO: '75', GW: '75', OW: '75' };
    }
  });
  const [draftNotes, setDraftNotes] = useState(() => {
    return localStorage.getItem(`parla_draft_notes_${roomId}`) || '';
  });

  const timerIntervalRef = useRef<any>(null);
  const prepIntervalRef = useRef<any>(null);

  // Load and poll room data
  useEffect(() => {
    const fetchRoom = () => {
      const activeRooms = Database.getRooms();
      const currentRoom = activeRooms.find(r => r.roomId === roomId);
      if (currentRoom) {
        setRoom(currentRoom);
      } else {
        onLeave();
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => {
      clearInterval(interval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [roomId, onLeave]);

  // Synchronize timers locally
  useEffect(() => {
    if (!room) return;

    if (room.status === 'debate' && room.timer.status === 'running' && room.timer.startedAt) {
      const updateSpeechTimer = () => {
        const elapsed = Math.floor((Date.now() - (room.timer.startedAt || 0)) / 1000);
        setLocalElapsed(elapsed);

        // Auto expire active POI request if expired
        if (room.activePoi && room.activePoi.status === 'pending') {
          const poiAge = Date.now() - room.activePoi.requestedAt;
          if (poiAge > 15000) {
            Database.updateRoom(roomId, (r) => {
              r.activePoi = null;
            });
          }
        }
        
        // Auto expire accepted POI floor after 15 seconds
        if (room.activePoi && room.activePoi.status === 'accepted' && room.activePoi.acceptedAt) {
          const acceptedAge = Date.now() - room.activePoi.acceptedAt;
          if (acceptedAge > 15000) {
            Database.updateRoom(roomId, (r) => {
              r.activePoi = null;
            });
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
  }, [room, roomId]);

  if (!user || !room) return null;

  // Determine user seat/role
  const userSeat = Object.entries(room.participants).find(([_, p]) => p.id === user.id && p.assignedSpeakerRole);
  const userSpeakerRole = userSeat ? (userSeat[1].assignedSpeakerRole as SpeakerRole) : null;
  const isJuryOrAdmin = user.role === 'jury' || user.role === 'admin';

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
    localStorage.setItem(`parla_draft_scores_${roomId}`, JSON.stringify(nextDraft));
  };

  const handleDraftNotesChange = (val: string) => {
    setDraftNotes(val);
    localStorage.setItem(`parla_draft_notes_${roomId}`, val);
  };

  // Seating
  const handleSit = (role: SpeakerRole) => {
    Database.updateRoom(roomId, (r) => {
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
  };

  const handleStandUp = () => {
    Database.updateRoom(roomId, (r) => {
      if (r.participants[user.id]) {
        r.participants[user.id].assignedSpeakerRole = null;
      }
    });
  };

  const handleToggleMute = () => {
    Database.updateRoom(roomId, (r) => {
      if (r.participants[user.id]) {
        r.participants[user.id].isMuted = !r.participants[user.id].isMuted;
      }
    });
  };

  // States
  const handleStartPrep = () => {
    Database.updateRoom(roomId, (r) => {
      r.status = 'preparation';
      r.prepStartedAt = Date.now();
    });
  };

  const handleSkipPrep = () => {
    Database.updateRoom(roomId, (r) => {
      r.status = 'debate';
      r.prepStartedAt = null;
      r.activeSpeaker = 'PM'; // automatically start PM
      r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
      r.activePoi = null;
    });
  };

  const handleRevealMotion = () => {
    Database.updateRoom(roomId, (r) => {
      r.isMotionReleased = true;
    });
  };

  // Automated next speaker sequencing PM -> LO -> DPM -> DLO -> MG -> MO -> GW -> OW
  const handleNextSpeaker = () => {
    if (!room.activeSpeaker) return;
    const currentIndex = SPEAKER_ORDER.indexOf(room.activeSpeaker);
    if (currentIndex === -1) return;

    Database.updateRoom(roomId, (r) => {
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
  };

  // Chronometer
  const handleStartTimer = () => {
    Database.updateRoom(roomId, (r) => {
      r.timer.status = 'running';
      r.timer.startedAt = Date.now() - (r.timer.elapsedSeconds * 1000);
    });
  };

  const handlePauseTimer = () => {
    Database.updateRoom(roomId, (r) => {
      r.timer.status = 'paused';
      r.timer.elapsedSeconds = localElapsed;
      r.timer.startedAt = null;
    });
  };

  const handleResetTimer = () => {
    Database.updateRoom(roomId, (r) => {
      r.timer = { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null };
      r.activePoi = null;
    });
  };

  // POI
  const handleRequestPoi = () => {
    if (!userSpeakerRole) return;
    Database.updateRoom(roomId, (r) => {
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
  };

  const handleAcceptPoi = () => {
    Database.updateRoom(roomId, (r) => {
      if (r.activePoi) {
        r.activePoi.status = 'accepted';
        r.activePoi.acceptedAt = Date.now();
      }
    });
  };

  const handleDeclinePoi = () => {
    Database.updateRoom(roomId, (r) => {
      r.activePoi = null;
    });
  };

  // Votes
  const handleVote = (team: 'HA' | 'MA' | 'HK' | 'MK') => {
    Database.updateRoom(roomId, (r) => {
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
  };

  // Open scoring modal prefilled with notepad drafts
  const handleOpenScoringModal = () => {
    setRankings({
      'Opening Government': 1,
      'Opening Opposition': 2,
      'Closing Government': 3,
      'Closing Opposition': 4,
    });
    setSpeakerPoints(draftScores);
    setJuryNotes(draftNotes);
    setShowScoringModal(true);
  };

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const values = Object.values(rankings);
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== 4) {
      setScoringError('Lütfen her takıma benzersiz bir sıralama veriniz.');
      return;
    }

    const pointsMap: Record<SpeakerRole, number> = {} as any;
    for (const role of SPEAKER_ORDER) {
      const val = parseInt(speakerPoints[role], 10);
      if (isNaN(val) || val < 50 || val > 100) {
        setScoringError(`Lütfen ${SPEAKER_DETAILS[role].name} için 50 ile 100 arasında puan giriniz.`);
        return;
      }
      pointsMap[role] = val;
    }

    const results: DebateResult = {
      rankings: rankings as any,
      speakerPoints: pointsMap,
      juryNotes,
      submittedAt: new Date().toISOString()
    };

    Database.updateRoom(roomId, (r) => {
      r.result = results;
      r.areSpectatorVotesReleased = releaseVotes;
      r.status = 'finished';
    });

    setShowScoringModal(false);
    setScoringError(null);
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
            {seatOwner.isMuted ? (
              <MicOff size={10} className="text-danger" style={{ opacity: 0.6 }} />
            ) : (
              <Mic size={10} className="text-success animate-pulse" />
            )}
            {isMe && (
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
          {user.role === 'debater' && (
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
          <p className="room-motion-compact">
            Konu:{' '}
            {room.isMotionReleased || isJuryOrAdmin ? (
              <strong style={{ color: 'var(--text-primary)' }}>{room.motion ? room.motion.text : 'Belirlenmedi'}</strong>
            ) : (
              <span style={{ color: 'var(--color-warning)', fontStyle: 'italic', fontWeight: 600 }}>Konu açıklanacak...</span>
            )}
          </p>
          {!room.isMotionReleased && isJuryOrAdmin && (
            <button 
              className="btn btn-primary"
              onClick={handleRevealMotion}
              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            >
              Açıkla
            </button>
          )}
        </div>
        
        {/* Compact Info Slide */}
        {(room.isMotionReleased || isJuryOrAdmin) && room.motion?.infoSlide && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)', maxWidth: '400px' }} title={room.motion.infoSlide}>
            <HelpCircle size={12} className="text-primary" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
              Bilgi Slaytı: {room.motion.infoSlide}
            </span>
          </div>
        )}

        <button 
          className="btn btn-secondary" 
          style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}
          onClick={onLeave}
        >
          Odadan Ayrıl
        </button>
      </div>

      {/* POI Active Notification Banner */}
      {room.status === 'debate' && room.activePoi && (
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
              <button className="btn btn-primary" onClick={handleStartPrep} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Hazırlığı Başlat (15 Dk Prep)
              </button>
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
              {room.timer.status === 'running' && isActiveSpeakerUnmuted && (
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
                {/* Active speaker microphone button */}
                {room.activeSpeaker === userSpeakerRole && (
                  <button 
                    className={`btn ${!room.participants[user.id]?.isMuted ? 'btn-danger' : 'btn-success'}`}
                    onClick={handleToggleMute}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {!room.participants[user.id]?.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                    {!room.participants[user.id]?.isMuted ? 'Sesi Kapat' : 'Sesi Aç'}
                  </button>
                )}

                {/* POI Requester */}
                {room.timer.status === 'running' && 
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
        <div className="hero-center-section">
          <Award size={48} className="text-primary animate-pulse" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 6px 0' }}>Münazara Değerlendirme Aşaması</h2>
          
          {isJuryOrAdmin ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '14px', maxWidth: '400px' }}>
                Maç tamamlandı. Jüri başkanı olarak skorları ve gerekçeleri girmek için değerlendirme formunu açabilirsiniz.
              </p>
              <button className="btn btn-primary" onClick={handleOpenScoringModal} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <FileText size={16} /> Değerlendirme Formunu Aç
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 10px auto' }}></div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Jüri sonuçları değerlendiriyor...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                Sonuçlar jüri başkanı tarafından onaylandığında salona yayınlanacaktır.
              </p>
            </div>
          )}
        </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '600px', marginTop: '12px' }}>
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
            <div className="slim-bench-seats">
              {renderSeat('PM')}
              {renderSeat('DPM')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-secondary)' }}>Muhalefet Açılış</span>
              <span className="slim-bench-team-code">MA</span>
            </div>
            <div className="slim-bench-seats">
              {renderSeat('LO')}
              {renderSeat('DLO')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-primary)' }}>Hükümet Kapanış</span>
              <span className="slim-bench-team-code">HK</span>
            </div>
            <div className="slim-bench-seats">
              {renderSeat('MG')}
              {renderSeat('GW')}
            </div>
          </div>

          <div className="slim-bench-row">
            <div className="slim-bench-team-info">
              <span className="slim-bench-team-title" style={{ color: 'var(--color-secondary)' }}>Muhalefet Kapanış</span>
              <span className="slim-bench-team-code">MK</span>
            </div>
            <div className="slim-bench-seats">
              {renderSeat('MO')}
              {renderSeat('OW')}
            </div>
          </div>
        </div>
      )}

      {/* 4. Floating Glassmorphic Panels / Toggles */}
      
      {/* Salondakiler Toggle & Panel */}
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

      {/* Seyirci Anketi Toggle & Panel */}
      {room.status !== 'finished' && (
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
      {isJuryOrAdmin && room.status === 'debate' && (
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

      {/* Jury scoring modal */}
      {showScoringModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Resmi Skor Giriş Belgesi</h2>
              <button className="password-toggle-btn" style={{ position: 'static', padding: 0, border: 'none', background: 'none' }} onClick={() => setShowScoringModal(false)}>
                <X size={20} />
              </button>
            </div>

            {scoringError && (
              <div className="auth-error" style={{ marginBottom: '12px', padding: '10px 14px' }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: '0.8rem' }}>{scoringError}</span>
              </div>
            )}

            <form onSubmit={handleScoreSubmit} className="jury-score-sheet">
              {/* Poll preview inside modal for Jury */}
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', marginBottom: '12px' }}>
                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--color-secondary)' }}>Seyirci Anketi Sonuçları (Sadece Jüri Görebilir):</span>
                {renderPollPercentages()}
              </div>

              <h3 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '0 0 10px 0' }}>
                Takım Sıralamaları (HA, MA, HK, MK)
              </h3>
              <div className="score-rank-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {[
                  { name: 'Opening Government', label: 'HA (Hükümet Açılış)' },
                  { name: 'Opening Opposition', label: 'MA (Muhalefet Açılış)' },
                  { name: 'Closing Government', label: 'HK (Hükümet Kapanış)' },
                  { name: 'Closing Opposition', label: 'MK (Muhalefet Kapanış)' }
                ].map(team => (
                  <div key={team.name} className="input-group" style={{ margin: 0 }}>
                    <label className="input-label" style={{ fontSize: '0.65rem' }}>{team.label}</label>
                    <select 
                      className="input-field"
                      value={rankings[team.name]}
                      onChange={(e) => setRankings(prev => ({ ...prev, [team.name]: parseInt(e.target.value, 10) }))}
                      style={{ fontSize: '0.8rem', padding: '6px' }}
                    >
                      <option value="1">1. (Birinci)</option>
                      <option value="2">2. (İkinci)</option>
                      <option value="3">3. (Üçüncü)</option>
                      <option value="4">4. (Dördüncü)</option>
                    </select>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '8px 0 10px 0' }}>
                Konuşmacı Puanları (50 - 100)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div className="score-bench-points">
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'block', marginBottom: '6px' }}>HÜKÜMET (GOV)</span>
                  {['PM', 'DPM', 'MG', 'GW'].map(role => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                      <label htmlFor={`pts-${role}`} style={{ fontSize: '0.75rem' }}>{SPEAKER_DETAILS[role as SpeakerRole].name}</label>
                      <input 
                        id={`pts-${role}`}
                        type="number" 
                        className="input-field score-point-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: '60px', textAlign: 'center' }}
                        min="50"
                        max="100"
                        value={speakerPoints[role as SpeakerRole]}
                        onChange={(e) => setSpeakerPoints(prev => ({ ...prev, [role]: e.target.value }))}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="score-bench-points">
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-secondary)', display: 'block', marginBottom: '6px' }}>MUHALEFET (OPP)</span>
                  {['LO', 'DLO', 'MO', 'OW'].map(role => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                      <label htmlFor={`pts-${role}`} style={{ fontSize: '0.75rem' }}>{SPEAKER_DETAILS[role as SpeakerRole].name}</label>
                      <input 
                        id={`pts-${role}`}
                        type="number" 
                        className="input-field score-point-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: '60px', textAlign: 'center' }}
                        min="50"
                        max="100"
                        value={speakerPoints[role as SpeakerRole]}
                        onChange={(e) => setSpeakerPoints(prev => ({ ...prev, [role]: e.target.value }))}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ margin: '0 0 12px 0' }}>
                <label className="input-label" htmlFor="rationales" style={{ fontSize: '0.7rem' }}>GEREKÇELİ KARAR (RFD) BEYANI</label>
                <textarea 
                  id="rationales"
                  className="input-field" 
                  style={{ minHeight: '80px', fontSize: '0.8rem', resize: 'vertical' }}
                  placeholder="Gerekçeli kararı girin..."
                  value={juryNotes}
                  onChange={(e) => setJuryNotes(e.target.value)}
                />
              </div>

              {/* JURY PERMISSION TO RELEASE SPECTATOR VOTES */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', padding: '4px 0' }}>
                <input 
                  id="release-votes-check"
                  type="checkbox" 
                  checked={releaseVotes}
                  onChange={(e) => setReleaseVotes(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="release-votes-check" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                  Seyirci Anketi Sonuçlarını Salona Yayınla
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScoringModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Sonuçları Onayla ve Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

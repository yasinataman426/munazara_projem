import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import type { RoomState } from '../types';
import { 
  Settings, 
  BarChart3, 
  Check, 
  Loader2, 
  Activity, 
  Award, 
  BookOpen, 
  Mail, 
  Smartphone, 
  School, 
  MapPin, 
  TrendingUp, 
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const PRESET_AVATARS = [
  { id: 'preset1', label: 'Mavi Kozmos', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { id: 'preset2', label: 'Mor Derinlik', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 'preset3', label: 'Zümrüt Işığı', gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  { id: 'preset4', label: 'Altın Gün', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { id: 'preset5', label: 'Kızıl Alev', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { id: 'preset6', label: 'Pembe Nebula', gradient: 'linear-gradient(135deg, #ec4899, #be185d)' }
];

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { mode, setMode, palette, setPalette } = useTheme();
  
  // Navigation tabs: 'settings' | 'stats'
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [school, setSchool] = useState('');
  const [age, setAge] = useState<number>(0);
  const [newPassword, setNewPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  
  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Statistics States
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [expandedJuryRoomId, setExpandedJuryRoomId] = useState<string | null>(null);

  // Pagination states
  const [paginatedDebaterMatches, setPaginatedDebaterMatches] = useState<any[]>([]);
  const [debaterPage, setDebaterPage] = useState(0);
  const [hasMoreDebaterMatches, setHasMoreDebaterMatches] = useState(true);
  const [loadingDebaterMore, setLoadingDebaterMore] = useState(false);

  const [paginatedJuryMatches, setPaginatedJuryMatches] = useState<RoomState[]>([]);
  const [juryPage, setJuryPage] = useState(0);
  const [hasMoreJuryMatches, setHasMoreJuryMatches] = useState(true);
  const [loadingJuryMore, setLoadingJuryMore] = useState(false);
  
  // Hover states for interactive SVG charts
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<number | null>(null);
  const [hoveredLinePoint, setHoveredLinePoint] = useState<number | null>(null);

  // Initialize fields
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setCity(user.city || '');
      setSchool(user.school || '');
      setAge(user.age || 0);
      setAvatarUrl(user.avatarUrl || '');
      setIsVerified(user.isVerified || false);
      
      // Determine if they used a custom URL instead of preset
      if (user.avatarUrl && !user.avatarUrl.startsWith('preset')) {
        setShowUrlField(true);
      }
    }
  }, [user]);

  // Load stats data when switching to the Stats tab
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStatsData();
    }
  }, [activeTab]);

  const loadStatsData = async () => {
    if (!user) return;
    setFetchingStats(true);
    try {
      const [allUserRooms, initialDebater, initialJury] = await Promise.all([
        Database.getAllUserCompletedRooms(user.id),
        Database.getUserMatches(user.id, 'debater', 0, 9), // first 10 items
        Database.getUserMatches(user.id, 'jury', 0, 9) // first 10 items
      ]);
      setRooms(allUserRooms);

      // Map initial debater matches to view format
      const debaterMapped = initialDebater.rooms.map(room => {
        const pData = room.participants[user.id];
        if (!pData || !pData.assignedSpeakerRole || !room.result) return null;
        const role = pData.assignedSpeakerRole;
        const SPEAKER_TEAMS: Record<string, string> = {
          PM: 'Opening Government', DPM: 'Opening Government',
          LO: 'Opening Opposition', DLO: 'Opening Opposition',
          MG: 'Closing Government', GW: 'Closing Government',
          MO: 'Closing Opposition', OW: 'Closing Opposition'
        };
        const teamName = SPEAKER_TEAMS[role] || '';
        const rank = room.result.rankings[teamName as keyof typeof room.result.rankings] || 0;
        const points = room.result.speakerPoints[role] || 0;
        return {
          roomId: room.roomId,
          roomName: room.roomName,
          motionText: room.motion?.text || 'Özel Konu',
          assignedSpeakerRole: role,
          teamName,
          rank,
          points,
          submittedAt: room.result.submittedAt
        };
      }).filter(Boolean);

      setPaginatedDebaterMatches(debaterMapped as any[]);
      setHasMoreDebaterMatches(debaterMapped.length < initialDebater.total);
      setDebaterPage(0);

      setPaginatedJuryMatches(initialJury.rooms);
      setHasMoreJuryMatches(initialJury.rooms.length < initialJury.total);
      setJuryPage(0);
    } catch (err) {
      console.error('Error loading debate logs:', err);
    } finally {
      setFetchingStats(false);
    }
  };

  const loadMoreDebaterMatches = async () => {
    if (!user || loadingDebaterMore) return;
    setLoadingDebaterMore(true);
    try {
      const nextPage = debaterPage + 1;
      const from = nextPage * 10;
      const to = from + 9;
      const res = await Database.getUserMatches(user.id, 'debater', from, to);
      if (res.rooms.length > 0) {
        const mapped = res.rooms.map(room => {
          const pData = room.participants[user.id];
          if (!pData || !pData.assignedSpeakerRole || !room.result) return null;
          const role = pData.assignedSpeakerRole;
          const SPEAKER_TEAMS: Record<string, string> = {
            PM: 'Opening Government', DPM: 'Opening Government',
            LO: 'Opening Opposition', DLO: 'Opening Opposition',
            MG: 'Closing Government', GW: 'Closing Government',
            MO: 'Closing Opposition', OW: 'Closing Opposition'
          };
          const teamName = SPEAKER_TEAMS[role] || '';
          const rank = room.result.rankings[teamName as keyof typeof room.result.rankings] || 0;
          const points = room.result.speakerPoints[role] || 0;
          return {
            roomId: room.roomId,
            roomName: room.roomName,
            motionText: room.motion?.text || 'Özel Konu',
            assignedSpeakerRole: role,
            teamName,
            rank,
            points,
            submittedAt: room.result.submittedAt
          };
        }).filter(Boolean);

        setPaginatedDebaterMatches(prev => [...prev, ...(mapped as any[])]);
        setDebaterPage(nextPage);
        setHasMoreDebaterMatches((paginatedDebaterMatches.length + mapped.length) < res.total);
      } else {
        setHasMoreDebaterMatches(false);
      }
    } catch (err) {
      console.error('Error loading more debater matches:', err);
    } finally {
      setLoadingDebaterMore(false);
    }
  };

  const loadMoreJuryMatches = async () => {
    if (!user || loadingJuryMore) return;
    setLoadingJuryMore(true);
    try {
      const nextPage = juryPage + 1;
      const from = nextPage * 10;
      const to = from + 9;
      const res = await Database.getUserMatches(user.id, 'jury', from, to);
      if (res.rooms.length > 0) {
        setPaginatedJuryMatches(prev => [...prev, ...res.rooms]);
        setJuryPage(nextPage);
        setHasMoreJuryMatches((paginatedJuryMatches.length + res.rooms.length) < res.total);
      } else {
        setHasMoreJuryMatches(false);
      }
    } catch (err) {
      console.error('Error loading more jury matches:', err);
    } finally {
      setLoadingJuryMore(false);
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Handle Profile Update Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber || !city || !school || !age) {
      setNotification({ message: 'Lütfen tüm zorunlu kişisel bilgileri doldurun.', type: 'error' });
      return;
    }
    
    setLoading(true);
    setNotification(null);
    try {
      const res = await Database.updateUserProfile(user.id, {
        fullName,
        phoneNumber,
        city,
        school,
        age: Number(age),
        password: newPassword || undefined,
        avatarUrl,
        isVerified
      });

      if (res.success) {
        setNotification({ message: 'Profiliniz başarıyla güncellendi.', type: 'success' });
        setNewPassword(''); // clear password field
      } else {
        setNotification({ message: res.message, type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: 'Profil güncellenirken beklenmedik hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
      // Auto-hide notification after 3.5s
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'jury': return 'Jüri';
      case 'debater': return 'Münazır';
      case 'spectator': return 'Seyirci';
      default: return role;
    }
  };

  const renderActiveAvatar = (currentAvatarUrl: string) => {
    if (currentAvatarUrl && currentAvatarUrl.startsWith('http')) {
      return (
        <img 
          src={currentAvatarUrl} 
          alt="Avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-glow)' }} 
        />
      );
    }
    const preset = PRESET_AVATARS.find(p => p.id === currentAvatarUrl);
    const gradient = preset ? preset.gradient : 'linear-gradient(135deg, #64748b, #475569)';
    return (
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        fontWeight: 700,
        color: '#ffffff',
        textTransform: 'uppercase',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
      }}>
        {user.username.charAt(0)}
      </div>
    );
  };

  // --- STATS COMPUTATION FOR DEBATER (MÜNAZIR) ---
  const debaterMatches = rooms
    .filter(room => room.status === 'finished')
    .map(room => {
      const pData = room.participants[user.id];
      if (!pData || !pData.assignedSpeakerRole || !room.result) return null;
      
      const role = pData.assignedSpeakerRole;
      
      // Determine speaker team
      const SPEAKER_TEAMS: Record<string, string> = {
        PM: 'Opening Government', DPM: 'Opening Government',
        LO: 'Opening Opposition', DLO: 'Opening Opposition',
        MG: 'Closing Government', GW: 'Closing Government',
        MO: 'Closing Opposition', OW: 'Closing Opposition'
      };
      
      const teamName = SPEAKER_TEAMS[role] || '';
      const rank = room.result.rankings[teamName as 'Opening Government' | 'Opening Opposition' | 'Closing Government' | 'Closing Opposition'] || 0;
      const points = room.result.speakerPoints[role] || 0;
      
      return {
        roomId: room.roomId,
        roomName: room.roomName,
        motionText: room.motion?.text || 'Özel Konu',
        assignedSpeakerRole: role,
        teamName,
        rank,
        points,
        submittedAt: room.result.submittedAt
      };
    })
    .filter(Boolean)
    // sort chronological (ascending)
    .sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  // Debater statistics calculations
  const totalDebates = debaterMatches.length;
  const avgSpeakerPoints = totalDebates > 0 
    ? Number((debaterMatches.reduce((acc: number, cur: any) => acc + cur.points, 0) / totalDebates).toFixed(1))
    : 0;

  // Streak calculations
  const calculateDebaterStreaks = () => {
    let longestStreak = 0;
    let currentStreak = 0;
    
    for (const match of debaterMatches) {
      if (match && match.rank === 1) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    
    // Active current streak from the end
    let activeStreak = 0;
    for (let i = debaterMatches.length - 1; i >= 0; i--) {
      const m = debaterMatches[i];
      if (m && m.rank === 1) {
        activeStreak++;
      } else {
        break;
      }
    }
    
    return { longestStreak, activeStreak };
  };

  const { longestStreak: maxWinStreak, activeStreak: currentWinStreak } = calculateDebaterStreaks();

  // Rank distribution count
  const rankCounts = [0, 0, 0, 0]; // 1st, 2nd, 3rd, 4th
  debaterMatches.forEach((m: any) => {
    if (m.rank >= 1 && m.rank <= 4) {
      rankCounts[m.rank - 1]++;
    }
  });

  // SVG Donut calculation
  const donutColors = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
  const donutCircumference = 2 * Math.PI * 30; // Radius = 30, Circumference = 188.5

  // --- STATS COMPUTATION FOR JURY (JÜRİ) ---
  const juryMatches = rooms
    .filter(room => room.status === 'finished' && room.participants[user.id] && room.participants[user.id].role === 'jury');

  const totalJuryMatches = juryMatches.length;
  
  // Calculate average speaker score given by this jury
  const getAllScoresGiven = () => {
    const scores: number[] = [];
    juryMatches.forEach(room => {
      if (room.result && room.result.speakerPoints) {
        Object.values(room.result.speakerPoints).forEach((pt: any) => {
          scores.push(Number(pt));
        });
      }
    });
    return scores;
  };
  const scoresGiven = getAllScoresGiven();
  const avgScoreGiven = scoresGiven.length > 0
    ? Number((scoresGiven.reduce((a, b) => a + b, 0) / scoresGiven.length).toFixed(1))
    : 0;

  const matchesWithNotes = juryMatches.filter(r => r.result && r.result.juryNotes && r.result.juryNotes.trim().length > 0).length;

  // Jury Placement bias analysis
  // Collect rankings given by the jury to opening/closing/gov/opp
  const getJuryPlacementDistribution = () => {
    let govCount = 0, govSum = 0;
    let oppCount = 0, oppSum = 0;
    let openCount = 0, openSum = 0;
    let closeCount = 0, closeSum = 0;

    let totalRanks = 0;
    const rankSums: Record<string, number> = {
      'Opening Government': 0,
      'Opening Opposition': 0,
      'Closing Government': 0,
      'Closing Opposition': 0
    };

    juryMatches.forEach(room => {
      if (room.result && room.result.rankings) {
        Object.entries(room.result.rankings).forEach(([team, rank]) => {
          const r = Number(rank);
          rankSums[team] += r;
          totalRanks++;

          if (team.includes('Government')) {
            govSum += r; govCount++;
          } else {
            oppSum += r; oppCount++;
          }

          if (team.includes('Opening')) {
            openSum += r; openCount++;
          } else {
            closeSum += r; closeCount++;
          }
        });
      }
    });

    return {
      avgGov: govCount > 0 ? (govSum / govCount).toFixed(2) : '-',
      avgOpp: oppCount > 0 ? (oppSum / oppCount).toFixed(2) : '-',
      avgOpen: openCount > 0 ? (openSum / openCount).toFixed(2) : '-',
      avgClose: closeCount > 0 ? (closeSum / closeCount).toFixed(2) : '-',
      details: {
        ha: totalJuryMatches > 0 ? (rankSums['Opening Government'] / totalJuryMatches).toFixed(2) : '-',
        ma: totalJuryMatches > 0 ? (rankSums['Opening Opposition'] / totalJuryMatches).toFixed(2) : '-',
        hk: totalJuryMatches > 0 ? (rankSums['Closing Government'] / totalJuryMatches).toFixed(2) : '-',
        mk: totalJuryMatches > 0 ? (rankSums['Closing Opposition'] / totalJuryMatches).toFixed(2) : '-'
      }
    };
  };

  const juryBias = getJuryPlacementDistribution();

  return (
    <main className="container" style={{ padding: '30px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <style>{`
        .animate-fade-in-row {
          animation: slideDownIn 0.35s ease-out forwards;
        }
        @keyframes slideDownIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Top Banner (User Profile Intro Card) */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)', borderLeft: '4px solid var(--color-primary)' }}>
        
        {renderActiveAvatar(user.avatarUrl || '')}
        
        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{user.fullName}</h1>
            {user.isVerified && (
              <span className="badge badge-open" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '3px 8px', fontWeight: 600 }}>
                <Check size={10} />
                Doğrulanmış
              </span>
            )}
            <span className="badge badge-spectator" style={{ fontSize: '0.7rem', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {getRoleLabel(user.role)}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: '0.85rem' }}>
            @{user.username} &bull; {user.email} &bull; {user.school}
          </p>
        </div>

        {/* Tab switcher inside intro card */}
        <div className="auth-tabs" style={{ marginBottom: 0, padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-sm)', width: 'fit-content' }}>
          <button 
            className={`auth-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Settings size={14} />
            Ayarlar
          </button>
          <button 
            className={`auth-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart3 size={14} />
            İstatistikler
          </button>
        </div>

      </div>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          padding: '12px 20px',
          borderRadius: 'var(--border-radius-sm)',
          background: notification.type === 'success' ? 'var(--color-success-glow)' : 'var(--color-danger-glow)',
          border: `1px solid ${notification.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          color: '#ffffff',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.3s ease'
        }}>
          {notification.type === 'success' && <Check size={18} style={{ color: 'var(--color-success)' }} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Tab Render */}
      {activeTab === 'settings' ? (
        /* Settings Tab (Profil Ayarları) */
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: '#ffffff' }}>Hesap & Profil Ayarları</h2>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Avatar Selector Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Profil Fotoğrafı Seçimi</label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                {PRESET_AVATARS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset.id);
                      setShowUrlField(false);
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: preset.gradient,
                      border: avatarUrl === preset.id ? '2.5px solid var(--color-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: avatarUrl === preset.id ? 'var(--shadow-glow)' : 'none',
                      transition: 'transform 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}
                    className="preset-avatar-btn"
                    title={preset.label}
                  >
                    {avatarUrl === preset.id && <Check size={18} />}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlField(true);
                    setAvatarUrl('');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '20px' }}
                >
                  Özel URL Gir
                </button>
              </div>

              {showUrlField && (
                <div style={{ marginTop: '8px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="https://example.com/resim.png"
                    value={avatarUrl.startsWith('preset') ? '' : avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İnternetten herhangi bir resim linki yapıştırabilirsiniz.</span>
                </div>
              )}
            </div>

            {/* 2. Verification Switch */}
            <div style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px', 
              borderRadius: 'var(--border-radius-sm)', 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} style={{ color: 'var(--color-primary)' }} />
                  Hesap Doğrulama Simülasyonu
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hesap doğrulama rozetini profilinizde göstermek için bu seçeneği test edebilirsiniz.</span>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  style={{
                    width: '38px',
                    height: '20px',
                    appearance: 'none',
                    background: isVerified ? 'var(--color-success)' : 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background 0.3s'
                  }}
                  className="switch-toggle"
                />
                <style>{`
                  .switch-toggle::before {
                    content: '';
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #ffffff;
                    top: 2px;
                    left: ${isVerified ? '20px' : '2px'};
                    transition: left 0.3s;
                  }
                `}</style>
              </label>
            </div>

            {/* 3. Personal Info Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ad Soyad <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Telefon Numarası <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '36px' }}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Okul / Üniversite <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <School size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '36px' }}
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Şehir <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '36px' }}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Yaş <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={age || ''}
                  onChange={(e) => setAge(Number(e.target.value))}
                  required 
                />
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Şifre Değiştir (Yeni Şifre)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Değiştirmek istemiyorsanız boş bırakın"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: 'fit-content', padding: '12px 28px', alignSelf: 'flex-end', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Kaydediliyor...
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </button>
            
          </form>

          {/* Tema Seçimi Section */}
          <div style={{ marginTop: '30px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>Tema & Görünüm Ayarları</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
              {/* 1. Interface Mode Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Arayüz Modu</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={`btn ${mode === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexGrow: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Moon size={16} />
                    Koyu Mod
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={`btn ${mode === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexGrow: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Sun size={16} />
                    Açık Mod
                  </button>
                </div>
              </div>

              {/* 2. Color Palette Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Renk Teması</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Professional */}
                  <button
                    type="button"
                    onClick={() => setPalette('professional')}
                    style={{
                      padding: '10px',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: palette === 'professional' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      color: palette === 'professional' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <span>Profesyonel</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316' }}></div>
                    </div>
                  </button>
                  {/* Minimal */}
                  <button
                    type="button"
                    onClick={() => setPalette('minimal')}
                    style={{
                      padding: '10px',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: palette === 'minimal' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      color: palette === 'minimal' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <span>Minimal</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0b0b0b', border: '1px solid #333' }}></div>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                    </div>
                  </button>
                  {/* Tutku */}
                  <button
                    type="button"
                    onClick={() => setPalette('passion')}
                    style={{
                      padding: '10px',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: palette === 'passion' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      color: palette === 'passion' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <span>Tutku</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#374151' }}></div>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                    </div>
                  </button>
                  {/* Modern */}
                  <button
                    type="button"
                    onClick={() => setPalette('modern')}
                    style={{
                      padding: '10px',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: palette === 'modern' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      color: palette === 'modern' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <span>Modern</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#db2777' }}></div>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fdfbf7', border: '1px solid #ccc' }}></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Stats & Analytics Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {fetchingStats ? (
            <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} size={32} />
              İstatistik verileri veritabanından sorgulanıp hesaplanıyor...
            </div>
          ) : user.role === 'debater' ? (
            /* --- DEBATER ANALYTICS VIEW --- */
            <>
              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'var(--color-primary-glow)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <Activity size={24} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>TOPLAM MAÇ</span>
                    <strong style={{ fontSize: '1.6rem', color: '#ffffff', fontFamily: 'Outfit' }}>{totalDebates}</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <TrendingUp size={24} style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>ORT. KONUŞMACI PUANI</span>
                    <strong style={{ fontSize: '1.6rem', color: '#ffffff', fontFamily: 'Outfit' }}>{avgSpeakerPoints}</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <Award size={24} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>GALİBİYET SERİSİ (AKTİF)</span>
                    <strong style={{ fontSize: '1.6rem', color: 'var(--color-success)', fontFamily: 'Outfit' }}>{currentWinStreak}</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <Award size={24} style={{ color: 'var(--color-warning)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>EN UZUN SERİ (1.lik)</span>
                    <strong style={{ fontSize: '1.6rem', color: 'var(--color-warning)', fontFamily: 'Outfit' }}>{maxWinStreak}</strong>
                  </div>
                </div>
              </div>

              {/* Performance Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* 1. Pie/Donut Chart for Rank Distribution */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#ffffff' }}>Sıralama Dağılım Oranları</h3>
                  
                  {totalDebates === 0 ? (
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '40px 0' }}>
                      Henüz grafik oluşturmak için yeterli veri yok.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px', justifyContent: 'center' }}>
                      
                      {/* SVG Donut render */}
                      <svg width="140" height="140" viewBox="0 0 80 80">
                        {/* Circular grid backdrop */}
                        <circle cx="40" cy="40" r="30" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                        
                        {(() => {
                          let accumulatedPercent = 0;
                          return rankCounts.map((count, index) => {
                            if (count === 0) return null;
                            const percent = (count / totalDebates) * 100;
                            const strokeLength = (percent / 100) * donutCircumference;
                            accumulatedPercent += percent;

                            const isHovered = hoveredDonutSlice === index;
                            
                            return (
                              <circle
                                key={index}
                                cx="40"
                                cy="40"
                                r="30"
                                fill="transparent"
                                stroke={donutColors[index]}
                                strokeWidth={isHovered ? 10 : 8}
                                strokeDasharray={`${strokeLength} ${donutCircumference}`}
                                strokeDashoffset={-((accumulatedPercent - percent) / 100) * donutCircumference}
                                strokeLinecap="butt"
                                transform="rotate(-90 40 40)"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'stroke-width 0.2s, filter 0.2s',
                                  filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 4px ' + donutColors[index] + ')' : 'none'
                                }}
                                onMouseEnter={() => setHoveredDonutSlice(index)}
                                onMouseLeave={() => setHoveredDonutSlice(null)}
                              />
                            );
                          });
                        })()}
                        
                        {/* Donut Center Display */}
                        <circle cx="40" cy="40" r="23" fill="var(--bg-surface)" />
                        <text x="40" y="38" textAnchor="middle" fill="var(--text-secondary)" fontSize="5.5" fontWeight="500">MAÇ</text>
                        <text x="40" y="47" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="Outfit">{totalDebates}</text>
                      </svg>

                      {/* Legend details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '150px' }}>
                        {rankCounts.map((count, idx) => {
                          const percentage = totalDebates > 0 ? ((count / totalDebates) * 100).toFixed(0) : '0';
                          const isHovered = hoveredDonutSlice === idx;
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '6px 10px', 
                                borderRadius: '6px',
                                background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                                transition: 'background-color 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={() => setHoveredDonutSlice(idx)}
                              onMouseLeave={() => setHoveredDonutSlice(null)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: donutColors[idx] }}></span>
                                <span style={{ fontSize: '0.8rem', color: isHovered ? '#ffffff' : 'var(--text-secondary)' }}>{idx + 1}. Sıra</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                                {count} Maç ({percentage}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>

                {/* 2. Line Chart for Speaker Score Development */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#ffffff' }}>Konuşmacı Puanı Gelişim Grafiği</h3>
                  
                  {totalDebates < 2 ? (
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '40px 0', textAlign: 'center' }}>
                      Puan gelişim trendini görmek için en az 2 tamamlanmış maça katılmış olmalısınız.
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {/* SVG Line Chart */}
                      <svg width="100%" height="160" viewBox="0 0 300 130" style={{ overflow: 'visible' }}>
                        <defs>
                          {/* Glow drop shadow gradient */}
                          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--color-primary)" />
                            <stop offset="100%" stopColor="var(--color-secondary)" />
                          </linearGradient>
                          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Y-axis gridlines */}
                        {[50, 60, 70, 80, 90, 100].map((scoreValue) => {
                          // Map score value 50..100 to y coordinate 110..10
                          const y = 110 - ((scoreValue - 50) / (100 - 50)) * 100;
                          return (
                            <g key={scoreValue}>
                              <line x1="25" y1={y} x2="295" y2={y} stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                              <text x="18" y={y + 2.5} fill="var(--text-muted)" fontSize="6" textAnchor="end">{scoreValue}</text>
                            </g>
                          );
                        })}

                        {/* Draw the area and trend path */}
                        {(() => {
                          const points = debaterMatches.map((m: any, idx) => {
                            const x = 30 + (idx / (totalDebates - 1)) * 260;
                            const y = 110 - ((m.points - 50) / (100 - 50)) * 100;
                            return { x, y };
                          });

                          const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          const areaD = `${pathD} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;

                          return (
                            <>
                              {/* Glowing background area */}
                              <path d={areaD} fill="url(#area-gradient)" />
                              
                              {/* Connected Line */}
                              <path d={pathD} fill="none" stroke="url(#line-gradient)" strokeWidth="2.5" />

                              {/* Data Point Circles */}
                              {points.map((p, idx) => {
                                const isHovered = hoveredLinePoint === idx;
                                return (
                                  <circle
                                    key={idx}
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 5.5 : 3.5}
                                    fill={isHovered ? '#ffffff' : 'var(--color-primary)'}
                                    stroke="var(--bg-surface)"
                                    strokeWidth={isHovered ? 1.5 : 1}
                                    style={{
                                      cursor: 'pointer',
                                      transition: 'r 0.15s, fill 0.15s',
                                      filter: isHovered ? 'drop-shadow(0 0 4px var(--color-primary))' : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredLinePoint(idx)}
                                    onMouseLeave={() => setHoveredLinePoint(null)}
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredLinePoint !== null && debaterMatches[hoveredLinePoint] && (
                        <div style={{
                          position: 'absolute',
                          bottom: '125px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 10,
                          pointerEvents: 'none',
                          maxWidth: '220px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          animation: 'fadeIn 0.15s ease'
                        }}>
                          <strong style={{ fontSize: '0.8rem', color: '#ffffff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {debaterMatches[hoveredLinePoint].roomName}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Rol: {debaterMatches[hoveredLinePoint].assignedSpeakerRole} &bull; Konu: "{debaterMatches[hoveredLinePoint].motionText.slice(0, 30)}..."
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Puan: {debaterMatches[hoveredLinePoint].points}</span>
                            <span style={{ color: 'var(--color-success)' }}>Sıralama: {debaterMatches[hoveredLinePoint].rank}.</span>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>

              {/* Match History Table */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 20px', color: '#ffffff' }}>Detaylı Maç Geçmişi</h3>
                
                <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Maç/Oda</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Münazara Konusu</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Konuşma Rolü</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pozisyon / Takım</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sıra</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Konuşmacı Skoru</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDebaterMatches.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Kayıtlı herhangi bir münazara maçı geçmişiniz bulunmamaktadır.
                          </td>
                        </tr>
                      ) : (
                        paginatedDebaterMatches.map((m: any, idx) => {
                          const getTeamLabel = (name: string) => {
                            if (name === 'Opening Government') return 'Hükümet Açılış (HA)';
                            if (name === 'Opening Opposition') return 'Muhalefet Açılış (MA)';
                            if (name === 'Closing Government') return 'Hükümet Kapanış (HK)';
                            if (name === 'Closing Opposition') return 'Muhalefet Kapanış (MK)';
                            return name;
                          };
                          
                          const getRankBadgeClass = (rank: number) => {
                            if (rank === 1) return 'badge-open'; // green
                            if (rank === 2) return 'badge-spectator'; // blue/secondary
                            if (rank === 3) return 'badge-jury'; // amber
                            return 'badge-rookie'; // red/danger
                          };

                          return (
                            <tr key={m.roomId + '-' + idx} className="animate-fade-in-row" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#ffffff' }}>{m.roomName}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.motionText}>
                                {m.motionText}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 'bold' }}>{m.assignedSpeakerRole}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{getTeamLabel(m.teamName)}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span className={`badge ${getRankBadgeClass(m.rank)}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                  {m.rank}. Sıra
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primary)' }}>{m.points}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                {new Date(m.submittedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {hasMoreDebaterMatches && paginatedDebaterMatches.length > 0 && (
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem' }}
                      onClick={loadMoreDebaterMatches}
                      disabled={loadingDebaterMore}
                    >
                      {loadingDebaterMore ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          Yükleniyor...
                        </>
                      ) : (
                        'Daha Fazla Göster'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : user.role === 'jury' ? (
            /* --- JURY ANALYTICS VIEW --- */
            <>
              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'var(--color-primary-glow)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <BookOpen size={24} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>YÖNETİLEN MAÇ (JÜRİLİK)</span>
                    <strong style={{ fontSize: '1.6rem', color: '#ffffff', fontFamily: 'Outfit' }}>{totalJuryMatches}</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <Activity size={24} style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>DAĞITILAN ORT. SKOR</span>
                    <strong style={{ fontSize: '1.6rem', color: '#ffffff', fontFamily: 'Outfit' }}>{avgScoreGiven}</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: 'var(--border-radius-sm)' }}>
                    <Award size={24} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>YAYINLANAN RFD (GEREKÇE)</span>
                    <strong style={{ fontSize: '1.6rem', color: 'var(--color-success)', fontFamily: 'Outfit' }}>{matchesWithNotes}</strong>
                  </div>
                </div>
              </div>

              {/* Jury Placement Bias Analysis */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#ffffff' }}>Jüri Karar Dağılımı ve Pozisyonel Analiz</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>Yönettiğiniz maçlarda takımlara verdiğiniz ortalama sıralamalar (1.00 en iyi, 4.00 en kötü skordur).</p>
                </div>

                {totalJuryMatches === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Sıralama analizi oluşturmak için en az 1 tamamlanmış maçı jüri olarak yönetmiş olmalısınız.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    
                    {/* General splits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Kürsü Dengesi</strong>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Hükümet Kanadı Ort:</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.avgGov}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Muhalefet Kanadı Ort:</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.avgOpp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Açılış Takımları Ort:</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.avgOpen}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Kapanış Takımları Ort:</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.avgClose}</span>
                      </div>
                    </div>

                    {/* Team specific averages */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Takım Bazlı Sıralama Aritmetiği</strong>
                      
                      {/* Bar 1 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Hükümet Açılış (HA)</span>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.details.ha}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(1 - (Number(juryBias.details.ha) - 1) / 3) * 100}%`, 
                            height: '100%', 
                            background: 'var(--color-primary)' 
                          }} />
                        </div>
                      </div>

                      {/* Bar 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Muhalefet Açılış (MA)</span>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.details.ma}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(1 - (Number(juryBias.details.ma) - 1) / 3) * 100}%`, 
                            height: '100%', 
                            background: 'var(--color-secondary)' 
                          }} />
                        </div>
                      </div>

                      {/* Bar 3 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Hükümet Kapanış (HK)</span>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.details.hk}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(1 - (Number(juryBias.details.hk) - 1) / 3) * 100}%`, 
                            height: '100%', 
                            background: 'var(--color-success)' 
                          }} />
                        </div>
                      </div>

                      {/* Bar 4 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Muhalefet Kapanış (MK)</span>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{juryBias.details.mk}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${(1 - (Number(juryBias.details.mk) - 1) / 3) * 100}%`, 
                            height: '100%', 
                            background: 'var(--color-danger)' 
                          }} />
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Jury Matches & RFD Timeline list */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 20px', color: '#ffffff' }}>Jürilik Geçmişi ve RFD Karar Gerekçeleri</h3>

                {paginatedJuryMatches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Geçmişte yönettiğiniz herhangi bir münazara maçı kaydı bulunamadı.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {paginatedJuryMatches.map(room => {
                      const isExpanded = expandedJuryRoomId === room.roomId;
                      
                      const getWinnerLabel = (result: any) => {
                        if (!result || !result.rankings) return 'Bilinmiyor';
                        const wEntry = Object.entries(result.rankings).find(([_, rank]) => rank === 1);
                        if (!wEntry) return 'Bilinmiyor';
                        const t = wEntry[0];
                        if (t === 'Opening Government') return 'Hükümet Açılış (HA)';
                        if (t === 'Opening Opposition') return 'Muhalefet Açılış (MA)';
                        if (t === 'Closing Government') return 'Hükümet Kapanış (HK)';
                        if (t === 'Closing Opposition') return 'Muhalefet Kapanış (MK)';
                        return t;
                      };

                      return (
                        <div key={room.roomId} className="animate-fade-in-row" style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)',
                          background: 'rgba(255, 255, 255, 0.01)',
                          overflow: 'hidden'
                        }}>
                          <div 
                            onClick={() => setExpandedJuryRoomId(isExpanded ? null : room.roomId)}
                            style={{ 
                              padding: '14px 18px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{room.roomName}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Konu: "{room.motion?.text || 'Özel Münazara Konusu'}"
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>
                                {room.result?.submittedAt ? new Date(room.result.submittedAt).toLocaleDateString('tr-TR') : '-'}
                              </span>
                              <span style={{ 
                                color: 'var(--color-primary)', 
                                textDecoration: 'underline', 
                                fontWeight: 500 
                              }}>
                                {isExpanded ? 'Detayları Kapat' : 'RFD Notunu Oku'}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ 
                              padding: '18px', 
                              borderTop: '1px solid var(--border-color)',
                              background: 'rgba(0,0,0,0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-secondary)' }}>Kazanan (1.): </span>
                                  <strong style={{ color: 'var(--color-success)' }}>{getWinnerLabel(room.result)}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-secondary)' }}>Maç Formatı: </span>
                                  <strong style={{ color: '#ffffff' }}>İngiliz Parlamentosu (BP)</strong>
                                </div>
                              </div>

                              <div style={{ 
                                padding: '12px 14px', 
                                background: 'rgba(255, 255, 255, 0.02)', 
                                borderLeft: '3px solid var(--color-warning)',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.5'
                              }}>
                                <strong style={{ display: 'block', marginBottom: '6px', color: '#ffffff', fontSize: '0.8rem' }}>Karar Gerekçesi (RFD):</strong>
                                {room.result?.juryNotes ? (
                                  <span style={{ whiteSpace: 'pre-wrap' }}>{room.result.juryNotes}</span>
                                ) : (
                                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Bu maç için gerekçeli karar notu girilmemiştir.</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {hasMoreJuryMatches && paginatedJuryMatches.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem' }}
                      onClick={loadMoreJuryMatches}
                      disabled={loadingJuryMore}
                    >
                      {loadingJuryMore ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          Yükleniyor...
                        </>
                      ) : (
                        'Daha Fazla Göster'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* --- SPECTATOR / ADMIN FALLBACK VIEW --- */
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: 'var(--color-primary-glow)', padding: '16px', borderRadius: '50%' }}>
                <HelpCircle size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#ffffff' }}>Genel Profil Analizi</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                Şu anda <strong>{getRoleLabel(user.role)}</strong> yetkisiyle giriş yapmış bulunmaktasınız. Münazara veya Jüri rollerinde olmadığınız için bu hesap türüne özel performans/maç analizi bulunmamaktadır.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.8rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kayıt Tarihi:</span>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>
                    {new Date(user.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kullanıcı Kimliği (ID):</span>
                  <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{user.id}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </main>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import type { User, UserRole, RoomState } from '../types';
import { 
  Users, 
  Award, 
  Radio, 
  Search, 
  ShieldAlert, 
  Check, 
  Loader2, 
  Calendar,
  Sparkles
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalMatches: 0, activeRooms: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [completedRooms, setCompletedRooms] = useState<RoomState[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination states
  const [usersPage, setUsersPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingUsersMore, setLoadingUsersMore] = useState(false);

  const [logsPage, setLogsPage] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingLogsMore, setLoadingLogsMore] = useState(false);

  useEffect(() => {
    // Redirection if not admin (handled in routing as well, but good for defense-in-depth)
    if (!user || user.role !== 'admin') {
      return;
    }
    
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, initialUsers, initialLogs] = await Promise.all([
        Database.getAdminStats(),
        Database.getUsers(0, 9), // first 10 items
        Database.getCompletedRooms(0, 9) // first 10 items
      ]);
      setStats(statsData);
      setUsers(initialUsers.users);
      setHasMoreUsers(initialUsers.users.length < initialUsers.total);
      setUsersPage(0);

      setCompletedRooms(initialLogs.rooms);
      setHasMoreLogs(initialLogs.rooms.length < initialLogs.total);
      setLogsPage(0);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreUsers = async () => {
    if (loadingUsersMore) return;
    setLoadingUsersMore(true);
    try {
      const nextPage = usersPage + 1;
      const from = nextPage * 10;
      const to = from + 9;
      const res = await Database.getUsers(from, to);
      if (res.users.length > 0) {
        setUsers(prev => [...prev, ...res.users]);
        setUsersPage(nextPage);
        setHasMoreUsers((users.length + res.users.length) < res.total);
      } else {
        setHasMoreUsers(false);
      }
    } catch (err) {
      console.error('Error loading more users:', err);
    } finally {
      setLoadingUsersMore(false);
    }
  };

  const loadMoreLogs = async () => {
    if (loadingLogsMore) return;
    setLoadingLogsMore(true);
    try {
      const nextPage = logsPage + 1;
      const from = nextPage * 10;
      const to = from + 9;
      const res = await Database.getCompletedRooms(from, to);
      if (res.rooms.length > 0) {
        setCompletedRooms(prev => [...prev, ...res.rooms]);
        setLogsPage(nextPage);
        setHasMoreLogs((completedRooms.length + res.rooms.length) < res.total);
      } else {
        setHasMoreLogs(false);
      }
    } catch (err) {
      console.error('Error loading more logs:', err);
    } finally {
      setLoadingLogsMore(false);
    }
  };

  // Safe Guard view
  if (!user || user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)' }} />
        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Yetkisiz Erişim</span>
        <span style={{ color: 'var(--text-secondary)' }}>Bu panele erişim yetkiniz bulunmamaktadır. Yönlendiriliyorsunuz...</span>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    setNotification(null);
    try {
      const res = await Database.updateUserRole(userId, newRole);
      if (res.success) {
        setNotification({ message: `Kullanıcı rolü başarıyla "${getRoleLabel(newRole)}" olarak güncellendi.`, type: 'success' });
        // Update user locally to preserve pagination and scroll states
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        setNotification({ message: res.message, type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: 'Güncelleme sırasında bir hata oluştu.', type: 'error' });
    } finally {
      setUpdatingUserId(null);
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'jury': return 'Jüri';
      case 'debater': return 'Münazır';
      case 'spectator': return 'Seyirci';
    }
  };

  // Calculations for stats
  const totalUsers = stats.totalUsers;
  const totalMatches = stats.totalMatches;
  const activeRooms = stats.activeRooms;

  // Filter users by name or username or email
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(query) || 
           u.username.toLowerCase().includes(query) ||
           u.email.toLowerCase().includes(query);
  });

  const getWinnerTeam = (result: any) => {
    if (!result || !result.rankings) return 'Bilinmiyor';
    const rankings = result.rankings;
    const winnerEntry = Object.entries(rankings).find(([_, rank]) => rank === 1);
    if (!winnerEntry) return 'Bilinmiyor';
    
    const teamKey = winnerEntry[0];
    switch (teamKey) {
      case 'Opening Government': return 'Hükümet Açılış (HA)';
      case 'Opening Opposition': return 'Muhalefet Açılış (MA)';
      case 'Closing Government': return 'Hükümet Kapanış (HK)';
      case 'Closing Opposition': return 'Muhalefet Kapanış (MK)';
      default: return teamKey;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoString;
    }
  };

  return (
    <main className="container" style={{ padding: '30px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Upper header summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '6px', fontSize: '1.75rem', fontWeight: 700 }}>Yönetici Kontrol Paneli</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Sistem istatistiklerini ve kullanıcı rollerini buradan izleyip yönetebilirsiniz.</p>
        </div>
        {loading && <Loader2 className="animate-spin" size={20} style={{ color: 'var(--color-primary)' }} />}
      </div>

      {/* Alert notification toast */}
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
          transition: 'all 0.3s ease'
        }}>
          {notification.type === 'success' && <Check size={18} style={{ color: 'var(--color-success)' }} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. Statistics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Total Users */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ background: 'var(--color-primary-glow)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>
            <Users size={28} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Kullanıcı</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', color: '#ffffff', marginTop: '4px' }}>
              {loading ? '...' : totalUsers}
            </span>
          </div>
        </div>

        {/* Total Matches */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>
            <Award size={28} style={{ color: 'var(--color-secondary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Maç (Tamamlanan)</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', color: '#ffffff', marginTop: '4px' }}>
              {loading ? '...' : totalMatches}
            </span>
          </div>
        </div>

        {/* Active Rooms */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>
            <Radio size={28} style={{ color: 'var(--color-success)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktif Odalar</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', color: '#ffffff', marginTop: '4px' }}>
              {loading ? '...' : activeRooms}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: User List Table */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Kullanıcı Yönetimi</h2>
            
            {/* Search filter input */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.85rem' }}
                placeholder="Kullanıcı adı, isim veya e-posta ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Kullanıcı</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>E-posta</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Okul / Şehir</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Rol</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--color-primary)' }} />
                      Kullanıcı verileri yükleniyor...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Arama kriterlerine uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="animate-fade-in-row" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                      {/* Name / Username */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{u.fullName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</span>
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>
                      {/* School & City */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem' }}>{u.school}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.city} (Yaş: {u.age})</span>
                        </div>
                      </td>
                      {/* Role drop-down */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            className="input-field"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.8rem', 
                              width: '130px', 
                              background: 'var(--bg-surface-elevated)',
                              borderColor: updatingUserId === u.id ? 'var(--color-primary)' : 'var(--border-color)',
                              cursor: 'pointer'
                            }}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            disabled={updatingUserId !== null}
                          >
                            <option value="admin">Yönetici (Admin)</option>
                            <option value="jury">Jüri (Jury)</option>
                            <option value="debater">Münazır (Debater)</option>
                            <option value="spectator">Seyirci (Spectator)</option>
                          </select>
                          {updatingUserId === u.id && (
                            <Loader2 className="animate-spin" size={14} style={{ color: 'var(--color-primary)' }} />
                          )}
                        </div>
                      </td>
                      {/* Status badge */}
                      <td style={{ padding: '14px 16px' }}>
                        {u.role === 'debater' ? (
                           <span className={`badge ${u.status === 'rookie' ? 'badge-rookie' : 'badge-open'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                             {u.status === 'rookie' ? 'Çaylak' : 'Açık'}
                           </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {hasMoreUsers && !loading && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem' }}
                  onClick={loadMoreUsers}
                  disabled={loadingUsersMore}
                >
                  {loadingUsersMore ? (
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
        </div>

        {/* Right Side: Quick Logs (Hızlı Loglar) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-warning)' }} />
              Hızlı Loglar
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>Tamamlanan son münazara maçlarının sonuçları.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', gridColumn: 'span 2' }}>Yükleniyor...</div>
            ) : completedRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', gridColumn: 'span 2' }}>
                Henüz tamamlanmış bir münazara maçı bulunamadı.
              </div>
            ) : (
              <>
                {completedRooms.map(room => (
                  <div key={room.roomId} className="animate-fade-in-row" style={{
                    padding: '16px',
                    borderRadius: 'var(--border-radius-sm)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{room.roomName}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {formatDate(room.result?.submittedAt)}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{room.motion?.text || 'Bilinmeyen Münazara Konusu'}"
                    </span>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Kazanan Takım:</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        {getWinnerTeam(room.result)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {hasMoreLogs && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: '8px', paddingBottom: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem', width: 'fit-content' }}
                      onClick={loadMoreLogs}
                      disabled={loadingLogsMore}
                    >
                      {loadingLogsMore ? (
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
              </>
            )}
          </div>
        </div>

      </div>

    </main>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import { RoomPage } from './RoomPage';
import { supabase } from '../database/supabaseClient';
import type { RoomState, Motion, DebateStatus, UserRole } from '../types';
import { 
  User as UserIcon, 
  Calendar, 
  Shield, 
  Scale, 
  Mic, 
  Eye, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  ChevronRight
} from 'lucide-react';

interface LobbyPageProps {
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
}

const PRESET_AVATARS = [
  { id: 'preset1', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { id: 'preset2', gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  { id: 'preset3', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { id: 'preset4', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { id: 'preset5', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { id: 'preset6', gradient: 'linear-gradient(135deg, #ec4899, #be185d)' }
];

export const LobbyPage: React.FC<LobbyPageProps> = ({ selectedRoomId, setSelectedRoomId }) => {
  const { user } = useAuth();

  const renderActiveAvatar = () => {
    if (!user) return null;
    const avatar = user.avatarUrl || '';
    if (avatar.startsWith('http')) {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-glow)' }} 
        />
      );
    }
    const preset = PRESET_AVATARS.find(p => p.id === avatar);
    const gradient = preset ? preset.gradient : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))';
    return (
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.25rem',
        color: '#ffffff',
        textTransform: 'uppercase',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
      }}>
        {user.fullName.substring(0, 2)}
      </div>
    );
  };
  
  // Tab states: 'rooms' | 'motions'
  const [activeTab, setActiveTab] = useState<'rooms' | 'motions'>('rooms');
  
  // Data lists
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Pagination limit states
  const [visibleRoomsCount, setVisibleRoomsCount] = useState(6);
  const [visibleMotionsCount, setVisibleMotionsCount] = useState(10);
  
  // Modals visibility
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAddMotionModal, setShowAddMotionModal] = useState(false);

  // Form states for creating a room
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMotionId, setSelectedMotionId] = useState('');
  const [customMotionText, setCustomMotionText] = useState('');
  const [matchMode, setMatchMode] = useState<'physical' | 'online'>('online');
  const [roomError, setRoomError] = useState<string | null>(null);

  // Form states for adding a motion
  const [newMotionText, setNewMotionText] = useState('');
  const [newMotionCategory, setNewMotionCategory] = useState('');
  const [newMotionInfoSlide, setNewMotionInfoSlide] = useState('');
  const [motionError, setMotionError] = useState<string | null>(null);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setVisibleRoomsCount(6);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setVisibleMotionsCount(10);
  }, [searchQuery, categoryFilter]);

  // Load data on init and set up Supabase Realtime subscriptions
  useEffect(() => {
    loadData();

    // Subscribe to changes on rooms and motions tables
    const channel = supabase
      .channel('lobby-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motions' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [roomsData, motionsData] = await Promise.all([
        Database.getRooms(),
        Database.getMotions()
      ]);
      setRooms(roomsData);
      setMotions(motionsData);
    } catch (err) {
      console.error('Error loading lobby data:', err);
    }
  };

  if (!user) return null;

  // Handlers
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !selectedMotionId) {
      setRoomError('Lütfen tüm alanları doldurunuz.');
      return;
    }
    if (selectedMotionId === 'custom' && !customMotionText) {
      setRoomError('Özel münazara konusu metni boş bırakılamaz.');
      return;
    }

    const res = await Database.createRoom(newRoomName, selectedMotionId, customMotionText, matchMode);
    if (res.success) {
      // Clear forms
      setNewRoomName('');
      setSelectedMotionId('');
      setCustomMotionText('');
      setMatchMode('online');
      setRoomError(null);
      setShowCreateRoomModal(false);
      loadData();
    } else {
      setRoomError(res.message);
    }
  };

  const handleAddMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotionText || !newMotionCategory) {
      setMotionError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    const res = await Database.addMotion(newMotionText, newMotionCategory, newMotionInfoSlide);
    if (res.success) {
      setNewMotionText('');
      setNewMotionCategory('');
      setNewMotionInfoSlide('');
      setMotionError(null);
      setShowAddMotionModal(false);
      loadData();
    } else {
      setMotionError(res.message);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('Bu odayı silmek istediğinizden emin misiniz?')) {
      await Database.deleteRoom(roomId);
      loadData();
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    const res = await Database.joinRoom(roomId, user);
    if (res.success) {
      setSelectedRoomId(roomId);
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!user) return;
    await Database.leaveRoom(roomId, user.id);
    setSelectedRoomId(null);
    loadData();
  };

  // Filter lists
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (room.motion && room.motion.text.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMotions = motions.filter(motion => {
    const matchesSearch = motion.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          motion.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || motion.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter
  const categories = Array.from(new Set(motions.map(m => m.category).filter(Boolean)));

  const getStatusLabel = (status: DebateStatus) => {
    switch (status) {
      case 'lobby': return 'Lobi';
      case 'preparation': return 'Hazırlıkta';
      case 'debate': return 'Münazarada';
      case 'scoring': return 'Jüri Oylaması';
      case 'finished': return 'Sonuçlandı';
    }
  };

  const getStatusBadgeClass = (status: DebateStatus) => {
    switch (status) {
      case 'lobby': return 'badge-spectator';
      case 'preparation': return 'badge-jury';
      case 'debate': return 'badge-rookie';
      case 'scoring': return 'badge-jury';
      case 'finished': return 'badge-open';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield size={18} className="text-secondary" />;
      case 'jury': return <Scale size={18} className="text-warning" />;
      case 'debater': return <Mic size={18} className="text-primary" />;
      case 'spectator': return <Eye size={18} className="text-muted" />;
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

  if (selectedRoomId) {
    return (
      <RoomPage 
        roomId={selectedRoomId} 
        onLeave={() => handleLeaveRoom(selectedRoomId)} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Main Content */}
      <main className="container" style={{ flexGrow: 1, padding: '30px 24px' }}>
        <div className="lobby-grid">
            
            {/* Left panel: Active Rooms & Motion Archive */}
            <div className="glass-panel lobby-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Tab selector and Add button row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div className="auth-tabs" style={{ marginBottom: 0, width: 'fit-content' }}>
                  <button 
                    className={`auth-tab ${activeTab === 'rooms' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('rooms');
                      setSearchQuery('');
                    }}
                  >
                    Aktif Münazara Odaları
                  </button>
                  <button 
                    className={`auth-tab ${activeTab === 'motions' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('motions');
                      setSearchQuery('');
                    }}
                  >
                    Konu Arşivi
                  </button>
                </div>

                {activeTab === 'rooms' ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setRoomError(null);
                      setShowCreateRoomModal(true);
                    }}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <Plus size={18} />
                    Oda Oluştur
                  </button>
                ) : (
                  user.role === 'admin' && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        setMotionError(null);
                        setShowAddMotionModal(true);
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <Plus size={18} />
                      Konu Ekle
                    </button>
                  )
                )}
              </div>

              {/* Search & filters box */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                {/* Search input */}
                <div style={{ flexGrow: 1, position: 'relative', minWidth: '200px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '40px' }}
                    placeholder={activeTab === 'rooms' ? 'Oda adı veya konu ara...' : 'Münazara konusu veya kategori ara...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filter selects */}
                {activeTab === 'rooms' ? (
                  <select 
                    className="input-field" 
                    style={{ width: '180px', padding: '8px 12px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="lobby">Lobi (Lobby)</option>
                    <option value="preparation">Hazırlıkta (Prep)</option>
                    <option value="debate">Münazarada (Debate)</option>
                    <option value="scoring">Oylamada (Scoring)</option>
                    <option value="finished">Sonuçlandı</option>
                  </select>
                ) : (
                  <select 
                    className="input-field" 
                    style={{ width: '180px', padding: '8px 12px' }}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">Tüm Kategoriler</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Main List render */}
              {activeTab === 'rooms' ? (
                /* Rooms List */
                <div className="rooms-list">
                  {filteredRooms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                      Eşleşen aktif bir münazara odası bulunamadı.
                    </div>
                  ) : (
                    <>
                      {filteredRooms.slice(0, visibleRoomsCount).map(room => (
                        <div key={room.roomId} className="room-card glass-panel-hover animate-fade-in-row">
                          <div className="room-info" style={{ flexGrow: 1, marginRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="room-name">{room.roomName}</span>
                              <span className={`badge ${getStatusBadgeClass(room.status)}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                                {getStatusLabel(room.status)}
                              </span>
                              <span className={`badge ${room.matchMode === 'physical' ? 'badge-jury' : 'badge-debater'}`} style={{ fontSize: '0.6rem', padding: '2px 8px', textTransform: 'uppercase' }}>
                                {room.matchMode === 'physical' ? 'Fiziksel' : 'Online'}
                              </span>
                            </div>
                            <div className="room-meta" style={{ marginTop: '8px' }}>
                              <span className="motion-tag" style={{ maxWidth: '350px' }}>
                                {room.motion ? room.motion.text : 'Konu belirlenmedi'}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <UserIcon size={14} />
                                {Object.keys(room.participants).length + 1} Kişi
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.role === 'admin' && (
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleDeleteRoom(room.roomId)}
                                style={{ padding: '8px', borderRadius: '4px' }}
                                title="Odayı Kapat"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleJoinRoom(room.roomId)}
                              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            >
                              Odaya Katıl
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredRooms.length > visibleRoomsCount && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem' }}
                            onClick={() => setVisibleRoomsCount(prev => prev + 5)}
                          >
                            Daha Fazla Göster
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Motions List */
                <div className="rooms-list">
                  {filteredMotions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                      Eşleşen münazara konusu bulunamadı.
                    </div>
                  ) : (
                    <>
                      {filteredMotions.slice(0, visibleMotionsCount).map(motion => (
                        <div key={motion.id} className="room-card animate-fade-in-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge badge-debater" style={{ fontSize: '0.65rem' }}>{motion.category || 'Genel'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {motion.id}</span>
                          </div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: '1.05rem', lineHeight: '1.4' }}>
                            {motion.text}
                          </p>
                          {motion.infoSlide && (
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '3px solid var(--color-primary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 600, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--color-primary)' }}>Bilgi Slaytı:</span>
                              {motion.infoSlide}
                            </div>
                          )}
                        </div>
                      ))}

                      {filteredMotions.length > visibleMotionsCount && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '0.8rem' }}
                            onClick={() => setVisibleMotionsCount(prev => prev + 10)}
                          >
                            Daha Fazla Göster
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right panel: User Profile */}
            <div className="glass-panel lobby-panel" style={{ height: 'fit-content' }}>
              <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserIcon size={24} style={{ color: 'var(--color-secondary)' }} />
                Kullanıcı Profili
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {renderActiveAvatar()}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{user.fullName}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{user.username} • {user.email}</span>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kullanıcı Rolü</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getRoleIcon(user.role)}
                      <span className={`badge badge-${user.role}`}>{getRoleLabel(user.role)}</span>
                    </div>
                  </div>

                  {user.role === 'debater' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Münazır Statüsü</span>
                      <span className={`badge badge-${user.status}`}>
                        {user.status === 'rookie' ? 'Çaylak (Rookie)' : 'Açık (Open)'}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Telefon</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.phoneNumber}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Şehir</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.city}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Yaş</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.age}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Okul / Üniversite</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', textAlign: 'right' }}>{user.school}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kayıt Tarihi</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
      </main>

      {/* Modal: Create Debate Room */}
      {showCreateRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Yeni Münazara Odası Oluştur</h2>
              <button className="password-toggle-btn" style={{ position: 'static' }} onClick={() => setShowCreateRoomModal(false)}>
                <X size={20} />
              </button>
            </div>

            {roomError && (
              <div className="auth-error" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem' }}>{roomError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom}>
              <div className="input-group">
                <label className="input-label" htmlFor="room-name">ODA İSMİ</label>
                <input 
                  id="room-name"
                  type="text" 
                  className="input-field" 
                  placeholder="örn. Galatasaray Open - Final"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">MAÇ MODU</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className={`btn ${matchMode === 'physical' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => setMatchMode('physical')}
                  >
                    <span>Fiziksel Maç</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${matchMode === 'online' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => setMatchMode('online')}
                  >
                    <span>Online Maç</span>
                  </button>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {matchMode === 'physical' 
                    ? 'Offline/Lokal mod: Ses/görüntü widgetları ve dijital not defteri devre dışı bırakılır.' 
                    : 'Online/Canlı mod: Sesli iletişim, POI ve dijital not defteri özellikleri aktif kalır.'}
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="room-motion">MÜNAZARA KONUSU</label>
                <select 
                  id="room-motion"
                  className="input-field"
                  value={selectedMotionId}
                  onChange={(e) => setSelectedMotionId(e.target.value)}
                  required
                >
                  <option value="">Lütfen Bir Konu Seçin</option>
                  <option value="custom">[+] Arşiv Dışı Özel Konu Yaz...</option>
                  {motions.map(m => (
                    <option key={m.id} value={m.id}>{`[${m.category}] ${m.text}`}</option>
                  ))}
                </select>
              </div>

              {selectedMotionId === 'custom' && (
                <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <label className="input-label" htmlFor="custom-motion-text">ÖZEL KONU METNİ</label>
                  <textarea 
                    id="custom-motion-text"
                    className="input-field" 
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Bu meclis..."
                    value={customMotionText}
                    onChange={(e) => setCustomMotionText(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateRoomModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Oda Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Motion (Admin Only) */}
      {showAddMotionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '550px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Konu Arşivine Ekle</h2>
              <button className="password-toggle-btn" style={{ position: 'static' }} onClick={() => setShowAddMotionModal(false)}>
                <X size={20} />
              </button>
            </div>

            {motionError && (
              <div className="auth-error" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem' }}>{motionError}</span>
              </div>
            )}

            <form onSubmit={handleAddMotion}>
              <div className="input-group">
                <label className="input-label" htmlFor="motion-text">MÜNAZARA KONUSU (MOTION)</label>
                <textarea 
                  id="motion-text"
                  className="input-field" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Bu meclis..."
                  value={newMotionText}
                  onChange={(e) => setNewMotionText(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="motion-category">KATEGORİ</label>
                <input 
                  id="motion-category"
                  type="text" 
                  className="input-field" 
                  placeholder="örn. Ekonomi, Teknoloji, Çevre, Politika"
                  value={newMotionCategory}
                  onChange={(e) => setNewMotionCategory(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="motion-infoslide">BİLGİ SLAYTI (İsteğe Bağlı)</label>
                <textarea 
                  id="motion-infoslide"
                  className="input-field" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Konuyla ilgili ön bilgi veya bağlam..."
                  value={newMotionInfoSlide}
                  onChange={(e) => setNewMotionInfoSlide(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMotionModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Arşive Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

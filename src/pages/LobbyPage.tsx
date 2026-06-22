import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import { RoomPage } from './RoomPage';
import type { RoomState, Motion, DebateStatus, UserRole } from '../types';
import { 
  LogOut, 
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

export const LobbyPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Tab states: 'rooms' | 'motions'
  const [activeTab, setActiveTab] = useState<'rooms' | 'motions'>('rooms');
  
  // Data lists
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modals visibility
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAddMotionModal, setShowAddMotionModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Form states for creating a room
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMotionId, setSelectedMotionId] = useState('');
  const [customMotionText, setCustomMotionText] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);

  // Form states for adding a motion
  const [newMotionText, setNewMotionText] = useState('');
  const [newMotionCategory, setNewMotionCategory] = useState('');
  const [newMotionInfoSlide, setNewMotionInfoSlide] = useState('');
  const [motionError, setMotionError] = useState<string | null>(null);

  // Load data on init and set up polling for live simulation
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setRooms(Database.getRooms());
    setMotions(Database.getMotions());
  };

  if (!user) return null;

  // Handlers
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !selectedMotionId) {
      setRoomError('Lütfen tüm alanları doldurunuz.');
      return;
    }
    if (selectedMotionId === 'custom' && !customMotionText) {
      setRoomError('Özel münazara konusu metni boş bırakılamaz.');
      return;
    }

    const res = Database.createRoom(newRoomName, selectedMotionId, customMotionText);
    if (res.success) {
      // Clear forms
      setNewRoomName('');
      setSelectedMotionId('');
      setCustomMotionText('');
      setRoomError(null);
      setShowCreateRoomModal(false);
      loadData();
    } else {
      setRoomError(res.message);
    }
  };

  const handleAddMotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotionText || !newMotionCategory) {
      setMotionError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    const res = Database.addMotion(newMotionText, newMotionCategory, newMotionInfoSlide);
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

  const handleDeleteRoom = (roomId: string) => {
    if (window.confirm('Bu odayı silmek istediğinizden emin misiniz?')) {
      Database.deleteRoom(roomId);
      loadData();
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!user) return;
    const res = Database.joinRoom(roomId, user);
    if (res.success) {
      setSelectedRoomId(roomId);
      loadData();
    } else {
      alert(res.message);
    }
  };

  const handleLeaveRoom = (roomId: string) => {
    if (!user) return;
    Database.leaveRoom(roomId, user.id);
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

  // Find currently active room
  const activeRoom = rooms.find(r => r.roomId === selectedRoomId);

  if (activeRoom) {
    return (
      <RoomPage 
        roomId={activeRoom.roomId} 
        onLeave={() => handleLeaveRoom(activeRoom.roomId)} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header">
        <div className="container header-content">
          <div className="logo-text">
            <span>PARLA</span>
          </div>
          <div className="header-user-info">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Hoş geldin, <strong>{user.username}</strong>
            </span>
            <button className="btn btn-secondary" onClick={logout} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              <LogOut size={16} />
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ flexGrow: 1, padding: '30px 24px' }}>
          /* Normal Lobby View */
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
                    filteredRooms.map(room => (
                      <div key={room.roomId} className="room-card glass-panel-hover">
                        <div className="room-info" style={{ flexGrow: 1, marginRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="room-name">{room.roomName}</span>
                            <span className={`badge ${getStatusBadgeClass(room.status)}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                              {getStatusLabel(room.status)}
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
                    ))
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
                    filteredMotions.map(motion => (
                      <div key={motion.id} className="room-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
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
                    ))
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
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                    textTransform: 'uppercase'
                  }}>
                    {user.fullName.substring(0, 2)}
                  </div>
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

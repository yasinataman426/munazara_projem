import type { User, UserRole, DebaterStatus, Motion, RoomState } from '../types';

const USERS_KEY = 'parla_users';
const CURRENT_USER_KEY = 'parla_current_user';
const MOTIONS_KEY = 'parla_motions';
const ROOMS_KEY = 'parla_rooms';

const DEFAULT_MOTIONS: Motion[] = [
  {
    id: 'm1',
    text: 'Bu meclis yapay zeka gelişimini sınırlandırır.',
    category: 'Teknoloji',
    infoSlide: 'Yapay zeka modellerinin son yıllardaki logaritmik hızdaki gelişimi ve otomasyonun iş gücü piyasalarına etkisi göz önüne alınmalıdır.'
  },
  {
    id: 'm2',
    text: 'Bu meclis sosyal medyanın anonim olmasını yasaklar.',
    category: 'Toplum & Teknoloji',
    infoSlide: 'Sosyal medya platformlarında kimlik doğrulaması zorunlu hale getirilerek sahte hesapların ve siber zorbalığın önüne geçilmesi amaçlanmaktadır.'
  },
  {
    id: 'm3',
    text: 'Bu meclis tüm vergileri tek bir karbon vergisiyle değiştirir.',
    category: 'Ekonomi & Çevre',
    infoSlide: 'Mevcut gelir ve kurumlar vergisi gibi tüm dolaylı/dolaysız vergiler kaldırılarak sadece karbon salınımı üzerinden vergilendirme yapılacaktır.'
  },
  {
    id: 'm4',
    text: 'Bu meclis yargıçların yerine yapay zeka karar vericilerinin kullanılmasını destekler.',
    category: 'Hukuk & Adalet',
    infoSlide: 'AI yargıç sistemleri, insan yargıçların sahip olabileceği bilinçaltı önyargılardan arındırılmış ve milyonlarca içtihadı anında analiz edebilen sistemlerdir.'
  },
  {
    id: 'm5',
    text: 'Bu meclis asgari ücret uygulamasını kaldırıp evrensel temel geliri getirir.',
    category: 'Ekonomi',
    infoSlide: 'Her vatandaşa çalışıp çalışmadığına bakılmaksızın devlet tarafından düzenli ve koşulsuz bir asgari geçim ödeneği sağlanacaktır.'
  }
];

const DEFAULT_ROOMS = (): RoomState[] => [
  {
    roomId: 'r1',
    roomName: 'Uludağ Kupası - Yarı Final A',
    status: 'preparation',
    motion: DEFAULT_MOTIONS[0],
    isMotionReleased: false,
    areSpectatorVotesReleased: false,
    prepStartedAt: Date.now() - 300000,
    activeSpeaker: null,
    timer: { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null },
    activePoi: null,
    spectatorVotes: [],
    result: null,
    participants: {
      'p1': { id: 'p1', username: 'jury_ali', role: 'jury', status: null, joinedAt: Date.now(), isMuted: false },
      'p2': { id: 'p2', username: 'deb_berk', role: 'debater', status: 'open', joinedAt: Date.now(), isMuted: false }
    }
  },
  {
    roomId: 'r2',
    roomName: 'Ege Open Münazara Şampiyonası',
    status: 'lobby',
    motion: DEFAULT_MOTIONS[2],
    isMotionReleased: false,
    areSpectatorVotesReleased: false,
    prepStartedAt: null,
    activeSpeaker: null,
    timer: { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null },
    activePoi: null,
    spectatorVotes: [],
    result: null,
    participants: {
      'p3': { id: 'p3', username: 'jury_ayse', role: 'jury', status: null, joinedAt: Date.now(), isMuted: false }
    }
  },
  {
    roomId: 'r3',
    roomName: 'Parla Haftalık Gösteri Maçı',
    status: 'debate',
    motion: DEFAULT_MOTIONS[3],
    isMotionReleased: true,
    areSpectatorVotesReleased: false,
    prepStartedAt: Date.now() - 1000000,
    activeSpeaker: 'PM',
    timer: { status: 'running', elapsedSeconds: 240, startedAt: Date.now() - 240000, pausedAt: null },
    activePoi: null,
    spectatorVotes: [
      { userId: 'u100', username: 'spectator_can', team: 'HA', timestamp: Date.now() }
    ],
    result: null,
    participants: {
      'p4': { id: 'p4', username: 'jury_mehmet', role: 'jury', status: null, joinedAt: Date.now(), isMuted: false }
    }
  }
];

export class Database {
  // Get all registered users
  static getUsers(): User[] {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // Register a new user
  static register(
    username: string, 
    fullName: string, 
    phoneNumber: string, 
    email: string, 
    password: string,
    city: string, 
    age: number, 
    school: string, 
    role: UserRole, 
    status: DebaterStatus
  ): { success: boolean; message: string; user?: User } {
    const users = this.getUsers();
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Bu e-posta adresi zaten kayıtlı.' };
    }

    // Check if username already exists
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Bu kullanıcı adı zaten alınmış.' };
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      username,
      fullName,
      phoneNumber,
      email,
      password,
      city,
      age,
      school,
      role,
      status: role === 'debater' ? status : null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    return { success: true, message: 'Kayıt başarılı.', user: newUser };
  }

  // Login a user
  static login(email: string, password?: string): { success: boolean; message: string; user?: User } {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, message: 'Kullanıcı bulunamadı. Lütfen kayıt olun.' };
    }

    if (user.password && user.password !== password) {
      return { success: false, message: 'Hatalı şifre. Lütfen tekrar deneyin.' };
    }

    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, message: 'Giriş başarılı.', user };
  }

  // Get current logged in user
  static getCurrentUser(): User | null {
    const data = sessionStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Logout current user
  static logout(): void {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  }

  // Get all motions
  static getMotions(): Motion[] {
    const data = localStorage.getItem(MOTIONS_KEY);
    if (!data) {
      localStorage.setItem(MOTIONS_KEY, JSON.stringify(DEFAULT_MOTIONS));
      return DEFAULT_MOTIONS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_MOTIONS;
    }
  }

  // Add a motion to archive
  static addMotion(text: string, category: string, infoSlide?: string): { success: boolean; message: string; motion?: Motion } {
    const motions = this.getMotions();
    
    if (motions.some(m => m.text.toLowerCase() === text.toLowerCase())) {
      return { success: false, message: 'Bu münazara konusu zaten arşivde mevcut.' };
    }

    const newMotion: Motion = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      text,
      category,
      infoSlide
    };

    motions.push(newMotion);
    localStorage.setItem(MOTIONS_KEY, JSON.stringify(motions));
    return { success: true, message: 'Konu başarıyla arşive eklendi.', motion: newMotion };
  }

  // Get all active rooms
  static getRooms(): RoomState[] {
    const data = localStorage.getItem(ROOMS_KEY);
    if (!data) {
      const defaultRooms = DEFAULT_ROOMS();
      localStorage.setItem(ROOMS_KEY, JSON.stringify(defaultRooms));
      return defaultRooms;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_ROOMS();
    }
  }

  // Create a new debate room
  static createRoom(roomName: string, motionId: string, customMotionText?: string): { success: boolean; message: string; room?: RoomState } {
    const rooms = this.getRooms();

    if (rooms.some(r => r.roomName.toLowerCase() === roomName.toLowerCase() && r.status !== 'finished')) {
      return { success: false, message: 'Bu isimde aktif bir oda zaten var.' };
    }

    let motion: Motion | null = null;
    if (motionId === 'custom' && customMotionText) {
      motion = {
        id: 'm_custom_' + Math.random().toString(36).substring(2, 9),
        text: customMotionText,
        category: 'Özel Konu'
      };
    } else {
      const motions = this.getMotions();
      motion = motions.find(m => m.id === motionId) || null;
    }

    const newRoom: RoomState = {
      roomId: 'r_' + Math.random().toString(36).substring(2, 9),
      roomName,
      status: 'lobby',
      motion,
      isMotionReleased: false,
      areSpectatorVotesReleased: false,
      prepStartedAt: null,
      activeSpeaker: null,
      timer: { status: 'idle', elapsedSeconds: 0, startedAt: null, pausedAt: null },
      activePoi: null,
      spectatorVotes: [],
      result: null,
      participants: {}
    };

    rooms.push(newRoom);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    return { success: true, message: 'Münazara odası başarıyla oluşturuldu.', room: newRoom };
  }

  // Delete/close a room
  static deleteRoom(roomId: string): { success: boolean; message: string } {
    let rooms = this.getRooms();
    if (!rooms.some(r => r.roomId === roomId)) {
      return { success: false, message: 'Oda bulunamadı.' };
    }
    rooms = rooms.filter(r => r.roomId !== roomId);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    return { success: true, message: 'Oda başarıyla kapatıldı.' };
  }

  // Join a room (add participant)
  static joinRoom(roomId: string, user: User): { success: boolean; message: string; room?: RoomState } {
    const rooms = this.getRooms();
    const roomIndex = rooms.findIndex(r => r.roomId === roomId);
    if (roomIndex === -1) {
      return { success: false, message: 'Oda bulunamadı.' };
    }

    const room = rooms[roomIndex];
    
    // Add current user to participants list if not already there
    if (!room.participants[user.id]) {
      room.participants[user.id] = {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        isMuted: false,
        joinedAt: Date.now()
      };
      rooms[roomIndex] = room;
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    }

    return { success: true, message: 'Odaya başarıyla katıldınız.', room };
  }

  // Leave a room (remove participant)
  static leaveRoom(roomId: string, userId: string): { success: boolean; message: string; room?: RoomState } {
    const rooms = this.getRooms();
    const roomIndex = rooms.findIndex(r => r.roomId === roomId);
    if (roomIndex === -1) {
      return { success: false, message: 'Oda bulunamadı.' };
    }

    const room = rooms[roomIndex];
    if (room.participants[userId]) {
      delete room.participants[userId];
      rooms[roomIndex] = room;
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    }

    return { success: true, message: 'Odadan başarıyla ayrıldınız.', room };
  }

  // Update a room dynamically
  static updateRoom(roomId: string, updateFn: (room: RoomState) => void): { success: boolean; message: string; room?: RoomState } {
    const rooms = this.getRooms();
    const roomIndex = rooms.findIndex(r => r.roomId === roomId);
    if (roomIndex === -1) {
      return { success: false, message: 'Oda bulunamadı.' };
    }

    const room = rooms[roomIndex];
    updateFn(room);
    rooms[roomIndex] = room;
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    return { success: true, message: 'Oda başarıyla güncellendi.', room };
  }
}

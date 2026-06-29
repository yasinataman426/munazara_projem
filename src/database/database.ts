import type { User, UserRole, DebaterStatus, Motion, RoomState, DebateResult } from '../types';
import { supabase } from './supabaseClient';

const CURRENT_USER_KEY = 'kursu_current_user';

// --- Database Schema Mapping Helpers ---

function mapToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    fullName: dbUser.full_name,
    phoneNumber: dbUser.phone_number,
    email: dbUser.email,
    password: dbUser.password,
    city: dbUser.city,
    age: Number(dbUser.age),
    school: dbUser.school,
    role: dbUser.role as UserRole,
    status: dbUser.status as DebaterStatus,
    createdAt: dbUser.created_at,
    isVerified: localStorage.getItem(`kursu_verified_${dbUser.id}`) === 'true',
    avatarUrl: localStorage.getItem(`kursu_avatar_${dbUser.id}`) || ''
  };
}

function mapToDbUser(user: User): any {
  return {
    id: user.id,
    username: user.username,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    email: user.email,
    password: user.password,
    city: user.city,
    age: user.age,
    school: user.school,
    role: user.role,
    status: user.status,
    created_at: user.createdAt
  };
}

function mapToMotion(dbMotion: any): Motion {
  return {
    id: dbMotion.id,
    text: dbMotion.text,
    category: dbMotion.category,
    infoSlide: dbMotion.info_slide
  };
}

function mapToDbMotion(motion: Motion): any {
  return {
    id: motion.id,
    text: motion.text,
    category: motion.category,
    info_slide: motion.infoSlide
  };
}

export function mapToRoomState(dbRoom: any): RoomState {
  return {
    roomId: dbRoom.room_id,
    roomName: dbRoom.room_name,
    status: dbRoom.status,
    motion: dbRoom.motion,
    isMotionReleased: dbRoom.is_motion_released,
    areSpectatorVotesReleased: dbRoom.are_spectator_votes_released,
    prepStartedAt: dbRoom.prep_started_at ? Number(dbRoom.prep_started_at) : null,
    activeSpeaker: dbRoom.active_speaker,
    timer: dbRoom.timer,
    activePoi: dbRoom.active_poi,
    spectatorVotes: dbRoom.spectator_votes || [],
    result: dbRoom.result,
    participants: dbRoom.participants || {},
    matchMode: dbRoom.timer?.matchMode || 'online'
  };
}

function mapToDbRoom(room: RoomState): any {
  return {
    room_id: room.roomId,
    room_name: room.roomName,
    status: room.status,
    motion: room.motion,
    is_motion_released: room.isMotionReleased,
    are_spectator_votes_released: room.areSpectatorVotesReleased,
    prep_started_at: room.prepStartedAt,
    active_speaker: room.activeSpeaker,
    timer: {
      ...room.timer,
      matchMode: room.matchMode || 'online'
    },
    active_poi: room.activePoi,
    spectator_votes: room.spectatorVotes,
    result: room.result,
    participants: room.participants
  };
}

// --- Database Operations Wrapper ---

export class Database {
  // Get all registered users (with optional range pagination, LIFO order)
  static async getUsers(from?: number, to?: number): Promise<{ users: User[]; total: number }> {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (from !== undefined && to !== undefined) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error || !data) {
      console.error('Error fetching users:', error);
      return { users: [], total: 0 };
    }
    return { users: data.map(mapToUser), total: count || 0 };
  }

  // Register a new user
  static async register(
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
  ): Promise<{ success: boolean; message: string; code?: string; user?: User }> {
    try {
      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        return { success: false, code: 'auth/email-already-in-use', message: 'Bu e-posta adresi zaten kullanımda, lütfen giriş yapmayı deneyin.' };
      }

      // Check if username already exists
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUsername) {
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

      const { error } = await supabase
        .from('users')
        .insert([mapToDbUser(newUser)]);

      if (error) {
        return { success: false, message: 'Kayıt sırasında bir hata oluştu: ' + error.message };
      }

      return { success: true, message: 'Kayıt başarılı.', user: newUser };
    } catch (err: any) {
      return { success: false, message: 'Kayıt hatası: ' + err.message };
    }
  }

  // Login a user
  static async login(emailOrUsername: string, password?: string): Promise<{ success: boolean; message: string; code?: string; user?: User }> {
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
        .maybeSingle();

      if (error) {
        console.error('Login database error:', error);
        return { success: false, message: 'Veritabanı hatası: ' + error.message };
      }

      if (!dbUser) {
        return { success: false, code: 'auth/user-not-found', message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.' };
      }

      const user = mapToUser(dbUser);

      if (user.password && user.password !== password) {
        return { success: false, code: 'auth/wrong-password', message: 'Girdiğiniz şifre hatalı, lütfen tekrar deneyin.' };
      }

      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true, message: 'Giriş başarılı.', user };
    } catch (err: any) {
      return { success: false, message: 'Giriş hatası: ' + err.message };
    }
  }

  // Get current logged in user (synchronous from session storage)
  static getCurrentUser(): User | null {
    const data = sessionStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Logout current user (synchronous local session clearing)
  static logout(): void {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  }

  // Get all motions
  static async getMotions(): Promise<Motion[]> {
    const { data, error } = await supabase
      .from('motions')
      .select('*');

    if (error || !data) {
      console.error('Error fetching motions:', error);
      return [];
    }
    return data.map(mapToMotion);
  }

  // Add a motion to archive
  static async addMotion(text: string, category: string, infoSlide?: string): Promise<{ success: boolean; message: string; motion?: Motion }> {
    try {
      // Check duplicate
      const { data: existing } = await supabase
        .from('motions')
        .select('id')
        .eq('text', text)
        .maybeSingle();

      if (existing) {
        return { success: false, message: 'Bu münazara konusu zaten arşivde mevcut.' };
      }

      const newMotion: Motion = {
        id: 'm_' + Math.random().toString(36).substring(2, 9),
        text,
        category,
        infoSlide
      };

      const { error } = await supabase
        .from('motions')
        .insert([mapToDbMotion(newMotion)]);

      if (error) {
        return { success: false, message: 'Konu arşive eklenirken hata oluştu: ' + error.message };
      }

      return { success: true, message: 'Konu başarıyla arşive eklendi.', motion: newMotion };
    } catch (err: any) {
      return { success: false, message: 'Konu ekleme hatası: ' + err.message };
    }
  }

  // Get all active rooms (LIFO order)
  static async getRooms(): Promise<RoomState[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching rooms sorted by created_at, using fallback query:', error.message);
      // Fallback query if created_at column is missing from database schema
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('rooms')
        .select('*');

      if (fallbackError || !fallbackData) {
        console.error('Fallback error fetching rooms:', fallbackError);
        return [];
      }
      return fallbackData.map(mapToRoomState);
    }
    return data ? data.map(mapToRoomState) : [];
  }

  // Get completed rooms (finished matches) with pagination and LIFO sorting (result->>submittedAt desc)
  static async getCompletedRooms(from?: number, to?: number): Promise<{ rooms: RoomState[]; total: number }> {
    let query = supabase
      .from('rooms')
      .select('*', { count: 'exact' })
      .eq('status', 'finished')
      .order('result->>submittedAt', { ascending: false });

    if (from !== undefined && to !== undefined) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error || !data) {
      console.error('Error fetching completed rooms:', error);
      return { rooms: [], total: 0 };
    }
    return { rooms: data.map(mapToRoomState), total: count || 0 };
  }

  // Get all completed rooms for a specific user (unpaginated, for stats calculation)
  static async getAllUserCompletedRooms(userId: string): Promise<RoomState[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'finished')
      .filter('participants', 'has_key', userId);

    if (error || !data) {
      console.error('Error fetching all user completed rooms:', error);
      return [];
    }
    return data.map(mapToRoomState);
  }

  // Get user matches with pagination and LIFO sorting
  static async getUserMatches(
    userId: string, 
    role: 'debater' | 'jury', 
    from: number, 
    to: number
  ): Promise<{ rooms: RoomState[]; total: number }> {
    const { data, error, count } = await supabase
      .from('rooms')
      .select('*', { count: 'exact' })
      .eq('status', 'finished')
      .eq(`participants->${userId}->>role`, role)
      .order('result->>submittedAt', { ascending: false })
      .range(from, to);

    if (error || !data) {
      console.error('Error fetching user matches:', error);
      return { rooms: [], total: 0 };
    }
    return { rooms: data.map(mapToRoomState), total: count || 0 };
  }

  // Get database counts for admin stats (highly optimized head: true counts)
  static async getAdminStats(): Promise<{ totalUsers: number; totalMatches: number; activeRooms: number }> {
    const [usersCount, matchesCount, activeRoomsCount] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('rooms').select('room_id', { count: 'exact', head: true }).eq('status', 'finished'),
      supabase.from('rooms').select('room_id', { count: 'exact', head: true }).neq('status', 'finished')
    ]);

    return {
      totalUsers: usersCount.count || 0,
      totalMatches: matchesCount.count || 0,
      activeRooms: activeRoomsCount.count || 0
    };
  }

  // Create a new debate room
  static async createRoom(roomName: string, motionId: string, customMotionText?: string, matchMode: 'physical' | 'online' = 'online'): Promise<{ success: boolean; message: string; room?: RoomState }> {
    try {
      // Check if active room name already exists
      const { data: existing } = await supabase
        .from('rooms')
        .select('room_id')
        .eq('room_name', roomName)
        .neq('status', 'finished')
        .maybeSingle();

      if (existing) {
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
        const { data: dbMotion } = await supabase
          .from('motions')
          .select('*')
          .eq('id', motionId)
          .maybeSingle();
        motion = dbMotion ? mapToMotion(dbMotion) : null;
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
        participants: {},
        matchMode
      };

      const { error } = await supabase
        .from('rooms')
        .insert([mapToDbRoom(newRoom)]);

      if (error) {
        return { success: false, message: 'Oda oluşturulurken hata oluştu: ' + error.message };
      }

      return { success: true, message: 'Münazara odası başarıyla oluşturuldu.', room: newRoom };
    } catch (err: any) {
      return { success: false, message: 'Oda oluşturma hatası: ' + err.message };
    }
  }

  // Delete/close a room
  static async deleteRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('room_id', roomId);

      if (error) {
        return { success: false, message: 'Oda kapatılırken hata oluştu: ' + error.message };
      }
      return { success: true, message: 'Oda başarıyla kapatıldı.' };
    } catch (err: any) {
      return { success: false, message: 'Oda silme hatası: ' + err.message };
    }
  }

  // Join a room (add participant)
  static async joinRoom(roomId: string, user: User): Promise<{ success: boolean; message: string; room?: RoomState }> {
    return this.updateRoom(roomId, (room) => {
      if (!room.participants[user.id]) {
        room.participants[user.id] = {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          isMuted: false,
          joinedAt: Date.now()
        };
      }
    });
  }

  // Leave a room (remove participant)
  static async leaveRoom(roomId: string, userId: string): Promise<{ success: boolean; message: string; room?: RoomState }> {
    return this.updateRoom(roomId, (room) => {
      if (room.participants[userId]) {
        delete room.participants[userId];
      }
    });
  }

  // Update a room dynamically
  static async updateRoom(roomId: string, updateFn: (room: RoomState) => void): Promise<{ success: boolean; message: string; room?: RoomState }> {
    try {
      const { data: dbRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (fetchError || !dbRoom) {
        return { success: false, message: 'Oda bulunamadı.' };
      }

      const room = mapToRoomState(dbRoom);
      
      // Perform user mutation callback
      updateFn(room);

      const dbPayload = mapToDbRoom(room);
      const { error: updateError } = await supabase
        .from('rooms')
        .update(dbPayload)
        .eq('room_id', roomId);

      if (updateError) {
        return { success: false, message: 'Oda güncellenemedi: ' + updateError.message };
      }

      return { success: true, message: 'Oda başarıyla güncellendi.', room };
    } catch (err: any) {
      return { success: false, message: 'Oda güncelleme hatası: ' + err.message };
    }
  }

  // Update debate result and set status to finished
  static async updateDebateResult(
    roomId: string,
    result: DebateResult,
    releaseVotes: boolean
  ): Promise<{ success: boolean; message: string; room?: RoomState }> {
    return this.updateRoom(roomId, (r) => {
      r.result = result;
      r.areSpectatorVotesReleased = releaseVotes;
      r.status = 'finished';
    });
  }

  // Update a user's role and handle status constraints
  static async updateUserRole(userId: string, newRole: UserRole): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const updateData: any = { role: newRole };
      if (newRole !== 'debater') {
        updateData.status = null;
      } else {
        updateData.status = 'open'; // default status for debaters
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        return { success: false, message: 'Kullanıcı rolü güncellenirken hata oluştu: ' + error.message };
      }

      const user = dbUser ? mapToUser(dbUser) : undefined;

      // If the updated user is the current logged-in user, update session storage
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId && user) {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      }

      return { success: true, message: 'Kullanıcı rolü başarıyla güncellendi.', user };
    } catch (err: any) {
      return { success: false, message: 'Rol güncelleme hatası: ' + err.message };
    }
  }

  // Update a user's profile and save custom fields in localStorage
  static async updateUserProfile(
    userId: string, 
    profileData: { 
      fullName: string; 
      phoneNumber: string; 
      city: string; 
      school: string; 
      age: number;
      password?: string;
      avatarUrl?: string;
      isVerified?: boolean;
    }
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const dbPayload: any = {
        full_name: profileData.fullName,
        phone_number: profileData.phoneNumber,
        city: profileData.city,
        school: profileData.school,
        age: profileData.age,
      };

      if (profileData.password) {
        dbPayload.password = profileData.password;
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        return { success: false, message: 'Profil güncellenirken veritabanı hatası oluştu: ' + error.message };
      }

      // Handle custom local fields
      if (profileData.avatarUrl !== undefined) {
        localStorage.setItem(`kursu_avatar_${userId}`, profileData.avatarUrl);
      }
      if (profileData.isVerified !== undefined) {
        localStorage.setItem(`kursu_verified_${userId}`, String(profileData.isVerified));
      }

      const user = dbUser ? mapToUser(dbUser) : undefined;
      if (user) {
        // Update local session storage if it is the current user
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        }
      }

      return { success: true, message: 'Profil başarıyla güncellendi.', user };
    } catch (err: any) {
      return { success: false, message: 'Profil güncelleme hatası: ' + err.message };
    }
  }
}

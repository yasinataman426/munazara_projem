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
    createdAt: dbUser.created_at
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
  // Get all registered users
  static async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error || !data) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data.map(mapToUser);
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
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        return { success: false, message: 'Bu e-posta adresi zaten kayıtlı.' };
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
  static async login(emailOrUsername: string, password?: string): Promise<{ success: boolean; message: string; user?: User }> {
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
        return { success: false, message: 'Kullanıcı bulunamadı. Lütfen kayıt olun.' };
      }

      const user = mapToUser(dbUser);

      if (user.password && user.password !== password) {
        return { success: false, message: 'Hatalı şifre. Lütfen tekrar deneyin.' };
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

  // Get all active rooms
  static async getRooms(): Promise<RoomState[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*');

    if (error || !data) {
      console.error('Error fetching rooms:', error);
      return [];
    }
    return data.map(mapToRoomState);
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
}

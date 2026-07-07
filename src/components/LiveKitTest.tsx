import  { useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

export default function LiveKitTest() {
  const [room, setRoom] = useState('test-room');
  const [username, setUsername] = useState('user-' + Math.floor(Math.random() * 1000));
  const [token, setToken] = useState('');

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  const joinRoom = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/token?room=${room}&username=${username}`);
      if (!response.ok) {
        throw new Error('Token alınamadı, API hata döndü.');
      }
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error('Token fetch hatası:', error);
      alert('Token alınamadı. Lütfen arka plan (Express) sunucusunun http://localhost:3001 adresinde çalıştığından emin olun.');
    }
  };

  if (!token) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
        <h2>LiveKit Odasına Katıl</h2>
        <label>
          Oda Adı:
          <input 
            type="text" 
            value={room} 
            onChange={(e) => setRoom(e.target.value)} 
            placeholder="Oda Adı"
            style={{ padding: '0.5rem', width: '100%', marginTop: '0.2rem' }}
          />
        </label>
        <label>
          Kullanıcı Adı:
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Kullanıcı Adı"
            style={{ padding: '0.5rem', width: '100%', marginTop: '0.2rem' }}
          />
        </label>
        <button onClick={joinRoom} style={{ padding: '0.5rem 1rem', cursor: 'pointer', marginTop: '1rem' }}>
          Odaya Katıl (Token Al)
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => setToken('')} style={{ padding: '0.5rem', width: '150px', margin: '1rem' }}>
        Çıkış Yap
      </button>
      
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        data-lk-theme="default"
        style={{ height: '100%', flex: 1 }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

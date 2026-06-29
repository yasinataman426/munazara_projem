import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { Navbar } from './components/Navbar';
import { Database } from './database/database';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Initialize default view: admin goes to admin dashboard, others go to lobby
  const [currentPage, setCurrentPage] = useState<'lobby' | 'profile' | 'admin'>(() => {
    const currentUser = Database.getCurrentUser();
    return currentUser?.role === 'admin' ? 'admin' : 'lobby';
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // Track login state transition to route users appropriately
  const [prevUserId, setPrevUserId] = useState<string | null>(() => Database.getCurrentUser()?.id || null);

  useEffect(() => {
    if (user) {
      if (user.id !== prevUserId) {
        // Successful login transition
        setCurrentPage(user.role === 'admin' ? 'admin' : 'lobby');
      } else if (user.role !== 'admin' && currentPage === 'admin') {
        // Enforce admin dashboard block
        setCurrentPage('lobby');
      }
      setPrevUserId(user.id);
    } else {
      setPrevUserId(null);
      setCurrentPage('lobby');
    }
  }, [user, currentPage, prevUserId]);

  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          gap: '16px',
          background: 'var(--bg-main)' 
        }}
      >
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
          Yükleniyor...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // If user is inside an active match/room, hide navbar to preserve 100vh fullscreen layout
  if (selectedRoomId) {
    return (
      <LobbyPage 
        selectedRoomId={selectedRoomId} 
        setSelectedRoomId={setSelectedRoomId} 
      />
    );
  }

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === 'lobby' ? (
        <LobbyPage 
          selectedRoomId={selectedRoomId} 
          setSelectedRoomId={setSelectedRoomId} 
        />
      ) : currentPage === 'profile' ? (
        <ProfilePage />
      ) : (
        <AdminDashboard />
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

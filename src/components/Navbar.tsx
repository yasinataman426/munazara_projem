import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, LayoutDashboard, Home, User as UserIcon } from 'lucide-react';
import { RostrumLogo } from './RostrumLogo';

interface NavbarProps {
  currentPage: 'lobby' | 'profile' | 'admin';
  setCurrentPage: (page: 'lobby' | 'profile' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const renderUserAvatar = () => {
    if (user.avatarUrl && user.avatarUrl.startsWith('http')) {
      return (
        <img 
          src={user.avatarUrl} 
          alt={user.username} 
          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} 
        />
      );
    }
    
    // Use gradient preset based on avatarUrl or fallback to default
    const presetGradients: Record<string, string> = {
      preset1: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
      preset2: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Purple
      preset3: 'linear-gradient(135deg, #10b981, #047857)', // Green
      preset4: 'linear-gradient(135deg, #f59e0b, #b45309)', // Orange
      preset5: 'linear-gradient(135deg, #ef4444, #b91c1c)', // Red
      preset6: 'linear-gradient(135deg, #ec4899, #be185d)'  // Pink
    };
    
    const gradient = presetGradients[user.avatarUrl || ''] || 'linear-gradient(135deg, #64748b, #475569)';
    
    return (
      <div style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#ffffff',
        textTransform: 'uppercase',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {user.username.charAt(0)}
      </div>
    );
  };

  return (
    <header className="main-header" style={{ width: '100%' }}>
      <div className="container header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left Side: Logo */}
        <div 
          className="logo-text" 
          onClick={() => setCurrentPage('lobby')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RostrumLogo size={22} />
          <span>KÜRSÜ</span>
        </div>

        {/* Center: Navigation Links */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentPage('lobby')}
            className="btn"
            style={{
              background: currentPage === 'lobby' ? 'var(--color-primary-glow)' : 'transparent',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.85rem',
              color: currentPage === 'lobby' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: currentPage === 'lobby' ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            <Home size={15} />
            Lobi
          </button>

          <button
            onClick={() => setCurrentPage('profile')}
            className="btn"
            style={{
              background: currentPage === 'profile' ? 'var(--color-primary-glow)' : 'transparent',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.85rem',
              color: currentPage === 'profile' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: currentPage === 'profile' ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            <UserIcon size={15} />
            Profil
          </button>
          
          {user.role === 'admin' && (
            <button
              onClick={() => setCurrentPage('admin')}
              className="btn"
              style={{
                background: currentPage === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.85rem',
                color: currentPage === 'admin' ? 'var(--color-secondary)' : 'var(--text-secondary)',
                fontWeight: currentPage === 'admin' ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                borderRadius: 'var(--border-radius-sm)'
              }}
            >
              <LayoutDashboard size={15} />
              Admin Panel
            </button>
          )}
        </nav>

        {/* Right Side: User Profile & Logout */}
        <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => setCurrentPage('profile')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: currentPage === 'profile' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.03)', 
              padding: '6px 12px', 
              borderRadius: 'var(--border-radius-sm)', 
              border: currentPage === 'profile' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {renderUserAvatar()}
            {user.role === 'admin' && (
              <Shield size={12} style={{ color: 'var(--color-secondary)' }} />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {user.username}
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={logout} 
            style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={14} />
            Çıkış Yap
          </button>
        </div>
      </div>
    </header>
  );
};

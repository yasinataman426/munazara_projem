import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, DebaterStatus } from '../types';
import { 
  Shield, 
  Scale, 
  Mic, 
  Eye, 
  EyeOff,
  Loader2, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  
  // Tab states: 'login' | 'register'
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Form input states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('debater');
  const [debaterStatus, setDebaterStatus] = useState<DebaterStatus>('rookie');
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('E-posta adresi gereklidir.');
      return;
    }
    if (!loginPassword) {
      setError('Şifre gereklidir.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await login(email, loginPassword);
      if (!res.success) {
        setError(res.message);
      }
    } catch {
      setError('Giriş yapılırken beklenmedik bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !phoneNumber || !email || !registerPassword || !city || !age || !school) {
      setError('Tüm alanları doldurmanız gerekmektedir.');
      return;
    }

    const ageNumber = parseInt(age, 10);
    if (isNaN(ageNumber) || ageNumber <= 0) {
      setError('Geçerli bir yaş değeri giriniz.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await register(
        username,
        fullName,
        phoneNumber,
        email,
        registerPassword,
        city,
        ageNumber,
        school,
        selectedRole,
        selectedRole === 'debater' ? debaterStatus : null
      );
      if (!res.success) {
        setError(res.message);
      }
    } catch {
      setError('Kayıt oluşturulurken beklenmedik bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const rolesList: { role: UserRole; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      role: 'debater',
      title: 'Münazır',
      desc: 'Maç odasına katılıp konuşma yapar ve soru isteyebilir.',
      icon: <Mic className="role-card-icon" size={24} />
    },
    {
      role: 'jury',
      title: 'Jüri',
      desc: 'Maç odasını yönetir, süreyi kontrol eder ve sonuçları girer.',
      icon: <Scale className="role-card-icon" size={24} />
    },
    {
      role: 'spectator',
      title: 'Seyirci',
      desc: 'Maçı canlı izler, anketlere katılır. Sesi zorunlu kapalıdır.',
      icon: <Eye className="role-card-icon" size={24} />
    },
    {
      role: 'admin',
      title: 'Admin',
      desc: 'Sistem genelini ve münazara konu havuzunu yönetir.',
      icon: <Shield className="role-card-icon" size={24} />
    }
  ];

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel pulse-border">
        
        <div className="auth-header">
          <div className="logo-text" style={{ fontSize: '2.2rem', justifyContent: 'center', marginBottom: '16px' }}>
            <Sparkles size={28} style={{ color: '#60a5fa' }} />
            PARLA
          </div>
          <p className="auth-subtitle">
            {tab === 'login' 
              ? 'Hesabınıza giriş yapın ve kürsüye çıkın' 
              : 'Profilinizi oluşturun ve münazaraya katılın'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            disabled={isLoading}
          >
            Giriş Yap
          </button>
          <button 
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            disabled={isLoading}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form elements */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">E-POSTA ADRESİ</label>
              <input 
                id="login-email"
                type="email" 
                className="input-field" 
                placeholder="ornek@parlamunazara.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="login-password">ŞİFRE</label>
              <div className="password-input-container">
                <input 
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"} 
                  className="input-field" 
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  Platforma Giriş Yap
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-fullname">AD SOYAD</label>
                <input 
                  id="register-fullname"
                  type="text" 
                  className="input-field" 
                  placeholder="Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-username">KULLANICI ADI (NICKNAME)</label>
                <input 
                  id="register-username"
                  type="text" 
                  className="input-field" 
                  placeholder="munazir_ahmet"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-email">E-POSTA ADRESİ</label>
                <input 
                  id="register-email"
                  type="email" 
                  className="input-field" 
                  placeholder="ornek@parlamunazara.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-phone">TELEFON NUMARASI</label>
                <input 
                  id="register-phone"
                  type="tel" 
                  className="input-field" 
                  placeholder="0555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-city">ŞEHİR</label>
                <input 
                  id="register-city"
                  type="text" 
                  className="input-field" 
                  placeholder="İstanbul"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-age">YAŞ</label>
                <input 
                  id="register-age"
                  type="number" 
                  className="input-field" 
                  placeholder="20"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-school">OKUL / ÜNİVERSİTE</label>
                <input 
                  id="register-school"
                  type="text" 
                  className="input-field" 
                  placeholder="Galatasaray Üniversitesi"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-password">ŞİFRE</label>
                <div className="password-input-container">
                  <input 
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"} 
                    className="input-field" 
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">PLATFORM ROLÜ</label>
              <div className="role-selector">
                {rolesList.map((item) => (
                  <div 
                    key={item.role}
                    className={`role-card ${selectedRole === item.role ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(item.role)}
                  >
                    {item.icon}
                    <span className="role-card-title">{item.title}</span>
                    <span className="role-card-desc">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Debater specific fields */}
            {selectedRole === 'debater' && (
              <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                <label className="input-label">MÜNAZIR STATÜSÜ</label>
                <div className="debater-status-selector">
                  <div 
                    className={`debater-status-option rookie ${debaterStatus === 'rookie' ? 'selected' : ''}`}
                    onClick={() => setDebaterStatus('rookie')}
                  >
                    <span className="badge badge-rookie" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>Çaylak</span>
                    <span>Rookie</span>
                  </div>
                  <div 
                    className={`debater-status-option open ${debaterStatus === 'open' ? 'selected' : ''}`}
                    onClick={() => setDebaterStatus('open')}
                  >
                    <span className="badge badge-open" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>Open</span>
                    <span>Açık</span>
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Kayıt Yapılıyor...
                </>
              ) : (
                <>
                  Hesap Oluştur ve Giriş Yap
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Parla Münazara Platformu &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

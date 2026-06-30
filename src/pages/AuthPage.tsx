import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, DebaterStatus } from '../types';
import { 
  Mic, 
  Eye,
  EyeOff,
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { RostrumLogo } from '../components/RostrumLogo';

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
  const selectedRole: UserRole = 'debater';
  const [debaterStatus, setDebaterStatus] = useState<DebaterStatus>('rookie');
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError(null);
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      setEmailError('Geçersiz e-posta formatı.');
    } else {
      setEmailError(null);
    }
  };

  const validateFullName = (val: string) => {
    if (!val) {
      setNameError(null);
      return;
    }
    const trimmed = val.trim();
    if (!trimmed.includes(' ') || trimmed.split(' ').filter(Boolean).length < 2) {
      setNameError('Lütfen ad ve soyadınızı aralarında boşluk olacak şekilde girin.');
    } else {
      setNameError(null);
    }
  };

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
        if (res.code === 'auth/user-not-found' || res.message.includes('bulunamadı')) {
          setError('Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.');
        } else if (res.code === 'auth/wrong-password' || res.message.includes('şifre') || res.message.includes('Hatalı')) {
          setError('Girdiğiniz şifre hatalı, lütfen tekrar deneyin.');
        } else {
          setError(res.message);
        }
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

    if (nameError || emailError) {
      setError('Lütfen formdaki hataları düzelterek tekrar deneyin.');
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
        if (res.code === 'auth/email-already-in-use' || res.message.includes('kullanımda') || res.message.includes('kayıtlı')) {
          setError('Bu e-posta adresi zaten kullanımda, lütfen giriş yapmayı deneyin.');
        } else {
          setError(res.message);
        }
      }
    } catch {
      setError('Kayıt oluşturulurken beklenmedik bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-card glass-panel pulse-border">
        
        <div className="auth-header">
          <div className="logo-text" style={{ fontSize: '2.2rem', justifyContent: 'center', marginBottom: '16px', gap: '12px' }}>
            <RostrumLogo size={40} />
            KÜRSÜ
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
                placeholder="ornek@kursumunazara.com"
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
                  onChange={(e) => {
                    setFullName(e.target.value);
                    validateFullName(e.target.value);
                  }}
                  disabled={isLoading}
                  required
                />
                {nameError && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {nameError}
                  </span>
                )}
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
                  placeholder="ornek@kursumunazara.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  disabled={isLoading}
                  required
                />
                {emailError && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {emailError}
                  </span>
                )}
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
          Kürsü Münazara Platformu &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

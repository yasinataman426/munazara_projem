import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, DebaterStatus } from '../types';
import { 

  Eye,
  EyeOff,
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { RostrumLogo } from '../components/RostrumLogo';
import * as yup from 'yup';

const loginSchema = yup.object().shape({
  email: yup.string().email('Geçersiz e-posta formatı.').required('E-posta adresi gereklidir.'),
  password: yup.string().required('Şifre gereklidir.')
});

const registerSchema = yup.object().shape({
  fullName: yup.string()
    .test('has-space', 'Lütfen ad ve soyadınızı aralarında boşluk olacak şekilde girin.', (value) => {
      if (!value) return false;
      const trimmed = value.trim();
      return trimmed.includes(' ') && trimmed.split(' ').filter(Boolean).length >= 2;
    })
    .required('Ad Soyad gereklidir.'),
  username: yup.string().required('Kullanıcı adı gereklidir.'),
  email: yup.string().email('Geçersiz e-posta formatı.').required('E-posta adresi gereklidir.'),
  phoneNumber: yup.string().required('Telefon numarası gereklidir.'),
  city: yup.string().required('Şehir gereklidir.'),
  age: yup.number().typeError('Geçerli bir yaş değeri giriniz.').positive('Yaş pozitif olmalıdır.').required('Yaş gereklidir.'),
  school: yup.string().required('Okul / Üniversite gereklidir.'),
  password: yup.string().min(6, 'Şifre en az 6 karakter olmalıdır.').required('Şifre gereklidir.')
});

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);

    try {
      await loginSchema.validate({ email, password: loginPassword }, { abortEarly: false });
    } catch (err: any) {
      if (err instanceof yup.ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach(innerErr => {
          if (innerErr.path) errors[innerErr.path] = innerErr.message;
        });
        setValidationErrors(errors);
        return;
      }
    }

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
    setValidationErrors({});
    setError(null);

    try {
      await registerSchema.validate({
        fullName, username, email, phoneNumber, city, age: age ? Number(age) : undefined, school, password: registerPassword
      }, { abortEarly: false });
    } catch (err: any) {
      if (err instanceof yup.ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach(innerErr => {
          if (innerErr.path) errors[innerErr.path] = innerErr.message;
        });
        setValidationErrors(errors);
        setError('Lütfen formdaki hataları düzelterek tekrar deneyin.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await register(
        username,
        fullName,
        phoneNumber,
        email,
        registerPassword,
        city,
        Number(age),
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
              setValidationErrors({});
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
              setValidationErrors({});
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
                type="text" 
                className={`input-field ${validationErrors.email ? 'error' : ''}`} 
                placeholder="ornek@kursumunazara.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setValidationErrors(prev => ({...prev, email: ''})) }}
                disabled={isLoading}
              />
              {validationErrors.email && (
                <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  {validationErrors.email}
                </span>
              )}
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="login-password">ŞİFRE</label>
              <div className="password-input-container">
                <input 
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"} 
                  className={`input-field ${validationErrors.password ? 'error' : ''}`} 
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setValidationErrors(prev => ({...prev, password: ''})) }}
                  disabled={isLoading}
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
              {validationErrors.password && (
                <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  {validationErrors.password}
                </span>
              )}
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
                  className={`input-field ${validationErrors.fullName ? 'error' : ''}`} 
                  placeholder="Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setValidationErrors(prev => ({...prev, fullName: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.fullName && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.fullName}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-username">KULLANICI ADI (NICKNAME)</label>
                <input 
                  id="register-username"
                  type="text" 
                  className={`input-field ${validationErrors.username ? 'error' : ''}`} 
                  placeholder="munazir_ahmet"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setValidationErrors(prev => ({...prev, username: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.username && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.username}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-email">E-POSTA ADRESİ</label>
                <input 
                  id="register-email"
                  type="text" 
                  className={`input-field ${validationErrors.email ? 'error' : ''}`} 
                  placeholder="ornek@kursumunazara.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setValidationErrors(prev => ({...prev, email: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.email}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-phone">TELEFON NUMARASI</label>
                <input 
                  id="register-phone"
                  type="tel" 
                  className={`input-field ${validationErrors.phoneNumber ? 'error' : ''}`} 
                  placeholder="0555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setValidationErrors(prev => ({...prev, phoneNumber: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.phoneNumber && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.phoneNumber}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-city">ŞEHİR</label>
                <input 
                  id="register-city"
                  type="text" 
                  className={`input-field ${validationErrors.city ? 'error' : ''}`} 
                  placeholder="İstanbul"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setValidationErrors(prev => ({...prev, city: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.city && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.city}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-age">YAŞ</label>
                <input 
                  id="register-age"
                  type="text" 
                  className={`input-field ${validationErrors.age ? 'error' : ''}`} 
                  placeholder="20"
                  value={age}
                  onChange={(e) => { setAge(e.target.value); setValidationErrors(prev => ({...prev, age: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.age && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.age}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="register-school">OKUL / ÜNİVERSİTE</label>
                <input 
                  id="register-school"
                  type="text" 
                  className={`input-field ${validationErrors.school ? 'error' : ''}`} 
                  placeholder="Galatasaray Üniversitesi"
                  value={school}
                  onChange={(e) => { setSchool(e.target.value); setValidationErrors(prev => ({...prev, school: ''})) }}
                  disabled={isLoading}
                />
                {validationErrors.school && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.school}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="register-password">ŞİFRE</label>
                <div className="password-input-container">
                  <input 
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"} 
                    className={`input-field ${validationErrors.password ? 'error' : ''}`} 
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => { setRegisterPassword(e.target.value); setValidationErrors(prev => ({...prev, password: ''})) }}
                    disabled={isLoading}
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
                {validationErrors.password && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {validationErrors.password}
                  </span>
                )}
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

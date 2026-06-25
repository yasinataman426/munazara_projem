import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database } from '../database/database';
import type { RoomState, SpeakerRole, DebateResult } from '../types';
import { Award, FileText, Check, AlertTriangle, ShieldAlert } from 'lucide-react';

interface JuryPanelProps {
  roomId: string;
  onClose: () => void;
  onSuccess: (updatedRoom: RoomState) => void;
  matchMode?: 'physical' | 'online';
}

const SPEAKER_ORDER: SpeakerRole[] = ['PM', 'LO', 'DPM', 'DLO', 'MG', 'MO', 'GW', 'OW'];

const SPEAKER_DETAILS: Record<SpeakerRole, { name: string; team: string; side: 'Gov' | 'Opp' }> = {
  PM: { name: 'Başbakan (PM)', team: 'Opening Government', side: 'Gov' },
  DPM: { name: 'Başbakan Yardımcısı (DPM)', team: 'Opening Government', side: 'Gov' },
  LO: { name: 'Muhalefet Lideri (LO)', team: 'Opening Opposition', side: 'Opp' },
  DLO: { name: 'M. Lideri Yardımcısı (DLO)', team: 'Opening Opposition', side: 'Opp' },
  MG: { name: 'Hükümet Üyesi (MG)', team: 'Closing Government', side: 'Gov' },
  GW: { name: 'Hükümet Kamçısı (GW)', team: 'Closing Government', side: 'Gov' },
  MO: { name: 'Muhalefet Üyesi (MO)', team: 'Closing Opposition', side: 'Opp' },
  OW: { name: 'Muhalefet Kamçısı (OW)', team: 'Closing Opposition', side: 'Opp' },
};

type BPTeam = 'Opening Government' | 'Opening Opposition' | 'Closing Government' | 'Closing Opposition';

const TEAM_CODES: Record<BPTeam, string> = {
  'Opening Government': 'OG (Hükümet Açılış)',
  'Opening Opposition': 'OO (Muhalefet Açılış)',
  'Closing Government': 'CG (Hükümet Kapanış)',
  'Closing Opposition': 'CO (Muhalefet Kapanış)'
};

export const JuryPanel: React.FC<JuryPanelProps> = ({ roomId, onClose, onSuccess, matchMode }) => {
  const { user } = useAuth();
  
  // 1. Authorization check
  if (!user || user.role !== 'jury') {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <ShieldAlert size={48} className="text-danger" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.4rem', color: 'var(--color-danger)', marginBottom: '8px' }}>Erişim Engellendi</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Değerlendirme ve puanlama paneline erişim yetkiniz bulunmamaktadır. Bu alanı sadece maçın yetkilendirilmiş <strong>Jürisi</strong> görüntüleyebilir.
        </p>
      </div>
    );
  }

  // State initialization
  const [rankings, setRankings] = useState<Record<BPTeam, number>>({
    'Opening Government': 1,
    'Opening Opposition': 2,
    'Closing Government': 3,
    'Closing Opposition': 4,
  });

  const [speakerPoints, setSpeakerPoints] = useState<Record<SpeakerRole, string>>(() => {
    try {
      const saved = localStorage.getItem(`kursu_draft_scores_${roomId}`);
      return saved ? JSON.parse(saved) : {
        PM: '75', DPM: '75',
        LO: '75', DLO: '75',
        MG: '75', GW: '75',
        MO: '75', OW: '75'
      };
    } catch {
      return {
        PM: '75', DPM: '75',
        LO: '75', DLO: '75',
        MG: '75', GW: '75',
        MO: '75', OW: '75'
      };
    }
  });

  const [juryNotes, setJuryNotes] = useState(() => {
    return localStorage.getItem(`kursu_draft_notes_${roomId}`) || '';
  });
  const [releaseVotes, setReleaseVotes] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate team scores
  const getTeamTotal = (team: BPTeam): number => {
    switch (team) {
      case 'Opening Government':
        return (parseInt(speakerPoints.PM, 10) || 0) + (parseInt(speakerPoints.DPM, 10) || 0);
      case 'Opening Opposition':
        return (parseInt(speakerPoints.LO, 10) || 0) + (parseInt(speakerPoints.DLO, 10) || 0);
      case 'Closing Government':
        return (parseInt(speakerPoints.MG, 10) || 0) + (parseInt(speakerPoints.GW, 10) || 0);
      case 'Closing Opposition':
        return (parseInt(speakerPoints.MO, 10) || 0) + (parseInt(speakerPoints.OW, 10) || 0);
      default:
        return 0;
    }
  };

  // BP Format Rule Validation (Rank-to-Score Consistency check)
  useEffect(() => {
    // Validate unique rankings
    const ranks = Object.values(rankings);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== 4) {
      setValidationWarning('Sıralama Hatası: Her takıma benzersiz bir derece (1., 2., 3., 4.) verilmelidir.');
      return;
    }

    // Map ranks to team score totals
    const rankScores = Object.entries(rankings).map(([team, rank]) => ({
      team: team as BPTeam,
      rank,
      totalScore: getTeamTotal(team as BPTeam)
    }));

    // Sort by rank ascending (1st place first)
    rankScores.sort((a, b) => a.rank - b.rank);

    // Rule: R1 Total >= R2 Total >= R3 Total >= R4 Total
    let ruleViolated = false;
    let details = '';
    for (let i = 0; i < rankScores.length - 1; i++) {
      const current = rankScores[i];
      const next = rankScores[i + 1];
      if (current.totalScore < next.totalScore) {
        ruleViolated = true;
        details = `BP Kural Uyarısı: ${current.rank}. sıradaki ${TEAM_CODES[current.team]} takımı (${current.totalScore} Puan), ${next.rank}. sıradaki ${TEAM_CODES[next.team]} takımından (${next.totalScore} Puan) daha düşük puan alamaz!`;
        break;
      }
    }

    if (ruleViolated) {
      setValidationWarning(details);
    } else {
      setValidationWarning(null);
    }
  }, [rankings, speakerPoints]);

  const handleSpeakerPointChange = (role: SpeakerRole, value: string) => {
    setSpeakerPoints(prev => ({
      ...prev,
      [role]: value
    }));
  };

  const handleRankingChange = (team: BPTeam, rankVal: number) => {
    setRankings(prev => ({
      ...prev,
      [team]: rankVal
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validation check for duplicate rankings
    const values = Object.values(rankings);
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== 4) {
      setErrorMsg('Lütfen her takıma benzersiz bir sıralama (1., 2., 3., 4.) atayınız.');
      return;
    }

    // 2. Validate speaker score ranges (1-100)
    const pointsMap: Record<SpeakerRole, number> = {} as any;
    for (const role of SPEAKER_ORDER) {
      const val = parseInt(speakerPoints[role], 10);
      if (isNaN(val) || val < 1 || val > 100) {
        setErrorMsg(`Lütfen ${SPEAKER_DETAILS[role].name} için 1 ile 100 arasında geçerli bir puan giriniz.`);
        return;
      }
      pointsMap[role] = val;
    }

    // 3. Strict BP warning check
    if (validationWarning) {
      const confirmSubmit = window.confirm(
        `${validationWarning}\n\nResmi BP formatı kural setini ihlal ediyorsunuz. Yine de puanlamayı kaydetmek istiyor musunuz?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);

    const isPhysical = matchMode === 'physical';
    const results: DebateResult = {
      rankings: rankings as any,
      speakerPoints: pointsMap,
      juryNotes: isPhysical ? '' : juryNotes,
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await Database.updateDebateResult(roomId, results, isPhysical ? true : releaseVotes);
      if (res.success && res.room) {
        onSuccess(res.room);
      } else {
        setErrorMsg(res.message || 'Puanlama kaydedilirken bir veritabanı hatası oluştu.');
      }
    } catch (err: any) {
      setErrorMsg('Beklenmedik bir hata oluştu: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
        <Award size={28} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Resmi Değerlendirme Formu</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İngiliz Parlamentosu (BP) Formatı</span>
        </div>
      </div>

      {errorMsg && (
        <div className="auth-error" style={{ marginBottom: '0' }}>
          <ShieldAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {validationWarning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-warning)' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{validationWarning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Teams Scoring grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {(['Opening Government', 'Opening Opposition', 'Closing Government', 'Closing Opposition'] as const).map(team => {
            const isGov = team.includes('Government');
            
            // Map team to speaker roles
            let role1: SpeakerRole, role2: SpeakerRole;
            if (team === 'Opening Government') { role1 = 'PM'; role2 = 'DPM'; }
            else if (team === 'Opening Opposition') { role1 = 'LO'; role2 = 'DLO'; }
            else if (team === 'Closing Government') { role1 = 'MG'; role2 = 'GW'; }
            else { role1 = 'MO'; role2 = 'OW'; }

            return (
              <div key={team} className={`slim-bench-row`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {/* Team Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isGov ? 'var(--color-primary)' : 'var(--color-secondary)' }}>
                      {TEAM_CODES[team]}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Toplam Konuşmacı Puanı: <strong style={{ color: 'var(--text-primary)' }}>{getTeamTotal(team)}</strong>
                    </span>
                  </div>

                  {/* Rank Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>SIRA:</label>
                    <select
                      className="input-field"
                      style={{ width: '80px', padding: '4px 8px', fontSize: '0.8rem' }}
                      value={rankings[team]}
                      onChange={(e) => handleRankingChange(team, parseInt(e.target.value, 10))}
                    >
                      <option value={1}>1. (Birinci)</option>
                      <option value={2}>2. (İkinci)</option>
                      <option value={3}>3. (Üçüncü)</option>
                      <option value={4}>4. (Dördüncü)</option>
                    </select>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0' }} />

                {/* Speakers inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{SPEAKER_DETAILS[role1].name}</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="input-field"
                      style={{ width: '70px', textAlign: 'center', padding: '6px' }}
                      value={speakerPoints[role1]}
                      onChange={(e) => handleSpeakerPointChange(role1, e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{SPEAKER_DETAILS[role2].name}</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="input-field"
                      style={{ width: '70px', textAlign: 'center', padding: '6px' }}
                      value={speakerPoints[role2]}
                      onChange={(e) => handleSpeakerPointChange(role2, e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Jury notes */}
        {matchMode !== 'physical' && (
          <div className="input-group">
            <label className="input-label" htmlFor="jury-notes" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> JÜRİ GEREKÇELİ KARAR NOTLARI
            </label>
            <textarea
              id="jury-notes"
              className="input-field"
              style={{ minHeight: '90px', resize: 'vertical' }}
              placeholder="Maçın sonucunun gerekçeli kararı, argüman analizleri ve jüri geri bildirimleri..."
              value={juryNotes}
              onChange={(e) => setJuryNotes(e.target.value)}
            />
          </div>
        )}

        {/* Release Spectator votes Checkbox */}
        {matchMode !== 'physical' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="release-votes"
              type="checkbox"
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              checked={releaseVotes}
              onChange={(e) => setReleaseVotes(e.target.checked)}
            />
            <label htmlFor="release-votes" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Seyirci oylarını ve sonuçları salona anında yayınla
            </label>
          </div>
        )}

        {/* Form controls buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            İptal
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (matchMode === 'physical' ? 'Yayınlanıyor...' : 'Kaydediliyor...') : (
              <>
                <Check size={16} /> {matchMode === 'physical' ? 'Sıralamayı Yayınla' : 'Puanlamayı Kaydet ve Bitir'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

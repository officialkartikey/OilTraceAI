import { useDashboard } from '@/context/DashboardContext';

export default function CandidateVesselsList() {
  const { selectedVessel, setSelectedVessel } = useDashboard();

  const candidates = [
    { rank: '01', name: 'Oceanic Pride', type: '(LR)', imo: '987654321', score: 0.91, color: 'var(--accent-red)' },
    { rank: '02', name: 'Sea Voyager', type: '(PA)', imo: '123456789', score: 0.82, color: 'var(--accent-orange)' },
    { rank: '03', name: 'Global Trader', type: '(MH)', imo: '456789123', score: 0.65, color: 'var(--accent-yellow)' },
    { rank: '04', name: 'Pacific Pearl', type: '(SG)', imo: '789123456', score: 0.45, color: 'var(--accent-green)' },
  ];

  return (
    <div className="tactical-panel" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Top Candidate Vessels
        </h3>
        <a href="#" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>View All</a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {candidates.map((v) => {
          const isSelected = selectedVessel === v.imo;
          return (
            <div 
              key={v.rank} 
              onClick={() => setSelectedVessel(isSelected ? null : v.imo)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseOut={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div className="tactical-text" style={{ color: v.color, width: '24px', fontWeight: 600 }}>{v.rank}</div>
              
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{v.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.type}</span>
              </div>
              
              <div className="tactical-text" style={{ color: 'var(--text-secondary)', marginRight: '24px' }}>
                IMO: {v.imo}
              </div>
              
              <div style={{ textAlign: 'right', minWidth: '40px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>Score</div>
                <div className="tactical-text" style={{ color: v.color, fontWeight: 600, fontSize: '14px' }}>
                  {v.score.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

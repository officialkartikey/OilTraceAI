import { useInvestigation } from '@/context/InvestigationContext';

export default function CandidateVesselsList() {
  const { data, selectedVessel, setSelectedVessel } = useInvestigation();
  
  const suspects = data?.candidates || [];

  return (
    <div className="tactical-panel" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Top Candidate Vessels
        </h3>
        <a href="#" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>View All</a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
        {suspects.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
            No suspects identified yet.
          </div>
        )}
        
        {suspects.map((v, index) => {
          const imoStr = String(v.mmsi);
          const isSelected = selectedVessel === imoStr;
          const score = v.score || 0;
          
          let color = 'var(--accent-green)';
          if (score > 0.8) color = 'var(--accent-red)';
          else if (score > 0.6) color = 'var(--accent-orange)';
          else if (score > 0.4) color = 'var(--accent-yellow)';

          return (
            <div 
              key={imoStr} 
              onClick={() => setSelectedVessel(isSelected ? null : imoStr)}
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
              <div className="tactical-text" style={{ color: color, width: '24px', fontWeight: 600 }}>
                {String(index + 1).padStart(2, '0')}
              </div>
              
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Suspect {imoStr}</span>
              </div>
              
              <div className="tactical-text" style={{ color: 'var(--text-secondary)', marginRight: '24px' }}>
                MMSI: {imoStr}
              </div>
              
              <div style={{ textAlign: 'right', minWidth: '40px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>Score</div>
                <div className="tactical-text" style={{ color: color, fontWeight: 600, fontSize: '14px' }}>
                  {score.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { CheckCircle2, XCircle, Lock, Circle, RefreshCw } from 'lucide-react';
import { useInvestigation } from '@/context/InvestigationContext';

export default function InvestigationPipeline() {
  const { data } = useInvestigation();
  if (!data) return null;

  const invStatus = data.investigation.status;
  const isFailed = invStatus === 'FAILED';
  
  const observation = data.observation;
  const timestamp = observation?.timestamp ? new Date(observation.timestamp) : new Date();
  const dateStr = timestamp.toUTCString().replace('GMT', 'UTC');

  const steps = [
    {
      id: 'observation',
      title: 'Observation Ingest',
      status: 'AVAILABLE',
      icon: CheckCircle2,
      color: 'var(--accent-cyan)',
      content: `${observation?.sensor || 'Unknown'} | ${dateStr}`
    },
    {
      id: 'detection',
      title: 'ML Detection',
      status: isFailed ? 'FAILED' : (invStatus === 'COMPLETED' ? 'COMPLETED' : 'WAITING'),
      icon: isFailed ? XCircle : (invStatus === 'COMPLETED' ? CheckCircle2 : RefreshCw),
      color: isFailed ? 'var(--accent-red)' : (invStatus === 'COMPLETED' ? 'var(--accent-cyan)' : 'var(--text-muted)'),
      content: isFailed ? 'Process terminated unexpectedly' : (invStatus === 'COMPLETED' ? 'Slick Identified' : 'Running inference...'),
      badge: isFailed ? 'ERR_CVD_TIMEOUT' : ''
    },
    {
      id: 'reconstruction',
      title: 'Kinematic Reconstruction',
      status: isFailed ? 'WAITING' : (invStatus === 'COMPLETED' ? 'COMPLETED' : 'WAITING'),
      icon: invStatus === 'COMPLETED' ? CheckCircle2 : Lock,
      color: invStatus === 'COMPLETED' ? 'var(--accent-cyan)' : 'var(--text-muted)',
      content: isFailed ? 'Requires successful detection' : (invStatus === 'COMPLETED' ? 'Trajectory Computed' : 'Awaiting inputs')
    },
    {
      id: 'attribution',
      title: 'AIS Correlation',
      status: isFailed ? 'WAITING' : (invStatus === 'COMPLETED' ? 'COMPLETED' : 'WAITING'),
      icon: invStatus === 'COMPLETED' ? CheckCircle2 : Lock,
      color: invStatus === 'COMPLETED' ? 'var(--accent-cyan)' : 'var(--text-muted)',
      content: isFailed ? '0 Candidates identified' : (invStatus === 'COMPLETED' ? `${data.candidates?.length || 0} Candidates Found` : 'Awaiting inputs')
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
        Investigation Pipeline
      </h2>
      
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Vertical track line */}
        <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '0', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', zIndex: 1 }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isErrorState = step.status === 'FAILED';
            return (
              <div key={step.id} style={{ display: 'flex', gap: '16px' }}>
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} color={step.color} />
                </div>
                
                <div style={{ 
                  flex: 1, 
                  border: `1px solid ${isErrorState ? 'rgba(244, 67, 54, 0.4)' : 'transparent'}`,
                  background: isErrorState ? 'rgba(244, 67, 54, 0.05)' : 'transparent',
                  padding: isErrorState ? '12px' : '0',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: step.color }}>
                      {step.status}
                    </div>
                    {step.badge && (
                      <div style={{ fontSize: '9px', background: 'rgba(244,67,54,0.1)', color: 'var(--accent-red)', padding: '2px 4px', borderRadius: '2px' }}>
                        {step.badge}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {step.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

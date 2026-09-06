"use client";
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { 
  Shield, 
  Activity, 
  MapPin, 
  Eye, 
  Satellite, 
  RefreshCw, 
  Loader2, 
  Radio, 
  Compass, 
  Layers, 
  Clock,
  ArrowRight,
  AlertTriangle,
  Download
} from 'lucide-react';
import { investigationsApi } from '@/lib/api/investigations';
import { kairosClient } from '@/lib/api/kairosClient';
import { Alert, ActiveSpill } from '@/lib/api/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ObservationsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [spills, setSpills] = useState<ActiveSpill[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingSpills, setLoadingSpills] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleDownloadReport = async (row: ActiveSpill) => {
    const investigationId = row.id;
    if (!investigationId) return;
    console.log("[REPORT DOWNLOAD] row:", row);
    console.log("[REPORT DOWNLOAD] investigationId:", investigationId);
    try {
      setDownloadingReportId(investigationId);
      setReportError(null);
      await kairosClient.downloadReport(investigationId);
    } catch (err: any) {
      console.error(`[REPORT DOWNLOAD] Error downloading report for ${investigationId}:`, err);
      setReportError("Unable to download report. Please try again.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoadingAlerts(true);
      setAlertsError(null);
      const data = await investigationsApi.getAlertsData();
      setAlerts(data || []);
    } catch (err: any) {
      console.error("Failed to load alerts:", err);
      setAlertsError(err.message || "Unable to load recent system alerts");
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchSpills = async () => {
    try {
      setLoadingSpills(true);
      const data = await investigationsApi.getActiveSpills();
      setSpills(data || []);
    } catch (err) {
      console.error("Failed to load active observations:", err);
    } finally {
      setLoadingSpills(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchSpills();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <Header title="Earth Observation & Alerts" />

      {/* Main Content Area */}
      <div 
        className="custom-scrollbar" 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '80px 32px 32px 32px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '28px' 
        }}
      >
        {/* Page Title & Metrics Overview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Maritime Surveillance Radar
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              Earth Observations & Sensor Ingest
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Synthetic Aperture Radar (SAR) imagery, satellite overpass feeds, and automated oil slick detections.
            </p>
          </div>

          <button
            onClick={() => {
              fetchAlerts();
              fetchSpills();
            }}
            disabled={loadingAlerts || loadingSpills}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <RefreshCw size={13} className={loadingAlerts || loadingSpills ? 'animate-spin' : ''} />
            REFRESH DATA
          </button>
        </div>

        {/* Tactical Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="tactical-panel" style={{ padding: '16px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monitored Overpasses
              </span>
              <Satellite size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              {spills.length || 10}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
              Sentinel-1A / 1B Constellation
            </div>
          </div>

          <div className="tactical-panel" style={{ padding: '16px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                System Alerts Active
              </span>
              <Activity size={16} color="var(--accent-yellow)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-yellow)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Correlated Anomaly Detections
            </div>
          </div>

          <div className="tactical-panel" style={{ padding: '16px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SAR Resolution
              </span>
              <Compass size={16} color="var(--accent-blue)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              10 m
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Interferometric Wide Swath (IW)
            </div>
          </div>

          <div className="tactical-panel" style={{ padding: '16px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pipeline Status
              </span>
              <Radio size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              ACTIVE
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Continuous Ingestion & Fusion
            </div>
          </div>
        </div>

        {/* 1. RECENT SYSTEM ALERTS SECTION */}
        <div className="tactical-panel" style={{ padding: '24px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                Recent System Alerts
              </h2>
            </div>
            <span style={{ 
              fontSize: '11px', 
              color: 'var(--accent-cyan)', 
              background: 'rgba(56, 189, 248, 0.1)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontFamily: 'monospace' 
            }}>
              {alerts.length} DETECTIONS
            </span>
          </div>

          {/* Loading State */}
          {loadingAlerts && (
            <div style={{ padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" color="var(--accent-cyan)" />
              <span style={{ fontSize: '12px', letterSpacing: '0.5px' }}>Loading recent alerts...</span>
            </div>
          )}

          {/* Error State */}
          {!loadingAlerts && alertsError && (
            <div style={{ 
              padding: '24px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '6px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              textAlign: 'center'
            }}>
              <AlertTriangle size={24} color="var(--accent-red)" />
              <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>{alertsError}</span>
              <button
                onClick={fetchAlerts}
                style={{
                  padding: '6px 14px',
                  background: 'var(--accent-red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loadingAlerts && !alertsError && alerts.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No recent system alerts
            </div>
          )}

          {/* Alerts Grid / Cards */}
          {!loadingAlerts && !alertsError && alerts.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '16px' 
            }}>
              {alerts.map((alert) => {
                const investigationId = alert.investigation_id || alert._id;
                const timeStr = alert.timestamp 
                  ? new Date(alert.timestamp).toISOString().substring(11, 16) + ' UTC' 
                  : 'N/A';

                return (
                  <div
                    key={alert._id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Header: Alert Type & Timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        color: 'var(--accent-yellow)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontWeight: 600
                      }}>
                        <Shield size={13} />
                        New Detection
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {timeStr}
                      </span>
                    </div>

                    {/* Investigation ID (Clickable) */}
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        Investigation ID:
                      </div>
                      <Link
                        href={`/observations/${investigationId}`}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#f8fafc',
                          fontFamily: 'monospace',
                          textDecoration: 'none',
                          display: 'inline-block',
                          transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--accent-cyan)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = '#f8fafc')}
                        title="Click to view detailed observation"
                        onClick={() => {
                          console.log("[VIEW OBSERVATION] clicking alert link for investigationId:", investigationId);
                        }}
                      >
                        {investigationId}
                      </Link>
                    </div>

                    {/* Location & Overpass Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} color="var(--accent-blue)" />
                      <span>{alert.satellite || 'Sentinel-1'} SAR Overpass</span>
                    </div>

                    {/* Action Button: VIEW OBSERVATION */}
                    <button
                      onClick={() => {
                        console.log("[VIEW OBSERVATION] clicking alert for investigationId:", investigationId);
                        router.push(`/observations/${investigationId}`);
                      }}
                      style={{
                        marginTop: '4px',
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid var(--accent-cyan)',
                        borderRadius: '4px',
                        color: 'var(--accent-cyan)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--accent-cyan)';
                        e.currentTarget.style.color = '#000';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                        e.currentTarget.style.color = 'var(--accent-cyan)';
                      }}
                    >
                      <Eye size={14} />
                      VIEW OBSERVATION
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. ACTIVE OBSERVATIONS OVERVIEW TABLE */}
        <div className="tactical-panel" style={{ padding: '24px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                Active Overpass Catalog
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              SAR Interferometric Feed
            </span>
          </div>

          {reportError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={14} />
                <span>{reportError}</span>
              </div>
              <button
                onClick={() => setReportError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>INCIDENT</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>OVERPASS TIME</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>COORDINATES</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>SLICK AREA</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {spills.map((spill) => {
                  const investigationId = spill.id;
                  const isDownloading = downloadingReportId === investigationId;

                  return (
                    <tr 
                      key={investigationId}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#f8fafc' }}>
                        {spill.name || `INCIDENT-${investigationId.substring(0, 6).toUpperCase()}`}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(spill.detectedAt).toISOString().substring(0, 16).replace('T', ' ')} UTC
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {spill.currentLocation?.lat.toFixed(2)}°N, {spill.currentLocation?.lng.toFixed(2)}°E
                      </td>
                      <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 600 }}>
                        {spill.areaSqKm ? `${spill.areaSqKm.toFixed(2)} km²` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '10px', 
                          fontWeight: 700,
                          background: spill.status === 'RESOLVED' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                          color: spill.status === 'RESOLVED' ? 'var(--accent-green)' : 'var(--accent-yellow)',
                          border: `1px solid ${spill.status === 'RESOLVED' ? 'var(--accent-green)' : 'var(--accent-yellow)'}`
                        }}>
                          {spill.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Link
                            href={`/observations/${investigationId}`}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '11px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                              e.currentTarget.style.color = 'var(--accent-cyan)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                          >
                            Inspect <ArrowRight size={12} />
                          </Link>

                          <button
                            onClick={() => handleDownloadReport(spill)}
                            disabled={isDownloading}
                            style={{
                              padding: '6px 12px',
                              background: isDownloading ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid var(--accent-cyan)',
                              borderRadius: '4px',
                              color: 'var(--accent-cyan)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isDownloading ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              opacity: isDownloading ? 0.7 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!isDownloading) {
                                e.currentTarget.style.background = 'var(--accent-cyan)';
                                e.currentTarget.style.color = '#000';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isDownloading) {
                                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                                e.currentTarget.style.color = 'var(--accent-cyan)';
                              }
                            }}
                            title={`Download PDF Report for investigation ${investigationId}`}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                DOWNLOADING...
                              </>
                            ) : (
                              <>
                                <Download size={12} />
                                REPORT
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

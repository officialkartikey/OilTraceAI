export interface Investigation {
  _id: string;
  status: string;
  observation_ids: string[];
  detection_id?: string;
  reconstruction_id?: string;
  candidate_ids: string[];
  attribution_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  _id: string;
  investigation_id: string;
  timestamp: string;
  sensor: string;
  resolution_m?: number;
  image_reference: string;
  geospatial_bounds: any;
  created_at: string;
}

export interface AisPosition {
  timestamp: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  speed?: number;
  heading?: number;
  course?: number;
}

export interface Vessel {
  vessel_id: string;
  name: string;
  mmsi: string;
  imo?: string;
  vessel_type: string;
  positions?: AisPosition[];
}

export interface CandidateEvidence {
  spatial?: number;
  temporal?: number;
  drift?: number;
  trajectory?: number;
  ais_quality?: number;
  spatial_score?: number;
  temporal_score?: number;
  trajectory_score?: number;
  [key: string]: any;
}

export interface CandidateRank {
  rank: number;
  attribution_score: number;
  evidence: CandidateEvidence;
  explanations: string[];
  vessel: Vessel;
}

export interface Detection {
  detected: boolean;
  confidence: number;
  area_km2?: number;
  area_pct?: number;
  geometry: any;
  mask_ref?: string;
  probability_map_ref?: string;
  model?: any;
}

export interface Reconstruction {
  release_window: { start_time: string; end_time: string };
  source_region: any;
  confidence: number;
  hindcast_track?: Array<{ lat: number; lon: number; timestamp?: string; time?: string }>;
  forecast_track?: Array<{ lat: number; lon: number; timestamp?: string; time?: string }>;
  uncertainty_km?: number;
  horizon_hours?: number;
  parameters?: any;
}

export interface EnvironmentData {
  current_speed_kn: number;
  current_dir_deg: number;
  wind_speed_kn: number;
  wind_dir_deg: number;
  source_type?: string;
}

export interface FullInvestigation {
  investigation: Investigation;
  observation?: Observation;
  detection?: Detection;
  reconstruction?: Reconstruction;
  environment?: EnvironmentData;
  candidates: CandidateRank[];
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
}

const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/').replace(/\/+$/, '');
const baseUrl = rawBase.endsWith('/investigations') ? rawBase.slice(0, -'/investigations'.length) : rawBase;
const API_BASE = `${baseUrl}/investigations`;

export const kairosClient = {
  async createInvestigation(): Promise<Investigation> {
    const res = await fetch(API_BASE + '/', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!res.ok) throw new Error('Failed to create investigation');
    return res.json();
  },

  async addObservation(invId: string, file: File, timestamp: string, sensor: string, resolution_m?: number, lat?: number, lon?: number): Promise<Observation> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('timestamp', timestamp);
    formData.append('sensor', sensor);
    if (resolution_m) formData.append('resolution_m', resolution_m.toString());
    if (lat !== undefined) formData.append('lat', lat.toString());
    if (lon !== undefined) formData.append('lon', lon.toString());

    const res = await fetch(`${API_BASE}/${invId}/observations`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to add observation');
    return res.json();
  },

  async triggerAnalysis(invId: string): Promise<{ job_id: string; status: string }> {
    const res = await fetch(`${API_BASE}/${invId}/analyze`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger analysis');
    return res.json();
  },

  async getFullInvestigation(invId: string): Promise<FullInvestigation> {
    const cleanId = (invId || '').trim();
    const url = `${API_BASE}/${cleanId}/full?_t=${Date.now()}`;
    console.log("[FULL API] URL:", url);
    console.log("[FULL API] investigationId:", cleanId);

    let res: Response;
    try {
      res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (netErr) {
      console.warn("[FULL API] Direct fetch failed, trying local proxy fallback:", netErr);
      const fallbackUrl = `/api/v1/investigations/${cleanId}/full?_t=${Date.now()}`;
      res = await fetch(fallbackUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    console.log("[FULL API] status:", res.status);
    if (!res.ok) throw new Error(`Failed to get full investigation: HTTP ${res.status}`);
    const data = await res.json();
    console.log("[FULL API] candidates:", data?.candidates);
    console.log("[FULL API] candidate count:", data?.candidates?.length);
    return data;
  },

  async getTimeline(invId: string): Promise<TimelineEvent[]> {
    const res = await fetch(`${API_BASE}/${invId}/timeline`);
    if (!res.ok) throw new Error('Failed to get timeline');
    return res.json();
  },

  async getObservations(invId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/${invId}/observations`);
    if (!res.ok) throw new Error('Failed to get observations');
    return res.json();
  },

  getReportUrl(invId: string): string {
    return `${API_BASE}/${invId}/report`;
  },

  async downloadReport(invId: string): Promise<void> {
    const reportUrl = this.getReportUrl(invId);
    console.log("[REPORT DOWNLOAD] Investigation ID:", invId);
    console.log("[REPORT DOWNLOAD] Report URL:", reportUrl);
    console.log("[REPORT DOWNLOAD] API BASE URL:", process.env.NEXT_PUBLIC_API_URL);

    let response: Response;
    try {
      response = await fetch(reportUrl);
    } catch (netErr) {
      console.warn("[REPORT DOWNLOAD] Direct fetch failed, trying local proxy fallback:", netErr);
      const fallbackUrl = `/api/v1/investigations/${invId}/report`;
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
      throw new Error(`Failed to download report (${response.status} ${response.statusText})`);
    }

    const blob = await response.blob();

    // Determine filename: Content-Disposition header if available, otherwise default
    let filename = `investigation_${invId}_report.pdf`;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }
};

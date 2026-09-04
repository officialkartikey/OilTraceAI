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

export interface Detection {
  detected: boolean;
  confidence: number;
  area_km2: number;
  geometry: any;
  model: any;
}

export interface Reconstruction {
  release_window: { start_time: string; end_time: string };
  source_region: any;
  confidence: number;
}

export interface CandidateRank {
  rank: number;
  attribution_score: number;
  evidence: any;
  explanations: string[];
  vessel: {
    vessel_id: string;
    name: string;
    mmsi: string;
    vessel_type: string;
  };
}

export interface FullInvestigation {
  investigation: Investigation;
  observation?: Observation;
  detection?: Detection;
  reconstruction?: Reconstruction;
  environment?: { wind_speed_kn: number; current_speed_kn: number };
  candidates: CandidateRank[];
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
}

const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/';
const baseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
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
    const res = await fetch(`${API_BASE}/${invId}/full`);
    if (!res.ok) throw new Error('Failed to get full investigation');
    return res.json();
  },

  async getTimeline(invId: string): Promise<TimelineEvent[]> {
    const res = await fetch(`${API_BASE}/${invId}/timeline`);
    if (!res.ok) throw new Error('Failed to get timeline');
    return res.json();
  }
};

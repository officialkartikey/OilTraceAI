export interface Point {
  lat: number;
  lon: number;
}

export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface DetectionResult {
  slick_detected: boolean;
  confidence: number;
  area_pct: number;
  polygon?: Polygon;
}

export interface DriftResult {
  origin: Point;
  trajectory: Point[];
}

export interface CandidateEvidence {
  spatial: number;
  temporal: number;
  drift: number;
  trajectory: number;
  aisQuality: number;
}

export interface CandidateVessel {
  mmsi: string | number;
  suspect_score: number;
  proximity_km: number;
  time_offset_hr: number;
  flags: string[];
}

export interface AttributionResult {
  suspects: CandidateVessel[];
}

export interface TrackPosition {
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
}

export interface VesselTrack {
  vesselId: string;
  name?: string;
  mmsi: string;
  imo?: string;
  vesselType?: string;
  positions: TrackPosition[];
}

export interface InvestigationDetailResponse {
  investigation: { id: string; status: string };
  observation: { id: string; timestamp: string; satellite: string; image_file: string };
  detection: DetectionResult;
  ais: {
    source: string;
    window: { start: string; end: string };
    tracks: VesselTrack[];
  };
  drift: {
    environmental_inputs: {
      current_speed_kn: number;
      current_dir_deg: number;
      wind_speed_kn: number;
      wind_dir_deg: number;
    };
    hindcast: {
      estimated_origin: Point;
      estimated_origin_time: string;
      track: { time: string; lat: number; lon: number }[];
    };
    forecast: {
      horizon_hours: number;
      predicted_position: { lat: number; lon: number; time: string };
      track: { time: string; lat: number; lon: number }[];
    };
  };
  attribution: AttributionResult;
  timeline: any[];
}

export interface Alert {
  _id: string;
  observation_id: string;
  timestamp: string;
  satellite: string;
  image_file: string;
  detection?: DetectionResult;
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface ActiveSpill {
  id: string;
  name: string;
  detectedAt: string; // serialized Date
  status: 'ACTIVE' | 'RESOLVED' | 'VERIFYING';
  areaSqKm: number;
  currentLocation: {
    lat: number;
    lng: number;
  };
  hindcastOrigin: {
    lat: number;
    lng: number;
    estimatedTime: string;
  };
  confidence: number;
}

export interface DetectionRequest {
  fileId: string;
  spill_time?: string;
  spill_lat?: number;
  spill_lon?: number;
}

export interface DetectionResponse {
  success: boolean;
  incidentId: string;
  data: DetectionResult;
}

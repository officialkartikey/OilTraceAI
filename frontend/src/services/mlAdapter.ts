export type SlickDetection = {
  detected: boolean;
  confidence: number;
  areaKm2?: number;
  geometry?: any; 
  maskUrl?: string;
  probabilityMapUrl?: string;
};

export type ObservationMetadata = {
  id: string;
  timestamp: string;
  sensor: string;
  satellite: string;
  resolution_m: number;
};

export type NormalizedInvestigationResult = {
  observation: ObservationMetadata;
  detection: SlickDetection;
  modelInfo: {
    name: string;
    version: string;
  };
};

export function normalizeMlResponse(rawResponse: any): NormalizedInvestigationResult {
  return {
    observation: {
      id: rawResponse.observation_id || '',
      timestamp: rawResponse.observation?.timestamp || new Date().toISOString(),
      sensor: rawResponse.observation?.sensor || 'SAR',
      satellite: rawResponse.observation?.satellite || 'Unknown',
      resolution_m: rawResponse.observation?.resolution_m || 10,
    },
    detection: {
      detected: rawResponse.detection?.slick_detected || false,
      confidence: rawResponse.detection?.confidence || 0,
      areaKm2: rawResponse.detection?.area_pct || 0,
      geometry: rawResponse.detection?.bounding_box_px || null,
      maskUrl: rawResponse.artifacts?.mask_base64 || undefined,
    },
    modelInfo: {
      name: rawResponse.model?.name || 'Unknown',
      version: rawResponse.model?.version || 'v1',
    }
  };
}

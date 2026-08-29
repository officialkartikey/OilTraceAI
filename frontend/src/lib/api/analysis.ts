import { fetchApi } from './client';
import { DriftResult, AttributionResult, DetectionResult } from './types';

export const analysisApi = {
  detect: async (fileId: string, spill_time?: string, spill_lat?: number, spill_lon?: number): Promise<DetectionResult> => {
    const data = await fetchApi<{ success: boolean; data: DetectionResult; incidentId: string }>('/detect', {
      method: 'POST',
      body: JSON.stringify({ fileId, spill_time, spill_lat, spill_lon })
    });
    return data.data;
  },

  hindcast: async (incidentId: string): Promise<DriftResult> => {
    const data = await fetchApi<{ success: boolean; data: DriftResult }>('/hindcast', {
      method: 'POST',
      body: JSON.stringify({ incidentId })
    });
    return data.data;
  },

  attribution: async (incidentId: string): Promise<AttributionResult> => {
    const data = await fetchApi<{ success: boolean; data: AttributionResult }>('/attribution', {
      method: 'POST',
      body: JSON.stringify({ incidentId })
    });
    return data.data;
  }
};

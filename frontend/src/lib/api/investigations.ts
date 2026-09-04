import { fetchApi } from './client';
import { InvestigationDetailResponse, AlertsResponse, ActiveSpill } from './types';

export const investigationsApi = {
  getInvestigationDetails: async (id: string): Promise<InvestigationDetailResponse> => {
    const data = await fetchApi<{ success: boolean; data: InvestigationDetailResponse }>(`/investigations/${id}`);
    return data.data;
  },

  getAlerts: async (): Promise<AlertsResponse> => {
    const data = await fetchApi<AlertsResponse>('/investigations/alerts');
    return data; // already { alerts: [...] } ? Let's check backend... it returns { success: true, alerts: [...] }
  },

  getActiveSpills: async (): Promise<ActiveSpill[]> => {
    const data = await fetchApi<{ success: boolean; data: ActiveSpill[] }>('/investigations/spills');
    return data.data;
  },
  
  getAlertsData: async (): Promise<AlertsResponse['alerts']> => {
    const data = await fetchApi<{ success: boolean; alerts: AlertsResponse['alerts'] }>('/investigations/alerts');
    return data.alerts;
  },

  uploadAnalysisImage: async (file: File): Promise<{ message: string; fileId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{ message: string; fileId: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  runDetection: async (data: { fileId: string; spill_time?: string; spill_lat?: number; spill_lon?: number }): Promise<{ success: boolean; incidentId: string; data: any }> => {
    return fetchApi<{ success: boolean; incidentId: string; data: any }>('/detect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};

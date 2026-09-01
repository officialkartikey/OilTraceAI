"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FullInvestigation, TimelineEvent, kairosClient } from '@/lib/api/kairosClient';

interface MapLayers {
  showSlick: boolean;
  showTracks: boolean;
  showSourceRegion: boolean;
}

interface InvestigationContextType {
  investigationId: string | null;
  data: FullInvestigation | null;
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;
  
  // App state
  selectedVessel: string | null;
  setSelectedVessel: (v: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (t: string | null) => void;
  
  mapLayers: MapLayers;
  setMapLayers: (layers: MapLayers) => void;
  
  refresh: () => Promise<void>;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export function InvestigationProvider({ children, id }: { children: ReactNode; id: string }) {
  const [data, setData] = useState<FullInvestigation | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    showSlick: true,
    showTracks: true,
    showSourceRegion: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const invData = await kairosClient.getFullInvestigation(id);
      setData(invData);
      
      const timelineData = await kairosClient.getTimeline(id);
      setTimeline(timelineData);
      
      // If still analyzing, poll every 5 seconds
      if (invData.investigation.status === 'ANALYZING') {
        setTimeout(fetchData, 5000);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
        fetchData();
    }
  }, [id]);

  return (
    <InvestigationContext.Provider value={{
      investigationId: id,
      data, timeline, loading, error,
      selectedVessel, setSelectedVessel,
      selectedTime, setSelectedTime,
      mapLayers, setMapLayers,
      refresh: fetchData
    }}>
      {children}
    </InvestigationContext.Provider>
  );
}

const defaultContext: InvestigationContextType = {
  investigationId: null,
  data: null,
  timeline: [],
  loading: false,
  error: null,
  selectedVessel: null,
  setSelectedVessel: () => {},
  selectedTime: null,
  setSelectedTime: () => {},
  mapLayers: { showSlick: true, showTracks: true, showSourceRegion: true },
  setMapLayers: () => {},
  refresh: async () => {},
};

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (ctx === undefined) return defaultContext;
  return ctx;
}

"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InvestigationDetailResponse, VesselTrack } from '@/lib/api/types';
import { investigationsApi } from '@/lib/api/investigations';

interface MapLayers {
  showSlick: boolean;
  showTracks: boolean;
  showSourceRegion: boolean;
  showParticles: boolean;
}

interface InvestigationContextType {
  investigationId: string | null;
  data: InvestigationDetailResponse | null;
  loading: boolean;
  error: string | null;
  
  // App state
  selectedVessel: string | null;
  setSelectedVessel: (v: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (t: string | null) => void;
  
  mapLayers: MapLayers;
  setMapLayers: (layers: MapLayers) => void;
  
  observationModalOpen: boolean;
  setObservationModalOpen: (open: boolean) => void;

  refresh: () => Promise<void>;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export function InvestigationProvider({ children, id }: { children: ReactNode; id: string }) {
  const [data, setData] = useState<InvestigationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    showSlick: true,
    showTracks: true,
    showSourceRegion: true,
    showParticles: true
  });
  
  const [observationModalOpen, setObservationModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const invData = await investigationsApi.getInvestigationDetails(id);
      setData(invData);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return (
    <InvestigationContext.Provider value={{
      investigationId: id,
      data, loading, error,
      selectedVessel, setSelectedVessel,
      selectedTime, setSelectedTime,
      mapLayers, setMapLayers,
      observationModalOpen, setObservationModalOpen,
      refresh: fetchData
    }}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (ctx === undefined) throw new Error('useInvestigation must be used within an InvestigationProvider');
  return ctx;
}

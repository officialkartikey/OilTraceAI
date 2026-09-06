"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FullInvestigation, TimelineEvent, kairosClient } from '@/lib/api/kairosClient';

export interface MapLayers {
  showSlick: boolean;
  showTracks: boolean;
  showSourceRegion: boolean;
  showHindcast: boolean;
  showRadarRings: boolean;
  showLegend: boolean;
}

export interface InvestigationContextType {
  investigationId: string | null;
  data: FullInvestigation | null;
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;

  // Observation from /observations
  observations: any[] | null;
  observationsLoading: boolean;
  fetchObservations: () => Promise<any>;

  // Vessels & Candidates from /full
  isVesselsPanelOpen: boolean;
  setVesselsPanelOpen: (open: boolean) => void;
  vesselsLoading: boolean;
  vesselsError: string | null;
  fetchVessels: () => Promise<void>;

  // App state
  selectedVessel: string | null;
  setSelectedVessel: (v: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (t: string | null) => void;

  mapLayers: MapLayers;
  setMapLayers: React.Dispatch<React.SetStateAction<MapLayers>>;

  refresh: () => Promise<void>;

  // UI helpers
  isObservationModalOpen?: boolean;
  setObservationModalOpen?: (open: boolean) => void;
  leftTab: 'pipeline' | 'candidates';
  setLeftTab: (tab: 'pipeline' | 'candidates') => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export function InvestigationProvider({ children, id }: { children: ReactNode; id: string }) {
  const [data, setData] = useState<FullInvestigation | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Observations
  const [observations, setObservations] = useState<any[] | null>(null);
  const [observationsLoading, setObservationsLoading] = useState(false);

  // Vessels Panel
  const [isVesselsPanelOpen, setVesselsPanelOpen] = useState(false);
  const [vesselsLoading, setVesselsLoading] = useState(false);
  const [vesselsError, setVesselsError] = useState<string | null>(null);

  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isObservationModalOpen, setObservationModalOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<'pipeline' | 'candidates'>('pipeline');

  const [mapLayers, setMapLayers] = useState<MapLayers>({
    showSlick: true,
    showTracks: true,
    showSourceRegion: true,
    showHindcast: true,
    showRadarRings: true,
    showLegend: true
  });

  const fetchObservations = async () => {
    if (!id) return null;
    try {
      setObservationsLoading(true);
      const obs = await kairosClient.getObservations(id);
      setObservations(obs);
      return obs;
    } catch (err) {
      console.warn('Could not fetch observations:', err);
      return null;
    } finally {
      setObservationsLoading(false);
    }
  };

  const fetchVessels = async () => {
    if (!id) return;
    try {
      setVesselsLoading(true);
      setVesselsError(null);
      const invData = await kairosClient.getFullInvestigation(id);
      console.log("[INVESTIGATION STATE] (fetchVessels) candidates:", invData?.candidates);
      console.log("[INVESTIGATION STATE] (fetchVessels) candidate count:", invData?.candidates?.length);

      setData(prev => {
        if (prev?.candidates && prev.candidates.length > 0 && (!invData.candidates || invData.candidates.length === 0)) {
          console.warn("[INVESTIGATION STATE] fetchVessels preserving existing candidates:", prev.candidates.length);
          return { ...invData, candidates: prev.candidates };
        }
        return invData;
      });

      setVesselsPanelOpen(true);
      const candList = invData.candidates || [];
      if (candList.length > 0) {
        const topVesselId = candList[0]?.vessel?.vessel_id || (candList[0] as any)?.vessel_id;
        if (!selectedVessel && topVesselId) {
          setSelectedVessel(topVesselId);
        }
      }
    } catch (err: any) {
      setVesselsError(err.message || 'Failed to retrieve vessels from /full');
    } finally {
      setVesselsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const invData = await kairosClient.getFullInvestigation(id);
      const status = invData?.investigation?.status;

      console.log("[INVESTIGATION STATE] candidates:", invData?.candidates);
      console.log("[INVESTIGATION STATE] candidate count:", invData?.candidates?.length);

      setData(prev => {
        // Prevent race condition: never overwrite existing candidates with an empty array if invData has no candidates
        if (prev?.candidates && prev.candidates.length > 0 && (!invData.candidates || invData.candidates.length === 0)) {
          console.warn("[INVESTIGATION STATE] Preserving existing candidates because invData has 0 candidates:", prev.candidates.length);
          return { ...invData, candidates: prev.candidates };
        }
        return invData;
      });

      const candList = invData.candidates || [];
      if (candList.length > 0) {
        const topVesselId = candList[0]?.vessel?.vessel_id || (candList[0] as any)?.vessel_id;
        if (!selectedVessel && topVesselId) {
          setSelectedVessel(topVesselId);
        }
      }

      const timelineData = await kairosClient.getTimeline(id);
      setTimeline(timelineData);

      // Fetch /observations in parallel
      fetchObservations();

      // Poll until analysis reaches a final state (COMPLETED or FAILED)
      if (status && status !== 'COMPLETED' && status !== 'FAILED') {
        setTimeout(fetchData, 3000);
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
    <InvestigationContext.Provider
      value={{
        investigationId: id,
        data,
        timeline,
        loading,
        error,
        observations,
        observationsLoading,
        fetchObservations,
        isVesselsPanelOpen,
        setVesselsPanelOpen,
        vesselsLoading,
        vesselsError,
        fetchVessels,
        selectedVessel,
        setSelectedVessel,
        selectedTime,
        setSelectedTime,
        mapLayers,
        setMapLayers,
        refresh: fetchData,
        isObservationModalOpen,
        setObservationModalOpen,
        leftTab,
        setLeftTab
      }}
    >
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
  observations: null,
  observationsLoading: false,
  fetchObservations: async () => null,
  isVesselsPanelOpen: false,
  setVesselsPanelOpen: () => {},
  vesselsLoading: false,
  vesselsError: null,
  fetchVessels: async () => {},
  selectedVessel: null,
  setSelectedVessel: () => {},
  selectedTime: null,
  setSelectedTime: () => {},
  mapLayers: {
    showSlick: true,
    showTracks: true,
    showSourceRegion: true,
    showHindcast: true,
    showRadarRings: true,
    showLegend: true
  },
  setMapLayers: () => {},
  refresh: async () => {},
  isObservationModalOpen: false,
  setObservationModalOpen: () => {},
  leftTab: 'pipeline',
  setLeftTab: () => {}
};

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (ctx === undefined) return defaultContext;
  return ctx;
}

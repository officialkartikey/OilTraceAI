"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  selectedVessel: string | null;
  setSelectedVessel: (imo: string | null) => void;
  currentTime: string;
  setCurrentTime: (time: string) => void;
  activeInvestigation: string;
  setActiveInvestigation: (id: string) => void;
  observationModalOpen: boolean;
  setObservationModalOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('10:30');
  const [activeInvestigation, setActiveInvestigation] = useState<string>('IN-2026-08-24-1030');
  const [observationModalOpen, setObservationModalOpen] = useState<boolean>(false);

  return (
    <DashboardContext.Provider value={{
      selectedVessel, setSelectedVessel,
      currentTime, setCurrentTime,
      activeInvestigation, setActiveInvestigation,
      observationModalOpen, setObservationModalOpen
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

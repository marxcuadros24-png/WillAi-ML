import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { IncidentesAdmin } from '../components/IncidentesAdmin';
import type { Incidente } from '../types';

export const IncidentesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    incidentes,
    loadAllData,
    onOpenCreateIncident,
    onOpenDispatch,
    onOpenChangeStatus,
    onOpenCloseIncident,
    setSelectedIncidente,
    setSidebarTab
  } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  const handleViewOnMap = (inc: Incidente) => {
    setSelectedIncidente(inc);
    setSidebarTab('incidentes');
    navigate('/mapa');
  };

  return (
    <IncidentesAdmin
      incidentes={incidentes}
      onOpenCreate={onOpenCreateIncident}
      onOpenDispatch={onOpenDispatch}
      onOpenChangeStatus={onOpenChangeStatus}
      onOpenCloseIncident={onOpenCloseIncident}
      onViewOnMap={handleViewOnMap}
    />
  );
};

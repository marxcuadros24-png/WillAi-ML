import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PanelAdmin } from '../components/PanelAdmin';

export const PanelPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    metricas,
    fwi,
    incidentes,
    focos,
    reportes,
    brigadas,
    grillaOcurrencia,
    setSidebarTab,
    handleEntrenarOcurrenciaManual,
    loadAllData,
    onOpenCreateIncident,
    onOpenAlertModal,
    handleDispararSyncManual
  } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <PanelAdmin
      metricas={metricas}
      fwi={fwi}
      incidentes={incidentes}
      focos={focos}
      reportes={reportes}
      brigadas={brigadas}
      grillaOcurrencia={grillaOcurrencia}
      onEntrenarOcurrencia={handleEntrenarOcurrenciaManual}
      onNavigateTab={(tab) => navigate(`/${tab}`)}
      onOpenCreateIncident={onOpenCreateIncident}
      onOpenAlertModal={onOpenAlertModal}
      onRefreshMeteo={() => handleDispararSyncManual('meteo')}
      onOpenRiesgoML={() => {
        setSidebarTab('riesgo');
        navigate('/mapa');
      }}
    />
  );
};

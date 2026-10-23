import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SatelitesAdmin } from '../components/SatelitesAdmin';

export const SatelitesPage: React.FC = () => {
  const {
    lotesSatelitales,
    loadAllData,
    handleDispararSyncManual,
    handleEntrenarVientoManual
  } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <SatelitesAdmin
      lotes={lotesSatelitales}
      onDispararSync={handleDispararSyncManual}
      onEntrenarViento={handleEntrenarVientoManual}
    />
  );
};

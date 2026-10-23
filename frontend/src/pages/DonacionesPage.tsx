import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { DonacionesAdmin } from '../components/DonacionesAdmin';

export const DonacionesPage: React.FC = () => {
  const { donaciones, handleModerarDonacionAction, loadAllData } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <DonacionesAdmin
      donaciones={donaciones}
      onModerar={handleModerarDonacionAction}
    />
  );
};

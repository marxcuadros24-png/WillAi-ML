import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { AlertasAdmin } from '../components/AlertasAdmin';

export const AlertasPage: React.FC = () => {
  const { alertas, onOpenAlertModal, loadAllData } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <AlertasAdmin
      alertas={alertas}
      onOpenEmitirAlerta={onOpenAlertModal}
    />
  );
};

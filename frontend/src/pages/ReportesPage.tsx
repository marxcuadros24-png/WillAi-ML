import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ReportesAdmin } from '../components/ReportesAdmin';

export const ReportesPage: React.FC = () => {
  const {
    reportes,
    loadAllData,
    handleValidarReporteAction,
    handleConvertirReporteAIncidente
  } = useAppContext();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <ReportesAdmin
      reportes={reportes}
      onValidar={handleValidarReporteAction}
      onConvertirAIncidente={handleConvertirReporteAIncidente}
    />
  );
};

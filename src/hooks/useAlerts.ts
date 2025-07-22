import { useState } from 'react';
import type { Alert } from '../types';
import { API_BASE_URL } from '../utils/api';

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAlerts = async (alertQuery: string = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts${alertQuery}`);
      const alertData: Alert[] = await response.json();
      setAlerts(alertData);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {
    const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
    if (!acc[serviceKey]) {
      acc[serviceKey] = [];
    }
    acc[serviceKey].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  return {
    alerts,
    groupedAlerts,
    fetchAlerts,
  };
};
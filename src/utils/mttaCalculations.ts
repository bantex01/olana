import type { Alert } from '../types';

/**
 * Calculate MTTA (Mean Time to Acknowledge) from a list of alerts
 * For operationally useful metrics, includes time that unacknowledged alerts have been waiting
 * @param alerts Array of alerts to calculate MTTA for
 * @returns MTTA in minutes, or 0 if no valid alerts
 */
export const calculateMTTA = (alerts: Alert[]): number => {
  // Filter out alerts without first_seen timestamp
  const validAlerts = alerts.filter(alert => alert.first_seen);
  
  if (validAlerts.length === 0) return 0;
  
  const totalTime = validAlerts.reduce((total, alert) => {
    const firstSeen = new Date(alert.first_seen).getTime();
    const endTime = alert.acknowledged_at 
      ? new Date(alert.acknowledged_at).getTime()  // Time when acknowledged
      : Date.now();                                // Still waiting (current time)
    return total + (endTime - firstSeen);
  }, 0);
  
  return totalTime / validAlerts.length / 1000 / 60; // Convert to minutes
};

/**
 * Format MTTA value for display
 * @param mtta MTTA value in minutes
 * @returns Formatted string for display
 */
export const formatMTTA = (mtta: number): string => {
  if (mtta === 0) return '--';
  
  // For values over 60 minutes, show in hours for better readability
  if (mtta >= 60) {
    const hours = mtta / 60;
    return `${hours.toFixed(1)}h`;
  }
  
  return `${mtta.toFixed(1)} min`;
};
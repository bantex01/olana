import React, { useState, useMemo } from 'react';
import { Typography, Empty } from 'antd';
import { ThemedServiceRow } from './ThemedServiceRow';
import { RichServiceDrillDown } from './RichServiceDrillDown';
import type { ServiceGroup } from '../../types';
import type { ArrangementOption, SortConfig } from '../Controls';

const { Title } = Typography;

interface ServicesListProps {
  serviceGroups: ServiceGroup[];
  arrangement: ArrangementOption;
  sortConfig: SortConfig;
  loading?: boolean;
}

export const ServicesList: React.FC<ServicesListProps> = ({
  serviceGroups,
  arrangement,
  sortConfig,
  loading = false
}) => {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const handleToggleExpand = (serviceKey: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceKey)) {
        newSet.delete(serviceKey);
      } else {
        newSet.add(serviceKey);
      }
      return newSet;
    });
  };

  // Sort service groups based on current sort config
  const sortedServiceGroups = useMemo(() => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    return [...serviceGroups].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.field) {
        case 'service':
          comparison = a.serviceKey.localeCompare(b.serviceKey);
          break;
        case 'namespace':
          comparison = a.serviceNamespace.localeCompare(b.serviceNamespace);
          break;
        case 'severity':
          const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
          const aRank = severityRank[a.highestSeverity as keyof typeof severityRank] || 5;
          const bRank = severityRank[b.highestSeverity as keyof typeof severityRank] || 5;
          comparison = aRank - bRank;
          break;
        case 'alertCount':
          comparison = a.alertCount - b.alertCount;
          break;
        case 'duration':
          comparison = a.longestDuration - b.longestDuration;
          break;
        case 'activity':
          const aTime = a.latestActivity ? new Date(a.latestActivity).getTime() : 0;
          const bTime = b.latestActivity ? new Date(b.latestActivity).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      
      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [serviceGroups, sortConfig]);

  // Group services based on arrangement option
  const arrangedServices = useMemo(() => {
    if (arrangement === 'service') {
      return { 'Services': sortedServiceGroups };
    }

    if (arrangement === 'namespace') {
      const grouped = sortedServiceGroups.reduce((acc, serviceGroup) => {
        const namespace = serviceGroup.serviceNamespace;
        if (!acc[namespace]) {
          acc[namespace] = [];
        }
        acc[namespace].push(serviceGroup);
        return acc;
      }, {} as Record<string, ServiceGroup[]>);
      
      return grouped;
    }

    if (arrangement === 'namespace-and-service') {
      const grouped = sortedServiceGroups.reduce((acc, serviceGroup) => {
        const groupKey = `${serviceGroup.serviceNamespace} :: ${serviceGroup.serviceName}`;
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(serviceGroup);
        return acc;
      }, {} as Record<string, ServiceGroup[]>);
      
      return grouped;
    }

    return { 'Services': sortedServiceGroups };
  }, [sortedServiceGroups, arrangement]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading services...</p>
      </div>
    );
  }

  if (serviceGroups.length === 0) {
    return (
      <Empty
        description="No services with active alerts found"
        style={{ margin: '40px 0' }}
      />
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      {Object.entries(arrangedServices).map(([groupName, services]) => (
        <div key={groupName} style={{ marginBottom: '32px' }}>
          {arrangement !== 'service' && (
            <Title level={4} style={{ 
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}>
              {groupName}
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 'normal', 
                color: 'var(--text-secondary)',
                marginLeft: '8px'
              }}>
                ({services.length} service{services.length !== 1 ? 's' : ''})
              </span>
            </Title>
          )}

          {services.map((serviceGroup) => {
            const isExpanded = expandedServices.has(serviceGroup.serviceKey);
            return (
              <div key={serviceGroup.serviceKey} style={{ marginBottom: '2px' }}>
                <ThemedServiceRow
                  serviceGroup={serviceGroup}
                  isExpanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                />
                {isExpanded && (
                  <RichServiceDrillDown 
                    serviceGroup={serviceGroup}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
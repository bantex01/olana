import React from 'react';
import { Card, Typography } from 'antd';
import { ServicesOverview } from './ServicesOverview';
import { ServiceCatalog } from './ServiceCatalog';

const { Title } = Typography;

  interface ServicesPageProps {
    activeTab: string;
    onServiceSelect?: (namespace: string, name: string) => void;
  }

export const ServicesPage: React.FC<ServicesPageProps> = ({ activeTab, onServiceSelect }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'services-overview':
        return <ServicesOverview />;
        case 'services-catalog':
    return <ServiceCatalog onServiceSelect={onServiceSelect} />;
      case 'services-dependencies':
        return <div>Dependencies Management (coming soon)</div>;
      case 'services-health':
        return <div>Health & Status (coming soon)</div>;
      default:
        return <ServicesOverview />;
    }
  };

  return (
    <div>
      {renderTabContent()}
    </div>
  );
};
import React from 'react';
import { Card, Typography } from 'antd';
import { ServicesOverview } from './ServicesOverview';

const { Title } = Typography;

interface ServicesPageProps {
  activeTab: string;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ activeTab }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'services-overview':
        return <ServicesOverview />;
      case 'services-catalog':
        return <div>Service Catalog (coming soon)</div>;
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
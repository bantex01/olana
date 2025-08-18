import React from 'react';
import { Table, Tag, Typography } from 'antd';

const { Text } = Typography;

export interface DeploymentEvent {
  id: string;
  service: string;
  namespace: string;
  time: string;
  timeAgo: string;
  status: 'success' | 'failed' | 'rollback' | 'in-progress';
  branch: string;
  commit: string;
  commitLink: string;
  mergeRequest: string;
  mergeRequestLink: string;
  preDeploymentAlerts: number;
  postDeploymentAlerts: number;
}

interface RecentDeploymentsTableProps {
  deployments?: DeploymentEvent[];
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const RecentDeploymentsTable: React.FC<RecentDeploymentsTableProps> = ({
  deployments = [],
  loading = false,
  isPlaceholder = false
}) => {
  // Dummy data for placeholder
  const placeholderDeployments: DeploymentEvent[] = [
    { 
      id: '1', 
      service: 'user-api', 
      namespace: 'prod',
      time: '2024-01-15 14:30:00',
      timeAgo: '2h ago', 
      status: 'success',
      branch: 'main',
      commit: 'abc123f',
      commitLink: 'https://github.com/company/user-api/commit/abc123f',
      mergeRequest: 'PR #245',
      mergeRequestLink: 'https://github.com/company/user-api/pull/245',
      preDeploymentAlerts: 2,
      postDeploymentAlerts: 1
    },
    { 
      id: '2', 
      service: 'payment-svc', 
      namespace: 'prod',
      time: '2024-01-15 12:15:00',
      timeAgo: '4h ago', 
      status: 'success',
      branch: 'main',
      commit: 'def456a',
      commitLink: 'https://github.com/company/payment-svc/commit/def456a',
      mergeRequest: 'PR #178',
      mergeRequestLink: 'https://github.com/company/payment-svc/pull/178',
      preDeploymentAlerts: 1,
      postDeploymentAlerts: 0
    },
    { 
      id: '3', 
      service: 'auth-svc', 
      namespace: 'prod',
      time: '2024-01-15 10:45:00',
      timeAgo: '6h ago', 
      status: 'rollback',
      branch: 'hotfix/auth-leak',
      commit: 'ghi789b',
      commitLink: 'https://github.com/company/auth-svc/commit/ghi789b',
      mergeRequest: 'PR #89',
      mergeRequestLink: 'https://github.com/company/auth-svc/pull/89',
      preDeploymentAlerts: 0,
      postDeploymentAlerts: 5
    },
    { 
      id: '4', 
      service: 'notification-api', 
      namespace: 'staging',
      time: '2024-01-15 09:20:00',
      timeAgo: '7h ago', 
      status: 'failed',
      branch: 'feature/push-notifications',
      commit: 'jkl012c',
      commitLink: 'https://github.com/company/notification-api/commit/jkl012c',
      mergeRequest: 'PR #156',
      mergeRequestLink: 'https://github.com/company/notification-api/pull/156',
      preDeploymentAlerts: 1,
      postDeploymentAlerts: 3
    },
    { 
      id: '5', 
      service: 'order-svc', 
      namespace: 'prod',
      time: '2024-01-15 08:00:00',
      timeAgo: '8h ago', 
      status: 'success',
      branch: 'main',
      commit: 'mno345d',
      commitLink: 'https://github.com/company/order-svc/commit/mno345d',
      mergeRequest: 'PR #203',
      mergeRequestLink: 'https://github.com/company/order-svc/pull/203',
      preDeploymentAlerts: 3,
      postDeploymentAlerts: 1
    }
  ];

  const displayDeployments = isPlaceholder ? placeholderDeployments : deployments;

  const getStatusColor = (status: DeploymentEvent['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'rollback': return 'warning';
      case 'in-progress': return 'processing';
      default: return 'default';
    }
  };

  const getAlertCountColor = (pre: number, post: number) => {
    if (post > pre) return '#ff4d4f'; // Red - alerts increased
    if (post < pre) return '#52c41a'; // Green - alerts decreased  
    return '#666'; // Grey - no change
  };

  const getAlertCountIcon = (pre: number, post: number) => {
    if (post > pre) return '↗️'; // Increased
    if (post < pre) return '↘️'; // Decreased
    return '→'; // No change
  };

  const columns = [
    {
      title: 'Service',
      key: 'service',
      width: 120,
      render: (_: any, record: DeploymentEvent) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{record.service}</div>
        </div>
      ),
    },
    {
      title: 'Namespace',
      key: 'namespace',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <Tag color={record.namespace === 'prod' ? 'red' : 'blue'}>
          {record.namespace}
        </Tag>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      width: 140,
      render: (_: any, record: DeploymentEvent) => (
        <Text 
          code 
          style={{ 
            fontSize: '11px', 
            backgroundColor: '#f0f0f0', 
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          {record.branch}
        </Text>
      ),
    },
    {
      title: 'Commit',
      key: 'commit',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <a 
          href={record.commitLink} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            fontSize: '11px',
            fontFamily: 'monospace',
            textDecoration: 'none'
          }}
        >
          {record.commit}
        </a>
      ),
    },
    {
      title: 'PR/MR',
      key: 'mergeRequest',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <a 
          href={record.mergeRequestLink} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '12px', textDecoration: 'none' }}
        >
          {record.mergeRequest}
        </a>
      ),
    },
    {
      title: 'Pre-Deploy Alerts',
      key: 'preAlerts',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>
          {record.preDeploymentAlerts}
        </Text>
      ),
    },
    {
      title: 'Post-Deploy Alerts',
      key: 'postAlerts',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <Text 
            style={{ 
              fontSize: '13px', 
              fontWeight: 'bold',
              color: getAlertCountColor(record.preDeploymentAlerts, record.postDeploymentAlerts)
            }}
          >
            {record.postDeploymentAlerts}
          </Text>
          <span style={{ fontSize: '10px' }}>
            {getAlertCountIcon(record.preDeploymentAlerts, record.postDeploymentAlerts)}
          </span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DeploymentEvent) => (
        <Tag 
          color={getStatusColor(record.status)} 
          style={{ 
            textTransform: 'capitalize',
            fontWeight: 'bold',
            minWidth: '70px',
            textAlign: 'center'
          }}
        >
          {record.status}
        </Tag>
      ),
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '16px' }}>
        Recent Deployments
      </div>
      <Table
        columns={columns}
        dataSource={displayDeployments}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
          showQuickJumper: false,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} deployments`
        }}
        size="small"
      />
      {isPlaceholder && (
        <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
          Placeholder data - GitHub/GitLab integration pending
        </Text>
      )}
    </div>
  );
};
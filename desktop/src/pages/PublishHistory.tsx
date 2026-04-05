import React, { useEffect } from 'react';
import { Table, Tag, Button, Space, message } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchPublishTasks } from '../store/publishSlice';
import { apiService } from '../services/api';

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'blue', label: '等待中' },
  running: { color: 'processing', label: '执行中' },
  success: { color: 'green', label: '成功' },
  failed: { color: 'red', label: '失败' },
  cancelled: { color: 'default', label: '已取消' },
};

const PublishHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, isLoading } = useSelector((state: RootState) => state.publish);

  useEffect(() => { dispatch(fetchPublishTasks()); }, [dispatch]);

  const handleRetry = async (id: number) => {
    await apiService.retryPublishTask(id);
    message.success('已重新加入队列');
    dispatch(fetchPublishTasks());
  };

  const handleCancel = async (id: number) => {
    await apiService.cancelPublishTask(id);
    message.success('已取消');
    dispatch(fetchPublishTasks());
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '文章ID', dataIndex: 'article_id', key: 'article_id', width: 80 },
    { title: '平台账号ID', dataIndex: 'platform_account_id', key: 'platform_account_id', width: 100 },
    { title: '方式', dataIndex: 'publish_method', key: 'publish_method', width: 80 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => { const info = statusMap[s] || { color: 'default', label: s }; return <Tag color={info.color}>{info.label}</Tag>; },
    },
    { title: '错误信息', dataIndex: 'error_message', key: 'error_message', ellipsis: true },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180,
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'failed' && <Button size="small" onClick={() => handleRetry(record.id)}>重试</Button>}
          {['pending', 'running'].includes(record.status) && <Button size="small" danger onClick={() => handleCancel(record.id)}>取消</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>发布历史</h1>
        <Button icon={<ReloadOutlined />} onClick={() => dispatch(fetchPublishTasks())}>刷新</Button>
      </div>
      <Table columns={columns} dataSource={tasks} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default PublishHistory;

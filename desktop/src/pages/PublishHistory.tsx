import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Space, Select, Input, message, Tooltip, Empty } from 'antd';
import { ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchPublishTasks } from '../store/publishSlice';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from '../components/PlatformIcon';

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'blue', label: '等待中' },
  running: { color: 'processing', label: '执行中' },
  success: { color: 'green', label: '成功' },
  failed: { color: 'red', label: '失败' },
  cancelled: { color: 'default', label: '已取消' },
};

const platformOptions = [
  { label: '全部平台', value: '' },
  ...Object.entries(platformNameMap).map(([value, label]) => ({ label, value })),
];

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '等待中', value: 'pending' },
  { label: '执行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '已取消', value: 'cancelled' },
];

const methodOptions = [
  { label: '全部方式', value: '' },
  { label: '本地', value: 'local' },
  { label: '云端', value: 'cloud' },
];

const PublishHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tasks, total, isLoading } = useSelector((state: RootState) => state.publish);

  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [articleIdFilter, setArticleIdFilter] = useState<number | undefined>(() => {
    const id = searchParams.get('article_id');
    return id ? parseInt(id, 10) : undefined;
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadTasks = useCallback(() => {
    const params: any = { skip: (page - 1) * pageSize, limit: pageSize };
    if (platformFilter) params.platform_name = platformFilter;
    if (statusFilter) params.status = statusFilter;
    if (articleIdFilter) params.article_id = articleIdFilter;
    if (methodFilter) {
      if (methodFilter === 'local') {
        params.publish_method = 'local';
      } else {
        params.publish_method = 'cloud';
      }
    }
    dispatch(fetchPublishTasks(params));
  }, [dispatch, page, platformFilter, statusFilter, methodFilter, articleIdFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleRetry = async (id: number) => {
    try {
      await apiService.retryPublishTask(id);
      message.success('已重新加入队列');
      loadTasks();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '重试失败');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiService.cancelPublishTask(id);
      message.success('已取消');
      loadTasks();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '取消失败');
    }
  };

  const columns = [
    {
      title: '文章', key: 'article', width: 200, ellipsis: true,
      render: (_: any, record: any) => (
        <a onClick={() => navigate(`/articles/${record.article_id}/edit`)} style={{ cursor: 'pointer' }}>
          {record.article_title || `文章 #${record.article_id}`}
        </a>
      ),
    },
    {
      title: '平台', key: 'platform', width: 160,
      render: (_: any, record: any) => {
        const name = record.platform_name;
        if (!name) return '-';
        return (
          <Space size={4}>
            <PlatformIcon platformName={name} size={14} showText={!!platformNameMap[name]} />
            {record.account_name && <span style={{ fontSize: 12, color: '#999' }}>({record.account_name})</span>}
          </Space>
        );
      },
    },
    {
      title: '方式', key: 'method', width: 80,
      render: (_: any, record: any) => {
        const isLocal = record.publish_method === 'local';
        return <Tag color={isLocal ? 'orange' : 'blue'}>{isLocal ? '本地' : '云端'}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => { const info = statusMap[s] || { color: 'default', label: s }; return <Tag color={info.color}>{info.label}</Tag>; },
    },
    {
      title: '链接', key: 'url', width: 60, align: 'center' as const,
      render: (_: any, record: any) => record.platform_post_url ? (
        <Tooltip title={record.platform_post_url}>
          <a href={record.platform_post_url} target="_blank" rel="noopener noreferrer"><LinkOutlined /></a>
        </Tooltip>
      ) : '-',
    },
    {
      title: '错误信息', dataIndex: 'error_message', key: 'error_message', ellipsis: true,
      render: (msg: string) => msg ? <Tooltip title={msg}><span style={{ color: '#ff4d4f', fontSize: 12 }}>{msg}</span></Tooltip> : '-',
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (t: string) => t ? new Date(t).toLocaleString() : '-',
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'failed' && <Button size="small" onClick={() => handleRetry(record.id)}>重试</Button>}
          {['pending', 'running'].includes(record.status) && <Button size="small" danger onClick={() => handleCancel(record.id)}>取消</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ margin: 0 }}>
          发布历史
          {articleIdFilter && <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666', marginLeft: 8 }}>文章 #{articleIdFilter}</span>}
        </h1>
        <Space>
          {articleIdFilter && (
            <Button onClick={() => { setArticleIdFilter(undefined); setPage(1); }}>清除文章筛选</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>刷新</Button>
        </Space>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <Select
          value={platformFilter}
          onChange={v => { setPlatformFilter(v); setPage(1); }}
          options={platformOptions}
          style={{ width: 140 }}
        />
        <Select
          value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
          options={statusOptions}
          style={{ width: 140 }}
        />
        <Select
          value={methodFilter}
          onChange={v => { setMethodFilter(v); setPage(1); }}
          options={methodOptions}
          style={{ width: 140 }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tasks.length === 0 && !isLoading ? (
          <Empty description="暂无发布记录" style={{ marginTop: 80 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: t => `共 ${t} 条`,
              onChange: (p) => setPage(p),
            }}
            scroll={{ x: 'max-content' }}
            style={{ height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

export default PublishHistory;

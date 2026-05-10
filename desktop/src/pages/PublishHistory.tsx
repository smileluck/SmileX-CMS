import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Tag, Button, Space, Select, Input, message, Tooltip, Empty, Modal, Spin, Badge } from 'antd';
import {
  ReloadOutlined, LinkOutlined, EyeOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  LoadingOutlined, StopOutlined, RedoOutlined, CloudOutlined,
  LaptopOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchPublishTasks } from '../store/publishSlice';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from '../components/PlatformIcon';

const statusMap: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: 'blue', label: '等待中', icon: <ClockCircleOutlined /> },
  running: { color: 'processing', label: '执行中', icon: <LoadingOutlined spin /> },
  success: { color: 'success', label: '成功', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', label: '失败', icon: <CloseCircleOutlined /> },
  cancelled: { color: 'default', label: '已取消', icon: <StopOutlined /> },
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

const formatTime = (t: string | null | undefined) => {
  if (!t) return '-';
  const d = new Date(t);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (start: string | null, end: string | null) => {
  if (!start) return null;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.round((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`;
};

const PublishHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tasks, total, isLoading } = useSelector((state: RootState) => state.publish);

  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [articleIdFilter, setArticleIdFilter] = useState<number | undefined>(() => {
    const id = searchParams.get('article_id');
    return id ? parseInt(id, 10) : undefined;
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadTasks = useCallback(() => {
    const params: any = { skip: (page - 1) * pageSize, limit: pageSize };
    if (platformFilter) params.platform_name = platformFilter;
    if (statusFilter) params.status = statusFilter;
    if (articleIdFilter) params.article_id = articleIdFilter;
    if (searchText) params.search = searchText;
    if (methodFilter) params.publish_method = methodFilter;
    dispatch(fetchPublishTasks(params));
  }, [dispatch, page, platformFilter, statusFilter, methodFilter, articleIdFilter, searchText]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 300);
  };

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

  const handlePreview = async (id: number) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml('');
    try {
      const html = await apiService.getPublishTaskPreview(id);
      setPreviewHtml(html);
    } catch (e: any) {
      message.error(e.response?.data?.detail || '预览加载失败');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const activeFilters = [platformFilter, statusFilter, methodFilter, articleIdFilter, searchText].filter(Boolean).length;

  const columns = [
    {
      title: '文章', key: 'article', width: 220, ellipsis: true,
      render: (_: any, record: any) => (
        <div>
          {record.article_deleted ? (
            <span style={{ color: '#999', textDecoration: 'line-through' }}>
              {record.article_title || '(已删除)'}
              <Tag color="default" style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>已删除</Tag>
            </span>
          ) : (
            <a onClick={() => navigate(`/articles/${record.article_id}/edit`)} style={{ cursor: 'pointer' }}>
              {record.article_title || `文章 #${record.article_id}`}
            </a>
          )}
          {record.article_version != null && (
            <Tag style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>v{record.article_version}</Tag>
          )}
        </div>
      ),
    },
    {
      title: '平台', key: 'platform', width: 180,
      render: (_: any, record: any) => {
        const name = record.platform_name;
        if (!name) return '-';
        return (
          <Space size={4}>
            <PlatformIcon platformName={name} size={16} showText={!!platformNameMap[name]} />
            {record.account_name && (
              <span style={{ fontSize: 11, color: '#999', background: '#f5f5f5', padding: '0 4px', borderRadius: 3 }}>
                {record.account_name}
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: '方式', key: 'method', width: 72, align: 'center' as const,
      render: (_: any, record: any) => {
        const isLocal = record.publish_method === 'local';
        return (
          <Tooltip title={isLocal ? '本地发布' : '云端发布'}>
            {isLocal ? <LaptopOutlined style={{ color: '#fa8c16' }} /> : <CloudOutlined style={{ color: '#1890ff' }} />}
          </Tooltip>
        );
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const info = statusMap[s] || { color: 'default', label: s, icon: null };
        return <Tag icon={info.icon} color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '耗时', key: 'duration', width: 80, align: 'center' as const,
      render: (_: any, record: any) => {
        const d = formatDuration(record.started_at, record.completed_at);
        if (!d) return <span style={{ color: '#ccc' }}>-</span>;
        return <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{d}</span>;
      },
    },
    {
      title: '详情', key: 'detail', ellipsis: true,
      render: (_: any, record: any) => {
        if (record.status === 'failed') {
          return (
            <Space size={8}>
              <Tooltip title={record.error_message || '未知错误'}>
                <span style={{ color: '#ff4d4f', fontSize: 12 }}>{record.error_message || '未知错误'}</span>
              </Tooltip>
              {!record.article_deleted && (
                <a style={{ fontSize: 12 }} onClick={() => handleRetry(record.id)}>
                  <RedoOutlined /> 重试
                </a>
              )}
            </Space>
          );
        }
        if (['pending', 'running'].includes(record.status)) {
          return (
            <a style={{ fontSize: 12, color: '#ff4d4f' }} onClick={() => handleCancel(record.id)}>
              <StopOutlined /> 取消
            </a>
          );
        }
        if (record.status === 'success' && record.platform_post_url) {
          if (record.publish_method === 'local') {
            return (
              <Tooltip title={record.platform_post_url}>
                <a style={{ fontSize: 12 }} onClick={() => handlePreview(record.id)}>
                  <EyeOutlined style={{ marginRight: 4 }} />{record.platform_post_url}
                </a>
              </Tooltip>
            );
          }
          return (
            <Space size={8}>
              <Tooltip title="预览发布内容">
                <a style={{ fontSize: 12 }} onClick={() => handlePreview(record.id)}>
                  <EyeOutlined style={{ marginRight: 4 }} />预览
                </a>
              </Tooltip>
              <Tooltip title={record.platform_post_url}>
                <a href={record.platform_post_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                  <LinkOutlined style={{ marginRight: 4 }} />原文
                </a>
              </Tooltip>
            </Space>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      },
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 100, align: 'center' as const,
      render: (t: string) => (
        <Tooltip title={t ? new Date(t).toLocaleString() : '-'}>
          <span style={{ fontSize: 12, color: '#666' }}>{formatTime(t)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            <HistoryOutlined style={{ marginRight: 6 }} />发布历史
          </h2>
          {activeFilters > 0 && (
            <Badge count={activeFilters} size="small" style={{ marginLeft: -4 }}>
              <span />
            </Badge>
          )}
          {articleIdFilter && (
            <Tag closable onClose={() => { setArticleIdFilter(undefined); setPage(1); }} style={{ margin: 0 }}>
              文章 #{articleIdFilter}
            </Tag>
          )}
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadTasks} size="small">刷新</Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <Input
          placeholder="搜索文章标题"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => handleSearchChange(e.target.value)}
          allowClear
          style={{ width: 180 }}
          size="small"
        />
        <Select
          value={platformFilter}
          onChange={v => { setPlatformFilter(v); setPage(1); }}
          options={platformOptions}
          style={{ width: 120 }}
          size="small"
        />
        <Select
          value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
          options={statusOptions}
          style={{ width: 120 }}
          size="small"
        />
        <Select
          value={methodFilter}
          onChange={v => { setMethodFilter(v); setPage(1); }}
          options={methodOptions}
          style={{ width: 120 }}
          size="small"
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tasks.length === 0 && !isLoading ? (
          <Empty description="暂无发布记录" style={{ marginTop: 80 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              current: page,
              pageSize,
              total,
              size: 'small',
              showTotal: t => `共 ${t} 条`,
              onChange: (p) => setPage(p),
            }}
            scroll={{ x: 'max-content' }}
            style={{ height: '100%' }}
          />
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        title="发布预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
        styles={{ body: { height: 500, overflow: 'auto', padding: 0 } }}
      >
        {previewLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </Modal>
    </div>
  );
};

export default PublishHistory;

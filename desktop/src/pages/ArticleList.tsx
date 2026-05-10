import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space, Input, message, Modal, Tooltip, Select, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, LoadingOutlined, LinkOutlined, SendOutlined, HistoryOutlined, FolderOpenOutlined, StopOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchArticles, createArticle, deleteArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from '../components/PlatformIcon';
import PublishModal from '../components/PublishModal';
import type { ArticlePublishStatus, ScannedArticle, ScanResult } from '../types';

const statusTagMap: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
  pending: { color: 'blue', label: '等待中', icon: <ClockCircleOutlined /> },
  running: { color: 'processing', label: '执行中', icon: <LoadingOutlined /> },
  success: { color: 'green', label: '成功', icon: <CheckCircleOutlined /> },
  failed: { color: 'red', label: '失败', icon: <CloseCircleOutlined /> },
  cancelled: { color: 'default', label: '已取消' },
};

const ArticleList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { articles, isLoading } = useSelector((state: RootState) => state.article);
  const { tags } = useSelector((state: RootState) => state.tag);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
  const [publishSummary, setPublishSummary] = useState<Record<number, ArticlePublishStatus[]>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishingArticleId, setPublishingArticleId] = useState<number | null>(null);

  // scan state
  const [scanLoading, setScanLoading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [extractMedia, setExtractMedia] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    dispatch(fetchArticles({ search: debouncedSearch || undefined, tag_id: selectedTagId }));
  }, [dispatch, debouncedSearch, selectedTagId]);

  useEffect(() => {
    apiService.getArticlesPublishSummary()
      .then(data => setPublishSummary(data))
      .catch(() => {});
  }, [articles]);

  const hasActiveTasks = useMemo(() => {
    return Object.values(publishSummary).some(statuses =>
      statuses.some(s => s.status === 'pending' || s.status === 'running')
    );
  }, [publishSummary]);

  useEffect(() => {
    if (!hasActiveTasks) return;
    const timer = setInterval(() => {
      apiService.getArticlesPublishSummary()
        .then(data => setPublishSummary(data))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasActiveTasks]);

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这篇文章吗？',
      onOk: async () => {
        try {
          await dispatch(deleteArticle(id)).unwrap();
          message.success('删除成功');
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handlePublish = (articleId: number) => {
    setPublishingArticleId(articleId);
    setPublishModalOpen(true);
  };

  const handlePublishSuccess = useCallback(() => {
    setPublishModalOpen(false);
    setPublishingArticleId(null);
    message.success('发布任务已创建');
    dispatch(fetchArticles({ search: debouncedSearch || undefined, tag_id: selectedTagId }));
    apiService.getArticlesPublishSummary()
      .then(data => setPublishSummary(data))
      .catch(() => {});
  }, [dispatch, debouncedSearch, selectedTagId]);

  const handleCreateArticle = async () => {
    const trimmed = newArticleTitle.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const result = await dispatch(createArticle({ title: trimmed, content: '' })).unwrap();
      setCreateModalOpen(false);
      setNewArticleTitle('');
      navigate(`/articles/${result.id}/edit`);
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleScan = async () => {
    setScanLoading(true);
    try {
      const result = await apiService.scanArticles();
      setScanResult(result);
      setSelectedRowKeys(result.new_articles.map((_, i) => i));
      setScanModalOpen(true);
      if (result.new_articles.length === 0 && result.existing_count > 0) {
        message.info(`扫描完成：所有 ${result.existing_count} 篇文章均已导入`);
      }
    } catch {
      message.error('扫描失败');
    } finally {
      setScanLoading(false);
    }
  };

  const handleImport = async () => {
    if (!scanResult || selectedRowKeys.length === 0) return;
    setImportLoading(true);
    try {
      const selected = selectedRowKeys.map(key => scanResult.new_articles[key as number]);
      const result = await apiService.importArticles(selected, extractMedia);
      message.success(`成功导入 ${result.imported_count} 篇文章${result.media_imported > 0 ? `，${result.media_imported} 个素材` : ''}`);
      setScanModalOpen(false);
      setScanResult(null);
      dispatch(fetchArticles({ search: debouncedSearch || undefined, tag_id: selectedTagId }));
    } catch {
      message.error('导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const renderPublishStatus = (articleId: number) => {
    const statuses = publishSummary[articleId];
    if (!statuses || statuses.length === 0) return (
      <a onClick={() => navigate(`/publish/history?article_id=${articleId}`)} style={{ fontSize: 12, color: '#999' }}>
        <HistoryOutlined /> 暂无记录
      </a>
    );

    const latestMap = new Map<string, ArticlePublishStatus>();
    for (const s of statuses) {
      const key = `${s.platform_name}:${s.account_name}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, s);
      }
    }
    const latestStatuses = Array.from(latestMap.values());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {latestStatuses.map((s, i) => {
          const tagInfo = statusTagMap[s.status] || { color: 'default', label: s.status };
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <PlatformIcon platformName={s.platform_name} size={14} />
              <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.account_name}</span>
              {s.status === 'success' && s.platform_post_url ? (
                <Tooltip title={s.platform_post_url}>
                  <a href={s.platform_post_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                    <Tag color={tagInfo.color} style={{ margin: 0, fontSize: 11 }}>{tagInfo.label}</Tag>
                  </a>
                </Tooltip>
              ) : s.status === 'failed' ? (
                <Tooltip title={s.error_message || '未知错误'}>
                  <Tag color={tagInfo.color} style={{ margin: 0, fontSize: 11, cursor: 'pointer' }}>{tagInfo.label}</Tag>
                </Tooltip>
              ) : (
                <Tag color={tagInfo.color} icon={tagInfo.icon} style={{ margin: 0, fontSize: 11 }}>{tagInfo.label}</Tag>
              )}
            </div>
          );
        })}
        {statuses.length > 0 && (
          <a onClick={() => navigate(`/publish/history?article_id=${articleId}`)} style={{ fontSize: 11, color: '#1890ff' }}>
            <HistoryOutlined /> 查看历史
          </a>
        )}
      </div>
    );
  };

  const columns = [
    { title: '文章名称', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = { draft: { color: 'blue', label: '草稿' }, published: { color: 'green', label: '已发布' }, archived: { color: 'default', label: '归档' } };
        const info = map[s] || { color: 'default', label: s };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '发布状态', key: 'publish_status', width: 260,
      render: (_: any, record: any) => renderPublishStatus(record.id),
    },
    {
      title: '版本', key: 'version', width: 80,
      render: (_: any, record: any) => (
        <span
          style={{ fontSize: 12, color: record.version_count > 0 ? '#1890ff' : '#999', cursor: 'pointer' }}
          onClick={() => navigate(`/articles/${record.id}/versions`)}
        >
          {record.version_count || 0}
        </span>
      ),
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 200,
      render: (tags: string[], record: any) => {
        if (record.tag_objects && record.tag_objects.length > 0) {
          return record.tag_objects.map((t: any, i: number) => <Tag key={i} color={t.color || undefined}>{t.name}</Tag>);
        }
        return tags?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>) || '-';
      },
    },
    {
      title: '时间', key: 'time', width: 180,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 12, lineHeight: '20px' }}>
          <div>创建：{record.created_at ? new Date(record.created_at).toLocaleString() : '-'}</div>
          <div>更新：{record.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}</div>
        </div>
      ),
    },
    {
      title: '操作', key: 'action', width: 240,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/articles/${record.id}/edit`)}>编辑</Button>
          <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublish(record.id)}>发布</Button>
          {record.status === 'published' ? (
            <Tooltip title="已发布的文章不允许删除">
              <Button size="small" danger icon={<DeleteOutlined />} disabled>删除</Button>
            </Tooltip>
          ) : (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
          )}
        </Space>
      ),
    },
  ];

  const scanColumns = [
    {
      title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 250,
    },
    {
      title: '类型', dataIndex: 'article_type', key: 'article_type', width: 80,
      render: (t: string) => t === 'video' ? <Tag color="purple">视频</Tag> : <Tag color="blue">图文</Tag>,
    },
    {
      title: '图片数', dataIndex: 'images_count', key: 'images_count', width: 80,
      render: (n: number) => <span>{n}</span>,
    },
    {
      title: '内容预览', dataIndex: 'content', key: 'content', ellipsis: true,
      render: (c: string) => {
        const text = c.replace(/[#*_\[\]()>!`~-]/g, '').replace(/\n+/g, ' ').trim();
        return <span style={{ color: '#666', fontSize: 12 }}>{text.slice(0, 100)}</span>;
      },
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h1>图文管理</h1>
        <Space>
          <Input placeholder="搜索文章" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} allowClear />
          <Select
            placeholder="按标签筛选"
            allowClear
            style={{ width: 180 }}
            value={selectedTagId}
            onChange={setSelectedTagId}
            options={tags.map(t => ({ label: t.name, value: t.id }))}
          />
          <Button icon={<FolderOpenOutlined />} loading={scanLoading} onClick={handleScan}>扫描文章</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>新建文章</Button>
        </Space>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Table columns={columns} dataSource={articles} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} style={{ height: '100%' }} />
      </div>
      {publishingArticleId && (
        <PublishModal
          open={publishModalOpen}
          articleId={publishingArticleId}
          onCancel={() => { setPublishModalOpen(false); setPublishingArticleId(null); }}
          onSuccess={handlePublishSuccess}
        />
      )}
      <Modal
        title="扫描结果"
        open={scanModalOpen}
        onCancel={() => { setScanModalOpen(false); setScanResult(null); }}
        width={800}
        footer={
          scanResult && scanResult.new_articles.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Checkbox checked={extractMedia} onChange={e => setExtractMedia(e.target.checked)}>
                将图片素材导入到素材库
              </Checkbox>
              <Space>
                <Button onClick={() => { setScanModalOpen(false); setScanResult(null); }}>取消</Button>
                <Button
                  type="primary"
                  loading={importLoading}
                  disabled={selectedRowKeys.length === 0}
                  onClick={handleImport}
                >
                  导入选中（{selectedRowKeys.length}）
                </Button>
              </Space>
            </div>
          ) : null
        }
      >
        {scanResult && (
          <>
            <div style={{ marginBottom: 12, color: '#666' }}>
              扫描到 <b>{scanResult.total_scanned}</b> 个文章目录，
              新发现 <b style={{ color: '#1890ff' }}>{scanResult.new_articles.length}</b> 篇，
              已存在 <b>{scanResult.existing_count}</b> 篇
            </div>
            {scanResult.new_articles.length > 0 ? (
              <Table
                columns={scanColumns}
                dataSource={scanResult.new_articles}
                rowKey={(_, index) => index!}
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                未发现新的文章目录
              </div>
            )}
          </>
        )}
      </Modal>
      <Modal
        title="新建文章"
        open={createModalOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        okButtonProps={{ disabled: !newArticleTitle.trim() }}
        onOk={handleCreateArticle}
        onCancel={() => { setCreateModalOpen(false); setNewArticleTitle(''); }}
        destroyOnClose
      >
        <Input
          placeholder="请输入文章标题"
          value={newArticleTitle}
          onChange={e => setNewArticleTitle(e.target.value)}
          onPressEnter={handleCreateArticle}
          maxLength={255}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default ArticleList;

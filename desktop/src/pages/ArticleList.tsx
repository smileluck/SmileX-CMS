import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space, Input, message, Modal, Tooltip, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, LoadingOutlined, LinkOutlined, SendOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchArticles, deleteArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from '../components/PlatformIcon';
import PublishModal from '../components/PublishModal';
import type { ArticlePublishStatus } from '../types';

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

  const renderPublishStatus = (articleId: number) => {
    const statuses = publishSummary[articleId];
    if (!statuses || statuses.length === 0) return '-';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {statuses.map((s, i) => {
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
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/articles/new')}>新建文章</Button>
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
    </div>
  );
};

export default ArticleList;

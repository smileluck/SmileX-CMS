import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space, Input, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchArticles, deleteArticle } from '../store/articleSlice';
import { apiService } from '../services/api';

const ArticleList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { articles, isLoading } = useSelector((state: RootState) => state.article);
  const [search, setSearch] = React.useState('');

  useEffect(() => { dispatch(fetchArticles({ search: search || undefined })); }, [dispatch, search]);

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这篇文章吗？',
      onOk: async () => {
        await dispatch(deleteArticle(id)).unwrap();
        message.success('删除成功');
      },
    });
  };

  const handleDuplicate = async (id: number) => {
    try {
      await apiService.duplicateArticle(id);
      message.success('复制成功');
      dispatch(fetchArticles({}));
    } catch { message.error('复制失败'); }
  };

  const columns = [
    { title: 'SnowID', dataIndex: 'snow_id', key: 'snow_id', width: 180, ellipsis: true },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '类型', dataIndex: 'article_type', key: 'article_type', width: 80,
      render: (t: string) => <Tag color={t === 'video' ? 'purple' : 'blue'}>{t === 'video' ? '视频' : '图文'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = { draft: { color: 'blue', label: '草稿' }, published: { color: 'green', label: '已发布' }, archived: { color: 'default', label: '归档' } };
        const info = map[s] || { color: 'default', label: s };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 200,
      render: (tags: string[]) => tags?.map((t, i) => <Tag key={i}>{t}</Tag>) || '-',
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180,
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/articles/${record.id}/edit`)}>编辑</Button>
          <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(record.id)}>复制</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>图文管理</h1>
        <Space>
          <Input placeholder="搜索文章" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/articles/new')}>新建文章</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={articles} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default ArticleList;

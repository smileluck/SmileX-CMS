import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchArticles } from '../store/articleSlice';

const VideoList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { articles, isLoading } = useSelector((state: RootState) => state.article);
  const videos = articles.filter(a => a.article_type === 'video');

  useEffect(() => {
    dispatch(fetchArticles({ article_type: 'video' }));
  }, [dispatch]);

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = {
          draft: { color: 'blue', label: '草稿' },
          published: { color: 'green', label: '已发布' },
          archived: { color: 'default', label: '归档' },
        };
        const info = map[s] || { color: 'default', label: s };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180,
      render: (t: string) => t ? new Date(t).toLocaleString() : '-',
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, record: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/videos/${record.id}/edit`)}>编辑</Button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h1>视频管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/videos/new')}>新建视频</Button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Table columns={columns} dataSource={videos} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} style={{ height: '100%' }} />
      </div>
    </div>
  );
};

export default VideoList;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Space, Select, message, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchArticles, createArticle, updateArticle } from '../store/articleSlice';
import { apiService } from '../services/api';

const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      apiService.getArticleById(Number(id)).then(article => {
        setTitle(article.title);
        setContent(article.content);
        setTags(article.tags || []);
        setLoading(false);
      }).catch(() => { message.error('加载失败'); navigate('/articles'); });
    }
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { message.warning('请输入标题'); return; }
    setSaving(true);
    try {
      if (id) {
        await dispatch(updateArticle({ id: Number(id), data: { title, content, tags } })).unwrap();
        message.success('保存成功');
      } else {
        const article = await dispatch(createArticle({ title, content, tags })).unwrap();
        message.success('创建成功');
        navigate(`/articles/${article.id}/edit`, { replace: true });
      }
    } catch { message.error('保存失败'); }
    setSaving(false);
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>返回</Button>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入标题" style={{ width: 400, fontSize: 16 }} />
        </Space>
        <Space>
          <Select mode="tags" value={tags} onChange={setTags} placeholder="添加标签" style={{ width: 200 }} />
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handleSave}>发布</Button>
        </Space>
      </div>
      <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'auto' }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ width: '100%', height: '100%', border: 'none', outline: 'none', padding: 16, fontSize: 14, fontFamily: 'monospace', resize: 'none' }}
          placeholder="在此输入 Markdown 内容..."
        />
      </div>
    </div>
  );
};

export default ArticleEditor;

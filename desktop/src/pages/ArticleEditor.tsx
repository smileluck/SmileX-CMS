import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Space, Select, message, Spin, Upload, Tooltip } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, PictureOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { createArticle, updateArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { apiService } from '../services/api';
import { renderMarkdown } from '../utils/markdown';
import PublishModal from '../components/PublishModal';

const MilkdownEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    let destroyed = false;

    (async () => {
      try {
        const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/core');
        const { commonmark } = await import('@milkdown/preset-commonmark');
        const { gfm } = await import('@milkdown/preset-gfm');
        const { nord } = await import('@milkdown/theme-nord');
        const { ReactEditor } = await import('@milkdown/react');
        const { listener, listenerCtx } = await import('@milkdown/plugin-listener');

        await import('@milkdown/theme-nord/style.css');

        if (destroyed || !editorRef.current) return;

        const editor = await Editor.make()
          .config((ctx) => {
            ctx.set(rootCtx, editorRef.current);
            ctx.set(defaultValueCtx, valueRef.current);
            ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
              onChangeRef.current(markdown);
            });
          })
          .use(nord)
          .use(commonmark)
          .use(gfm)
          .use(listener)
          .create();

        if (!destroyed) {
          editorInstanceRef.current = editor;
        }
      } catch (err) {
        console.warn('Milkdown failed to load, falling back to textarea:', err);
      }
    })();

    return () => { destroyed = true; };
  }, []);

  return <div ref={editorRef} style={{ height: '100%', overflow: 'auto' }} />;
};

const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { tags: allTags } = useSelector((state: RootState) => state.tag);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [previewHtml, setPreviewHtml] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [articleId, setArticleId] = useState<number | null>(id ? Number(id) : null);

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiService.getArticleById(Number(id)).then(article => {
      if (cancelled) return;
      setTitle(article.title);
      setContent(article.content);
      setTagIds(article.tag_objects?.map(t => t.id) || []);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      message.error('加载失败');
      navigate('/articles');
    });
    return () => { cancelled = true; };
  }, [id, navigate]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const html = await renderMarkdown(content);
      if (!cancelled) setPreviewHtml(html);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content]);

  const handleSave = useCallback(async (shouldNavigate: boolean = false) => {
    if (!title.trim()) { message.warning('请输入标题'); return null; }
    setSaving(true);
    try {
      const data: any = { title, content, tag_ids: tagIds };
      let result: any;
      if (articleId) {
        result = await dispatch(updateArticle({ id: articleId, data })).unwrap();
        message.success('保存成功');
      } else {
        result = await dispatch(createArticle(data)).unwrap();
        setArticleId(result.id);
        message.success('创建成功');
        if (shouldNavigate) {
          navigate(`/articles/${result.id}/edit`, { replace: true });
        }
      }
      return result;
    } catch {
      message.error('保存失败');
      return null;
    } finally {
      setSaving(false);
    }
  }, [articleId, title, content, tagIds, dispatch, navigate]);

  const handleSaveAndGo = useCallback(async () => {
    const result = await handleSave(true);
    if (result) {
      navigate('/articles/success', { state: { articleId: articleId || result.id, articleTitle: title, action: 'save' } });
    }
  }, [handleSave, navigate, articleId, title]);

  const handlePublish = useCallback(async () => {
    const result = await handleSave(true);
    if (result) {
      setPublishModalOpen(true);
    }
  }, [handleSave]);

  const handlePublishComplete = useCallback(() => {
    setPublishModalOpen(false);
    navigate('/articles/success', { state: { articleId, articleTitle: title, action: 'publish' } });
  }, [navigate, articleId, title]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!articleId) {
      const result = await handleSave(true);
      if (!result) return;
    }
    try {
      const media = await apiService.uploadToArticle(articleId!, file);
      const imgMd = `![${file.name}](./${media.file_path.replace(/^\.\//, '')})`;
      setContent(prev => prev + '\n' + imgMd);
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  }, [articleId, handleSave]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      e.preventDefault();
      for (const file of files) {
        await handleImageUpload(file);
      }
    }
  }, [handleImageUpload]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      e.preventDefault();
      for (const file of files) {
        await handleImageUpload(file);
      }
    }
  }, [handleImageUpload]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} onPaste={handlePaste} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>返回</Button>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入标题" style={{ width: 400, fontSize: 16 }} />
        </Space>
        <Space>
          <Select
            mode="multiple"
            value={tagIds}
            onChange={setTagIds}
            placeholder="选择标签"
            style={{ width: 240 }}
            options={allTags.map(t => ({ label: t.name, value: t.id }))}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                  <a href="/tags" style={{ fontSize: 12 }}>管理标签</a>
                </div>
              </>
            )}
          />
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => { handleImageUpload(file); return false; }}
          >
            <Tooltip title="插入图片">
              <Button icon={<PictureOutlined />} />
            </Tooltip>
          </Upload>
          <Button icon={<SaveOutlined />} onClick={handleSaveAndGo} loading={saving}>保存</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handlePublish} loading={saving}>发布</Button>
        </Space>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#666', background: '#fafafa' }}>编辑</div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <MilkdownEditor value={content} onChange={setContent} />
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#666', background: '#fafafa' }}>预览</div>
          <div
            style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
      {articleId && (
        <PublishModal
          open={publishModalOpen}
          articleId={articleId}
          onCancel={() => setPublishModalOpen(false)}
          onSuccess={handlePublishComplete}
        />
      )}
    </div>
  );
};

export default ArticleEditor;

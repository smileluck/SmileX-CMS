import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Space, Select, message, Spin, Upload, Tooltip, Form, Radio, Switch, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, CopyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { createArticle, updateArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { apiService } from '../services/api';
import { renderMarkdown } from '../utils/markdown';
import { inlineStyles } from '../utils/inlineStyles';
import { useAutoSave } from '../utils/useAutoSave';
import PublishModal from '../components/PublishModal';
import EditorToolbar from '../components/Editor/EditorToolbar';
import PlatformPreview from '../components/Preview/PlatformPreview';
import type { PlatformKey } from '../components/Preview/PlatformPreview';

const MilkdownEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  editorContainerRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ value, onChange, editorContainerRef }) => {
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
        console.warn('Milkdown failed to load:', err);
      }
    })();

    return () => { destroyed = true; };
  }, []);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (editorContainerRef && node) {
      const parent = node.parentElement;
      const grandparent = parent ? parent.parentElement : null;
      (editorContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = grandparent as HTMLDivElement | null;
    }
  }, [editorContainerRef]);

  return <div ref={refCallback} style={{ height: '100%', overflow: 'auto' }} />;
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
  const [platform, setPlatform] = useState<PlatformKey>('wechat_mp');
  const [syncScroll, setSyncScroll] = useState(true);
  const [editorReady, setEditorReady] = useState(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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

  const doSave = useCallback(async (shouldNavigate: boolean = false) => {
    if (!title.trim()) { message.warning('请输入标题'); return null; }
    setSaving(true);
    try {
      const data: any = { title, content, tag_ids: tagIds };
      let result: any;
      if (articleId) {
        result = await dispatch(updateArticle({ id: articleId, data })).unwrap();
      } else {
        result = await dispatch(createArticle(data)).unwrap();
        setArticleId(result.id);
        if (shouldNavigate) {
          navigate(`/articles/${result.id}/edit`, { replace: true });
        }
      }
      return result;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [articleId, title, content, tagIds, dispatch, navigate]);

  const autoSaveFn = useCallback(async () => {
    if (!title.trim() || !articleId) return;
    await doSave(false);
  }, [doSave, title, articleId]);

  const { status: autoSaveStatus } = useAutoSave(autoSaveFn, content + title, 30000);

  const handleSaveAndGo = useCallback(async () => {
    const result = await doSave(true);
    if (result) {
      message.success('保存成功');
      navigate('/articles/success', { state: { articleId: articleId || result.id, articleTitle: title, action: 'save' } });
    }
  }, [doSave, navigate, articleId, title]);

  const handlePublish = useCallback(async () => {
    const result = await doSave(true);
    if (result) {
      setPublishModalOpen(true);
    }
  }, [doSave]);

  const handlePublishComplete = useCallback(() => {
    setPublishModalOpen(false);
    navigate('/articles/success', { state: { articleId, articleTitle: title, action: 'publish' } });
  }, [navigate, articleId, title]);

  const handleImageUpload = useCallback(async (file: File) => {
    let uploadId = articleId;
    if (!uploadId) {
      const result = await doSave(true);
      if (!result) return;
      uploadId = result.id;
    }
    try {
      const media = await apiService.uploadToArticle(uploadId!, file);
      const imgMd = `![${file.name}](./${media.file_path})`;
      setContent(prev => prev + '\n' + imgMd);
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  }, [articleId, doSave]);

  const handleInsertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const insertion = before + (placeholder || '') + (after || '');
    setContent(prev => prev + insertion);
  }, []);

  const handleCopyRichText = useCallback(async () => {
    if (!previewHtml) {
      message.warning('预览内容为空');
      return;
    }
    try {
      const styledHtml = inlineStyles(previewHtml, platform);
      const blob = new Blob([styledHtml], { type: 'text/html' });
      const textBlob = new Blob([styledHtml], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ]);
      message.success('富文本已复制，可直接粘贴到编辑器');
    } catch (err) {
      console.error('Copy failed:', err);
      message.error('复制失败，请检查浏览器权限');
    }
  }, [previewHtml, platform]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doSave]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const autoSaveLabel = autoSaveStatus === 'saving' ? '保存中...' :
    autoSaveStatus === 'saved' ? '已自动保存' :
    autoSaveStatus === 'error' ? '自动保存失败' : '';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} onPaste={handlePaste} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>返回</Button>
          {autoSaveLabel && (
            <span style={{ fontSize: 12, color: autoSaveStatus === 'error' ? '#ff4d4f' : '#999' }}>{autoSaveLabel}</span>
          )}
        </Space>
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleCopyRichText} disabled={!previewHtml}>
            复制富文本
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSaveAndGo} loading={saving}>保存</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handlePublish} loading={saving}>发布</Button>
        </Space>
      </div>
      <Form layout="inline" style={{ marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Form.Item label="标题" style={{ marginBottom: 0, flex: '1 1 300px', maxWidth: 500 }}>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入标题" size="large" />
        </Form.Item>
        <Form.Item label="标签" style={{ marginBottom: 0, flex: '1 1 240px' }}>
          <Select
            mode="multiple"
            value={tagIds}
            onChange={setTagIds}
            placeholder="选择标签"
            style={{ width: '100%', minWidth: 240 }}
            options={allTags.map(t => ({ label: t.name, value: t.id }))}
            popupRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                  <a href="/tags" style={{ fontSize: 12 }}>管理标签</a>
                </div>
              </>
            )}
          />
        </Form.Item>
      </Form>
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <EditorToolbar
            onInsertMarkdown={handleInsertMarkdown}
            onImageUpload={handleImageUpload}
            editorReady={editorReady}
          />
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <MilkdownEditor value={content} onChange={setContent} editorContainerRef={editorContainerRef} />
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '6px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <Radio.Group
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              size="small"
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="wechat_mp">公众号</Radio.Button>
              <Radio.Button value="common">通用</Radio.Button>
            </Radio.Group>
            <Space size={8}>
              <span style={{ fontSize: 12, color: '#999' }}>同步滚动</span>
              <Switch size="small" checked={syncScroll} onChange={setSyncScroll} />
            </Space>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12, minHeight: 0, display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
            <PlatformPreview
              html={previewHtml}
              platform={platform}
              syncScrollRef={editorContainerRef}
              syncEnabled={syncScroll}
            />
          </div>
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

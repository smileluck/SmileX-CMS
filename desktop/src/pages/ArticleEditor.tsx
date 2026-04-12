import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Space, Select, message, Spin, Tooltip, Radio, Switch, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { createArticle, updateArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { fetchPlatforms } from '../store/platformSlice';
import { apiService } from '../services/api';
import { renderMarkdown } from '../utils/markdown';
import { inlineStyles } from '../utils/inlineStyles';
import { useAutoSave } from '../utils/useAutoSave';
import { useHistory } from '../hooks/useHistory';
import EditorToolbar from '../components/Editor/EditorToolbar';
import VersionHistory from '../components/Editor/VersionHistory';
import PlatformPreview from '../components/Preview/PlatformPreview';
import PlatformIcon, { platformNameMap } from '../components/PlatformIcon';
import type { PlatformKey } from '../components/Preview/PlatformPreview';

const MilkdownEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  editorContainerRef?: React.RefObject<HTMLDivElement | null>;
  articleId: number | null;
  articleFilePath?: string | null;
  onPendingImage?: (mediaId: number, originalPath: string) => void;
}> = ({ value, onChange, editorContainerRef, articleId, articleFilePath, onPendingImage }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const articleIdRef = useRef(articleId);
  const articleFilePathRef = useRef(articleFilePath);
  const onPendingImageRef = useRef(onPendingImage);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { articleIdRef.current = articleId; }, [articleId]);
  useEffect(() => { articleFilePathRef.current = articleFilePath; }, [articleFilePath]);
  useEffect(() => { onPendingImageRef.current = onPendingImage; }, [onPendingImage]);

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
        const { uploadConfig, uploadPlugin } = await import('@milkdown/plugin-upload');
        const { Fragment } = await import('@milkdown/prose/model');
        const { Decoration } = await import('@milkdown/prose/view');

        await import('@milkdown/theme-nord/style.css');

        if (destroyed || !editorRef.current) return;

        const customUploader = async (files: FileList, schema: any, ctx: any, insertPos: number) => {
          const imgs: File[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file && file.type.includes('image')) imgs.push(file);
          }
          if (imgs.length === 0) return Fragment.empty;

          const { image } = schema.nodes;
          if (!image) return Fragment.empty;

          const nodes = await Promise.all(imgs.map(async (file) => {
            try {
              let filePath: string;
              const currentArticleId = articleIdRef.current;
              if (currentArticleId) {
                const media = await apiService.uploadToArticle(currentArticleId, file);
                filePath = media.file_path;
              } else {
                const media = await apiService.uploadFile(file);
                filePath = media.file_path;
                if (onPendingImageRef.current) {
                  onPendingImageRef.current(media.id, media.file_path);
                }
              }
              const src = apiService.getMediaUrl(filePath);
              return image.createAndFill({ src, alt: file.name });
            } catch (err) {
              console.error('Image upload failed:', err);
              return null;
            }
          }));

          const validNodes = nodes.filter((n): n is any => n !== null);
          if (validNodes.length === 0) return Fragment.empty;
          return Fragment.from(validNodes);
        };

        const editor = await Editor.make()
          .config((ctx) => {
            ctx.set(rootCtx, editorRef.current);
            // Preprocess: convert ./images/xxx.png to full URLs for display in editor
            let displayValue = valueRef.current;
            const storagePath = articleFilePathRef.current;
            if (storagePath) {
              displayValue = displayValue.replace(
                /!\[([^\]]*)\]\(\.\/images\/([^)]+)\)/g,
                (_match: string, alt: string, filename: string) => {
                  return `![${alt}](${apiService.getMediaUrl(`images/${filename}`, storagePath)})`;
                }
              );
            }
            ctx.set(defaultValueCtx, displayValue);
            ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
              // Convert full storage URLs back to ./images/xxx.png for storage
              let processed = markdown;
              processed = processed.replace(
                /!\[([^\]]*)\]\([^)]*\/storage-files\/[^)]*\/(images\/[^/?)]+)(?:\?[^)]*)?\)/g,
                (_match: string, alt: string, imgPath: string) => {
                  return `![${alt}](./${imgPath})`;
                }
              );
              onChangeRef.current(processed);
            });
            ctx.set(uploadConfig.key, {
              uploader: customUploader,
              enableHtmlFileUploader: true,
              uploadWidgetFactory: (pos: number, spec: any) => {
                const widgetDOM = document.createElement('span');
                widgetDOM.textContent = '上传中...';
                widgetDOM.style.color = '#999';
                widgetDOM.style.fontSize = '13px';
                return Decoration.widget(pos, widgetDOM, spec);
              },
            });
          })
          .use(nord)
          .use(commonmark)
          .use(gfm)
          .use(listener)
          .use(uploadConfig)
          .use(uploadPlugin)
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

  return <div ref={refCallback} style={{ height: '100%', overflow: 'hidden' }} />;
};

const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { tags: allTags } = useSelector((state: RootState) => state.tag);
  const { accounts: platformAccounts } = useSelector((state: RootState) => state.platform);
  const [title, setTitle] = useState('');
  const [content, setContentRaw] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [previewHtml, setPreviewHtml] = useState('');
  const [articleId, setArticleId] = useState<number | null>(id ? Number(id) : null);
  const [platform, setPlatform] = useState<PlatformKey>('mobile');
  const [syncScroll, setSyncScroll] = useState(true);
  const [editorReady, setEditorReady] = useState(true);
  const [editMode, setEditMode] = useState<'wysiwyg' | 'markdown'>('markdown');
  const [pendingImages, setPendingImages] = useState<{ mediaId: number; originalPath: string }[]>([]);
  const [articleFilePath, setArticleFilePath] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const markSavedRef = useRef<(() => void) | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  const historyManager = useHistory('');
  const setContent = useCallback((valueOrUpdater: string | ((prev: string) => string), description: string = '编辑内容') => {
    setContentRaw(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      if (next !== prev) {
        historyManager.pushState(next, description);
      }
      return next;
    });
  }, [historyManager]);

  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchPlatforms());
  }, [dispatch]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiService.getArticleById(Number(id)).then(article => {
      if (cancelled) return;
      setTitle(article.title);
      setContentRaw(article.content);
      historyManager.pushState(article.content, '加载文章');
      setTagIds(article.tag_objects?.map(t => t.id) || []);
      setArticleFilePath(article.file_path);
      setLoading(false);
      apiService.createArticleVersion(Number(id)).then(version => {
        if (!cancelled) setCurrentVersionId(version.id);
      }).catch(() => {});
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
      const html = await renderMarkdown(content, articleFilePath);
      if (!cancelled) setPreviewHtml(html);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content, articleFilePath]);

  const autoSaveFn = useCallback(async () => {
    if (!title.trim() || !articleId) return;
    const data: any = { title, content, tag_ids: tagIds };
    try {
      await dispatch(updateArticle({ id: articleId, data })).unwrap();
    } catch {}
  }, [title, articleId, content, tagIds, dispatch]);

  const { status: autoSaveStatus, lastSavedAtFormatted, markSaved } = useAutoSave(autoSaveFn, content + title, 3000);

  useEffect(() => { markSavedRef.current = markSaved; }, [markSaved]);

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
        if (result.file_path) {
          setArticleFilePath(result.file_path);
        }
        if (shouldNavigate) {
          navigate(`/articles/${result.id}/edit`, { replace: true });
        }
        if (pendingImages.length > 0) {
          let updatedContent = content;
          for (const img of pendingImages) {
            try {
              const copied = await apiService.copyMediaToArticle(result.id, img.mediaId);
              const newPath = copied.markdown_path || `images/${copied.file_path.split('/').pop()}`;
              updatedContent = updatedContent.replace(img.originalPath, `./${newPath}`);
            } catch {
              console.warn('Failed to copy pending image to article', img.mediaId);
            }
          }
          setContent(updatedContent);
          setPendingImages([]);
          await dispatch(updateArticle({ id: result.id, data: { title, content: updatedContent, tag_ids: tagIds } })).unwrap();
        }
      }
      historyManager.clearHistory();
      markSavedRef.current?.();
      return result;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [articleId, title, content, tagIds, dispatch, navigate, pendingImages, historyManager]);

  const handleSaveAndGo = useCallback(async () => {
    const result = await doSave(true);
    if (result) {
      message.success('保存成功');
      navigate('/articles/success', { state: { articleId: articleId || result.id, articleTitle: title, action: 'save' } });
    }
  }, [doSave, navigate, articleId, title]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      if (articleId) {
        const media = await apiService.uploadToArticle(articleId, file);
        const imgPath = media.markdown_path || `images/${media.file_path.split('/').pop()}`;
        const imgMd = `![${file.name}](./${imgPath})`;
        setContent(prev => prev + '\n' + imgMd, '插入图片');
      } else {
        const media = await apiService.uploadFile(file);
        const imgMd = `![${file.name}](${media.file_path})`;
        setPendingImages(prev => [...prev, { mediaId: media.id, originalPath: media.file_path }]);
        setContent(prev => prev + '\n' + imgMd, '插入图片');
      }
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  }, [articleId, setContent]);

  const handleInsertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '', block: boolean = false, description: string = '插入内容') => {
    setContent(prev => {
      let base = prev;
      if (block && base.length > 0 && !base.endsWith('\n')) {
        base = base + '\n';
      }
      return base + before + (placeholder || '') + (after || '');
    }, description);
  }, [setContent]);

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

  const handleUndo = useCallback(() => {
    const prev = historyManager.undo();
    if (prev !== null) setContentRaw(prev);
  }, [historyManager]);

  const handleRedo = useCallback(() => {
    const next = historyManager.redo();
    if (next !== null) setContentRaw(next);
  }, [historyManager]);

  const handleJumpTo = useCallback((index: number) => {
    const target = historyManager.jumpTo(index);
    if (target !== null) setContentRaw(target);
  }, [historyManager]);

  const handlePendingImage = useCallback((mediaId: number, originalPath: string) => {
    setPendingImages(prev => [...prev, { mediaId, originalPath }]);
  }, []);

  const handleVersionRestore = useCallback((article: any) => {
    setTitle(article.title);
    setContentRaw(article.content);
    historyManager.pushState(article.content, '恢复版本');
    setTagIds(article.tag_objects?.map((t: any) => t.id) || []);
    setVersionHistoryOpen(false);
  }, [historyManager]);

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} onPaste={handlePaste} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>返回</Button>
        </Space>
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleCopyRichText} disabled={!previewHtml}>
            复制富文本
          </Button>
          {autoSaveStatus === 'saving' ? (
            <span style={{ fontSize: 12, color: '#999' }}>保存中...</span>
          ) : lastSavedAtFormatted ? (
            <span style={{ fontSize: 12, color: '#999' }}>最后保存 {lastSavedAtFormatted}</span>
          ) : null}
          <Button icon={<SaveOutlined />} onClick={handleSaveAndGo} loading={saving}>保存</Button>
        </Space>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
          }}>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入标题"
              variant="borderless"
              style={{ flex: '1 1 200px', fontWeight: 500 }}
            />
            <Select
              mode="multiple"
              maxCount={5}
              value={tagIds}
              onChange={setTagIds}
              placeholder="选择标签（最多5个）"
              variant="borderless"
              style={{ flex: '0 1 280px', minWidth: 160 }}
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
          </div>
          <EditorToolbar
            onInsertMarkdown={handleInsertMarkdown}
            onImageUpload={handleImageUpload}
            editorReady={editorReady}
            editMode={editMode}
            onToggleEditMode={() => setEditMode(m => m === 'wysiwyg' ? 'markdown' : 'wysiwyg')}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyManager.canUndo}
            canRedo={historyManager.canRedo}
            history={historyManager.history}
            currentIndex={historyManager.currentIndex}
            onJumpTo={handleJumpTo}
            onVersionHistory={articleId ? () => setVersionHistoryOpen(true) : undefined}
          />
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {editMode === 'wysiwyg' ? (
              <MilkdownEditor value={content} onChange={(val) => setContent(val, '编辑内容')} editorContainerRef={editorContainerRef} articleId={articleId} articleFilePath={articleFilePath} onPendingImage={handlePendingImage} />
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value, '输入文本')}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: 16,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: '#fff',
                }}
                placeholder="请输入 Markdown 内容..."
              />
            )}
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
              <Radio.Button value="mobile">手机端</Radio.Button>
              <Radio.Button value="desktop">桌面端</Radio.Button>
            </Radio.Group>
            <Space size={8}>
              <span style={{ fontSize: 12, color: '#999' }}>同步滚动</span>
              <Switch size="small" checked={syncScroll} onChange={setSyncScroll} />
            </Space>
          </div>
          {(() => {
            const activePlatforms = platformAccounts.filter(a => a.status === 'active');
            if (activePlatforms.length === 0) return null;
            return (
              <div style={{
                padding: '4px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>已配置平台:</span>
                {activePlatforms.map(a => (
                  <Tag key={a.id} color="green" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <PlatformIcon platformName={a.platform_name} size={12} />
                    {platformNameMap[a.platform_name] || a.platform_name}: {a.account_name}
                  </Tag>
                ))}
              </div>
            );
          })()}
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
        <VersionHistory
          open={versionHistoryOpen}
          articleId={articleId}
          articleFilePath={articleFilePath}
          onClose={() => setVersionHistoryOpen(false)}
          onRestore={handleVersionRestore}
        />
      )}
    </div>
  );
};

export default ArticleEditor;

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Space, Select, message, Spin, Radio, Switch, Table, Tag, Tooltip } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CopyOutlined, VerticalAlignTopOutlined, HistoryOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { createArticle, updateArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { fetchSeries } from '../store/seriesSlice';
import { apiService } from '../services/api';
import { renderMarkdown } from '../utils/markdown';
import { useAutoSave } from '../utils/useAutoSave';
import { useHistory } from '../hooks/useHistory';
import { extractPlatformMeta, setPlatformMeta } from '../utils/platformMetadata';
import type { PlatformMeta } from '../utils/platformMetadata';
import EditorToolbar from '../components/Editor/EditorToolbar';
import MediaPickerModal from '../components/Editor/MediaPickerModal';
import VersionHistory from '../components/Editor/VersionHistory';
import PlatformPreview from '../components/Preview/PlatformPreview';
import PlatformIcon from '../components/PlatformIcon';
import PlatformMetaPanel from '../components/Editor/PlatformMetaPanel';
import ImageCarousel from '../components/Preview/ImageCarousel';
import type { PlatformKey } from '../components/Preview/PlatformPreview';
import type { Media } from '../types';

const MilkdownEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  editorContainerRef?: React.RefObject<HTMLDivElement | null>;
  articleId: number | null;
  articleFilePath?: string | null;
  onPendingImage?: (mediaId: number, originalPath: string) => void;
  bridgeRef?: React.MutableRefObject<any>;
}> = ({ value, onChange, editorContainerRef, articleId, articleFilePath, onPendingImage, bridgeRef }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const articleIdRef = useRef(articleId);
  const articleFilePathRef = useRef(articleFilePath);
  const onPendingImageRef = useRef(onPendingImage);
  const tableNavRef = useRef<{ goToNextCell: any; isInTable: any; TextSelection: any; editorViewCtx: any } | null>(null);

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
        const { Editor, rootCtx, defaultValueCtx, editorViewCtx } = await import('@milkdown/core');
        const { commonmark } = await import('@milkdown/preset-commonmark');
        const { gfm } = await import('@milkdown/preset-gfm');
        const { nord } = await import('@milkdown/theme-nord');
        const { ReactEditor } = await import('@milkdown/react');
        const { listener, listenerCtx } = await import('@milkdown/plugin-listener');
        const { uploadConfig, uploadPlugin } = await import('@milkdown/plugin-upload');
        const { Fragment } = await import('@milkdown/prose/model');
        const { Decoration } = await import('@milkdown/prose/view');
        const { goToNextCell, isInTable } = await import('@milkdown/prose/tables');
        const { TextSelection } = await import('@milkdown/prose/state');

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

        tableNavRef.current = { goToNextCell, isInTable, TextSelection, editorViewCtx };

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
          if (bridgeRef) bridgeRef.current = { editorInstanceRef, tableNavRef };
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
      (editorContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = parent as HTMLDivElement | null;
    }
  }, [editorContainerRef]);

  return <div ref={refCallback} style={{ minHeight: '100%' }} />;
};

const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!id) {
      navigate('/articles', { replace: true });
    }
  }, [id, navigate]);
  const { tags: allTags } = useSelector((state: RootState) => state.tag);
  const { series: allSeries } = useSelector((state: RootState) => state.series);
  const [title, setTitle] = useState('');
  const [content, setContentRaw] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [rawHtml, setRawHtml] = useState('');
  const [styledHtml, setStyledHtml] = useState('');
  const [articleId, setArticleId] = useState<number | null>(id ? Number(id) : null);
  const [platform, setPlatform] = useState<PlatformKey>('mobile');
  const [syncScroll, setSyncScroll] = useState(true);
  const [editorReady, setEditorReady] = useState(true);
  const [editMode, setEditMode] = useState<'wysiwyg' | 'markdown'>('markdown');
  const [pendingImages, setPendingImages] = useState<{ mediaId: number; originalPath: string }[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerRole, setMediaPickerRole] = useState<'content' | 'cover' | 'gallery'>('content');
  const [articleFilePath, setArticleFilePath] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState('classic');
  const [customColor, setCustomColor] = useState<string | undefined>(undefined);
  const [previewPlatform, setPreviewPlatform] = useState('wechat_mp');
  const [themes, setThemes] = useState<Array<{ id: string; name: string; description: string; primary_color: string }>>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [showBackTop, setShowBackTop] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [publishHistoryOpen, setPublishHistoryOpen] = useState(false);
  const [publishHistoryTasks, setPublishHistoryTasks] = useState<any[]>([]);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const handleScroll = () => setShowBackTop(el.scrollTop > 300);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [content, editMode]);
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

  const xhsMeta = useMemo(() => extractPlatformMeta(content, 'xiaohongshu'), [content]);
  const handleXhsMetaChange = useCallback((meta: PlatformMeta) => {
    setContent(setPlatformMeta(content, 'xiaohongshu', meta), '更新小红书元数据');
  }, [content, setContent]);

  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchSeries());
    apiService.getThemes().then(setThemes).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!articleId || !publishHistoryOpen) return;
    apiService.getPublishTasks({ article_id: articleId, limit: 20 }).then(res => {
      setPublishHistoryTasks(res.tasks);
    }).catch(() => {});
  }, [articleId, publishHistoryOpen]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiService.getArticleById(Number(id)).then(article => {
      if (cancelled) return;
      setTitle(article.title);
      setContentRaw(article.content);
      historyManager.pushState(article.content, '加载文章');
      setTagIds(article.tag_objects?.map(t => t.id) || []);
      setSeriesId(article.series_id);
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

  // Stage 1: markdown → basic HTML (client-side, resolves image paths, 300ms debounce)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const html = await renderMarkdown(content, articleFilePath);
      if (!cancelled) setRawHtml(html);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content, articleFilePath]);

  // Stage 2: basic HTML → styled HTML (server-side, applies theme/platform styles)
  useEffect(() => {
    if (!rawHtml) {
      setStyledHtml('');
      return;
    }
    let cancelled = false;
    apiService.previewStyledHtml(rawHtml, {
      themeId: selectedThemeId,
      primaryColor: customColor,
      platform: previewPlatform,
    }).then(result => {
      if (!cancelled) setStyledHtml(result.html);
    }).catch(() => {
      if (!cancelled) setStyledHtml(rawHtml);
    });
    return () => { cancelled = true; };
  }, [rawHtml, selectedThemeId, customColor, previewPlatform]);

  const displayHtml = styledHtml;

  const autoSaveFn = useCallback(async () => {
    if (!title.trim() || !articleId) return;
    const data: any = { title, content, tag_ids: tagIds, series_id: seriesId };
    try {
      await dispatch(updateArticle({ id: articleId, data })).unwrap();
    } catch {}
  }, [title, articleId, content, tagIds, seriesId, dispatch]);

  const { status: autoSaveStatus, lastSavedAtFormatted, markSaved } = useAutoSave(autoSaveFn, content + title, 3000);

  useEffect(() => { markSavedRef.current = markSaved; }, [markSaved]);

  const doSave = useCallback(async (shouldNavigate: boolean = false) => {
    if (!title.trim()) { message.warning('请输入标题'); return null; }
    setSaving(true);
    try {
      const data: any = { title, content, tag_ids: tagIds, series_id: seriesId };
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
          await dispatch(updateArticle({ id: result.id, data: { title, content: updatedContent, tag_ids: tagIds, series_id: seriesId } })).unwrap();
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
  }, [articleId, title, content, tagIds, seriesId, dispatch, navigate, pendingImages, historyManager]);

  const handleSaveAndGo = useCallback(async () => {
    const result = await doSave(true);
    if (result) {
      message.success('保存成功');
      navigate('/articles/success', { state: { articleId: articleId || result.id, articleTitle: title, action: 'save' } });
    }
  }, [doSave, navigate, articleId, title]);

  const handleImageUpload = useCallback(async (file: File, role?: 'content' | 'cover' | 'gallery') => {
    try {
      let imgPath: string;
      if (articleId) {
        const media = await apiService.uploadToArticle(articleId, file);
        imgPath = media.markdown_path || `images/${media.file_path.split('/').pop()}`;
      } else {
        const media = await apiService.uploadFile(file);
        imgPath = media.file_path;
        setPendingImages(prev => [...prev, { mediaId: media.id, originalPath: media.file_path }]);
      }

      if (previewPlatform === 'xiaohongshu' && (role === 'cover' || role === 'gallery')) {
        const currentMeta = extractPlatformMeta(content, 'xiaohongshu');
        currentMeta.images = [...currentMeta.images, `./${imgPath}`];
        setContent(setPlatformMeta(content, 'xiaohongshu', currentMeta), '添加小红书图片');
        message.success('图片已添加');
        return;
      }

      const altText = role === 'cover' ? '封面' : role === 'gallery' ? '轮播' : file.name;
      const imgMd = `![${altText}](${articleId ? './' : ''}${imgPath})`;

      if (editMode === 'markdown') {
        const textarea = textareaRef.current;
        if (textarea) {
          const pos = textarea.selectionStart;
          const insertText = '\n' + imgMd + '\n';
          setContent(prev => prev.substring(0, pos) + insertText + prev.substring(pos), '插入图片');
          const newPos = pos + insertText.length;
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = newPos;
              textareaRef.current.selectionEnd = newPos;
              textareaRef.current.focus();
            }
          });
        } else {
          setContent(prev => prev + '\n' + imgMd, '插入图片');
        }
      } else {
        setContent(prev => prev + '\n' + imgMd, '插入图片');
      }
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  }, [articleId, editMode, setContent, previewPlatform, content]);

  const handleInsertFromLibrary = useCallback(() => {
    setMediaPickerRole('content');
    setMediaPickerOpen(true);
  }, []);

  const handleMediaSelect = useCallback(async (mediaList: Media[]) => {
    try {
      let insertParts: string[] = [];
      const newPending: { mediaId: number; originalPath: string }[] = [];
      let xhsImages: string[] = [];

      for (const media of mediaList) {
        let imgPath: string;
        if (articleId) {
          const copied = await apiService.copyMediaToArticle(articleId, media.id);
          imgPath = copied.markdown_path || `images/${copied.file_path.split('/').pop()}`;
        } else {
          imgPath = media.file_path;
          newPending.push({ mediaId: media.id, originalPath: media.file_path });
        }

        if (previewPlatform === 'xiaohongshu' && (mediaPickerRole === 'cover' || mediaPickerRole === 'gallery')) {
          xhsImages.push(`./${imgPath}`);
        } else {
          const altText = mediaPickerRole === 'cover' ? '封面' : mediaPickerRole === 'gallery' ? '轮播' : media.filename;
          insertParts.push(`![${altText}](${articleId ? './' : ''}${imgPath})`);
        }
      }

      if (newPending.length > 0) {
        setPendingImages(prev => [...prev, ...newPending]);
      }

      if (xhsImages.length > 0) {
        const currentMeta = extractPlatformMeta(content, 'xiaohongshu');
        currentMeta.images = [...currentMeta.images, ...xhsImages];
        setContent(setPlatformMeta(content, 'xiaohongshu', currentMeta), '添加小红书图片');
      }

      if (insertParts.length > 0) {
        const imgMd = '\n' + insertParts.join('\n') + '\n';
        if (editMode === 'markdown') {
          const textarea = textareaRef.current;
          if (textarea) {
            const pos = textarea.selectionStart;
            setContent(prev => prev.substring(0, pos) + imgMd + prev.substring(pos), '插入图片');
            const newPos = pos + imgMd.length;
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = newPos;
                textareaRef.current.selectionEnd = newPos;
                textareaRef.current.focus();
              }
            });
          } else {
            setContent(prev => prev + imgMd, '插入图片');
          }
        } else {
          setContent(prev => prev + imgMd, '插入图片');
        }
      }

      message.success(`已插入 ${mediaList.length} 张图片`);
    } catch {
      message.error('图片插入失败');
    } finally {
      setMediaPickerOpen(false);
    }
  }, [articleId, editMode, setContent, previewPlatform, content, mediaPickerRole]);

  const handleInsertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '', block: boolean = false, description: string = '插入内容') => {
    if (editMode === 'markdown') {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const insertText = before + (selectedText || placeholder || '') + (after || '');

        setContent(prev => {
          let prefix = prev.substring(0, start);
          const suffix = prev.substring(end);
          if (block && prefix.length > 0 && !prefix.endsWith('\n')) {
            prefix = prefix + '\n';
          }
          return prefix + insertText + suffix;
        }, description);

        const prefixLen = block && textarea.value.substring(0, start).length > 0 && !textarea.value.substring(0, start).endsWith('\n') ? 1 : 0;
        const newStart = start + prefixLen + before.length;
        const newEnd = newStart + (selectedText || placeholder || '').length;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = newStart;
              textareaRef.current.selectionEnd = newEnd;
              textareaRef.current.focus();
            }
          });
        });
        return;
      }
    }

    setContent(prev => {
      let base = prev;
      if (block && base.length > 0 && !base.endsWith('\n')) {
        base = base + '\n';
      }
      return base + before + (placeholder || '') + (after || '');
    }, description);
  }, [editMode, setContent]);

  const handleCopyRichText = useCallback(async () => {
    if (!styledHtml) {
      message.warning('预览内容为空');
      return;
    }
    try {
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
  }, [styledHtml]);

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
    setSeriesId(article.series_id);
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

  const milkdownBridgeRef = useRef<any>(null);

  useEffect(() => {
    (window as any).__milkdownTabNavigate = (shift: boolean) => {
      if (editMode === 'wysiwyg') {
        const bridge = milkdownBridgeRef.current;
        if (!bridge) return;
        const editor = bridge.editorInstanceRef.current;
        const nav = bridge.tableNavRef.current;
        if (!editor || !nav) return;
        const { goToNextCell, isInTable, TextSelection, editorViewCtx: viewCtx } = nav;
        editor.action((ctx: any) => {
          const view = ctx.get(viewCtx);
          if (!view || !isInTable(view.state)) return;
          if (shift) {
            goToNextCell(-1)(view.state, view.dispatch);
          } else {
            if (!goToNextCell(1)(view.state, view.dispatch)) {
              const $pos = view.state.selection.$head;
              for (let d = $pos.depth - 1; d >= 0; d--) {
                if (($pos.node(d).type.spec as any).tableRole === 'table') {
                  const after = $pos.after(d);
                  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, after)).scrollIntoView());
                  break;
                }
              }
            }
          }
          // Select cell content after navigation
          const $head = view.state.selection.$head;
          for (let d = $head.depth; d > 0; d--) {
            const spec = $head.node(d).type.spec as any;
            if (spec.tableRole === 'cell' || spec.tableRole === 'header_cell') {
              const from = $head.start(d);
              const to = $head.end(d);
              if (from < to) {
                view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
              }
              break;
            }
          }
          view.focus();
        });
      } else {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const pos = textarea.selectionStart;
        const val = textarea.value;
        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
        const lineEnd = val.indexOf('\n', pos);
        const line = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd);
        if (!line.trimStart().startsWith('|')) return;
        if (line.match(/^\|\s*[-:]+[-| :]*$/)) return;

        const selectCell = (cellStart: number, cellEnd: number) => {
          const cellText = val.substring(cellStart, cellEnd);
          const trimmedStart = cellStart + cellText.length - cellText.trimStart().length;
          const trimmedEnd = cellStart + cellText.trimEnd().length;
          textarea.setSelectionRange(trimmedStart, trimmedEnd);
        };

        if (shift) {
          const prevPipe = val.lastIndexOf('|', pos - 1);
          if (prevPipe <= lineStart) return;
          const beforePrev = val.lastIndexOf('|', prevPipe - 1);
          selectCell(beforePrev + 1, prevPipe);
        } else {
          const nextPipe = val.indexOf('|', pos);
          if (nextPipe === -1 || nextPipe >= (lineEnd === -1 ? val.length : lineEnd)) return;
          const afterNext = val.indexOf('|', nextPipe + 1);
          if (afterNext === -1 || afterNext > (lineEnd === -1 ? val.length : lineEnd)) return;
          selectCell(nextPipe + 1, afterNext);
        }
        textarea.focus();
      }
    };
    return () => { delete (window as any).__milkdownTabNavigate; };
  }, [editMode]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} onPaste={handlePaste} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>返回</Button>
        </Space>
        <Space>
          {articleId && (
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setPublishHistoryOpen(v => !v)}
              type={publishHistoryOpen ? 'primary' : 'default'}
              ghost={publishHistoryOpen}
            >
              发布历史
            </Button>
          )}
          <Button icon={<CopyOutlined />} onClick={handleCopyRichText} disabled={!styledHtml}>
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
              maxCount={10}
              value={tagIds}
              onChange={setTagIds}
              placeholder="选择标签（最多10个）"
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
            <Select
              value={seriesId}
              onChange={setSeriesId}
              placeholder="选择系列"
              variant="borderless"
              style={{ flex: '0 1 200px', minWidth: 140 }}
              allowClear
              options={allSeries.map(s => ({ label: s.name, value: s.id }))}
            />
          </div>
          <EditorToolbar
            onInsertMarkdown={handleInsertMarkdown}
            onImageUpload={handleImageUpload}
            onInsertFromLibrary={handleInsertFromLibrary}
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
          <PlatformMetaPanel
            visible={previewPlatform === 'xiaohongshu'}
            meta={xhsMeta}
            articleId={articleId}
            articleStoragePath={articleFilePath}
            onMetaChange={handleXhsMetaChange}
          />
          <div ref={editorScrollContainerRef} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {editMode === 'wysiwyg' ? (
              <MilkdownEditor value={content} onChange={(val) => setContent(val, '编辑内容')} editorContainerRef={editorContainerRef} articleId={articleId} articleFilePath={articleFilePath} onPendingImage={handlePendingImage} bridgeRef={milkdownBridgeRef} />
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value, '输入文本')}
                style={{
                  width: '100%',
                  minHeight: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: 16,
                  overflow: 'hidden',
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
            <Space size={8}>
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
              {themes.length > 0 && (
                <Radio.Group
                  value={selectedThemeId}
                  onChange={(e) => { setSelectedThemeId(e.target.value); setCustomColor(undefined); }}
                  size="small"
                  optionType="button"
                  buttonStyle="solid"
                >
                  {themes.map(t => (
                    <Radio.Button key={t.id} value={t.id}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.primary_color, marginRight: 4, verticalAlign: 'middle' }} />
                      {t.name}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              )}
            </Space>
            <Space size={8}>
              <span style={{ fontSize: 12, color: '#999' }}>同步滚动</span>
              <Switch size="small" checked={syncScroll} onChange={setSyncScroll} />
            </Space>
          </div>
          <div style={{
            padding: '4px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>预览平台:</span>
            <Radio.Group
              value={previewPlatform}
              onChange={(e) => setPreviewPlatform(e.target.value)}
              size="small"
              optionType="button"
            >
              <Radio.Button value="wechat_mp"><PlatformIcon platformName="wechat_mp" size={12} /> 微信</Radio.Button>
              <Radio.Button value="xiaohongshu"><PlatformIcon platformName="xiaohongshu" size={12} /> 小红书</Radio.Button>
              <Radio.Button value="zhihu"><PlatformIcon platformName="zhihu" size={12} /> 知乎</Radio.Button>
              <Radio.Button value="juejin"><PlatformIcon platformName="juejin" size={12} /> 掘金</Radio.Button>
            </Radio.Group>
          </div>
          {(() => {
            const activeTheme = themes.find(t => t.id === selectedThemeId);
            if (previewPlatform !== 'wechat_mp' || !activeTheme) return null;
            const PRESET_COLORS = ['#07C160', '#35b378', '#1a1a1a', '#1890ff', '#f5222d', '#722ed1', '#fa8c16', '#eb2f96'];
            return (
              <div style={{
                padding: '4px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>主题色</span>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setCustomColor(c === customColor ? undefined : c)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', background: c,
                      cursor: 'pointer',
                      border: customColor === c ? '2px solid #333' : '2px solid transparent',
                      transition: 'border 0.2s',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={customColor || activeTheme.primary_color || '#07C160'}
                  onChange={e => setCustomColor(e.target.value)}
                  style={{ width: 20, height: 20, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
                  title="自定义颜色"
                />
              </div>
            );
          })()}
          <div
            style={{ flex: 1, overflow: 'hidden', padding: 12, minHeight: 0, display: 'flex', justifyContent: 'center', background: '#f5f5f5', position: 'relative' }}
          >
            <PlatformPreview
              html={displayHtml}
              platform={platform}
              syncScrollRef={editorScrollContainerRef}
              syncEnabled={syncScroll}
              scrollContainerRef={previewContainerRef}
            >
              {previewPlatform === 'xiaohongshu' && xhsMeta.images.length > 0 && (
                <ImageCarousel
                  images={xhsMeta.images.map(src => ({ src: apiService.getMediaUrl(src, articleFilePath || undefined) }))}
                />
              )}
            </PlatformPreview>
            {showBackTop && (
              <button
                onClick={() => previewContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{
                  position: 'absolute',
                  bottom: 24,
                  right: 24,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#666',
                  transition: 'opacity 0.2s',
                }}
                title="返回顶部"
              >
                <VerticalAlignTopOutlined />
              </button>
            )}
          </div>
        </div>
      </div>
      {articleId && publishHistoryOpen && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #e8e8e8', marginTop: 8, maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>发布历史</span>
            <Button size="small" type="text" icon={<UpOutlined />} onClick={() => setPublishHistoryOpen(false)} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              size="small"
              columns={[
                {
                  title: '平台', key: 'platform', width: 130,
                  render: (_: any, r: any) => r.platform_name ? <PlatformIcon platformName={r.platform_name} size={14} showText /> : '-',
                },
                {
                  title: '方式', key: 'method', width: 70,
                  render: (_: any, r: any) => <Tag color={r.publish_method === 'local' ? 'orange' : 'blue'} style={{ fontSize: 11 }}>{r.publish_method === 'local' ? '本地' : '云端'}</Tag>,
                },
                {
                  title: '状态', dataIndex: 'status', key: 'status', width: 70,
                  render: (s: string) => {
                    const map: Record<string, { color: string; label: string }> = { pending: { color: 'blue', label: '等待中' }, running: { color: 'processing', label: '执行中' }, success: { color: 'green', label: '成功' }, failed: { color: 'red', label: '失败' }, cancelled: { color: 'default', label: '已取消' } };
                    const info = map[s] || { color: 'default', label: s };
                    return <Tag color={info.color} style={{ fontSize: 11 }}>{info.label}</Tag>;
                  },
                },
                {
                  title: '时间', dataIndex: 'created_at', key: 'time', width: 160,
                  render: (t: string) => t ? new Date(t).toLocaleString() : '-',
                },
                {
                  title: '操作', key: 'action', width: 80,
                  render: (_: any, r: any) => (
                    <Space>
                      {r.status === 'failed' && <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={async () => {
                        try {
                          await apiService.retryPublishTask(r.id);
                          message.success('已重新加入队列');
                          apiService.getPublishTasks({ article_id: articleId!, limit: 20 }).then(res => setPublishHistoryTasks(res.tasks));
                        } catch { message.error('重试失败'); }
                      }}>重试</Button>}
                      {r.platform_post_url && <Tooltip title={r.platform_post_url}><a href={r.platform_post_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>链接</a></Tooltip>}
                    </Space>
                  ),
                },
              ]}
              dataSource={publishHistoryTasks}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无发布记录' }}
            />
          </div>
        </div>
      )}
      {articleId && (
        <VersionHistory
          open={versionHistoryOpen}
          articleId={articleId}
          articleFilePath={articleFilePath}
          onClose={() => setVersionHistoryOpen(false)}
          onRestore={handleVersionRestore}
        />
      )}
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default ArticleEditor;

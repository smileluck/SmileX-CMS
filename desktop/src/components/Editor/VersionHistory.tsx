import React, { useEffect, useState } from 'react';
import { Drawer, Timeline, Button, Spin, message, Modal, Typography, Tag, Empty, Segmented } from 'antd';
import { RollbackOutlined, EyeOutlined, DiffOutlined, FileTextOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api';
import { renderMarkdown } from '../../utils/markdown';
import type { ArticleVersionBrief, ArticleVersion, VersionDiff } from '../../types';

interface VersionHistoryProps {
  open: boolean;
  articleId: number;
  articleFilePath: string | null;
  onClose: () => void;
  onRestore: (article: any) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  open,
  articleId,
  articleFilePath,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<ArticleVersionBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<ArticleVersion | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'diff'>('diff');
  const [diffData, setDiffData] = useState<VersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    if (open && articleId) {
      setLoading(true);
      apiService.getArticleVersions(articleId)
        .then(setVersions)
        .catch(() => message.error('加载版本列表失败'))
        .finally(() => setLoading(false));
    }
  }, [open, articleId]);

  const handlePreview = async (version: ArticleVersionBrief) => {
    setShowPreview(true);
    if (viewMode === 'diff') {
      await loadDiff(version);
    } else {
      await loadContent(version);
    }
  };

  const loadContent = async (version: ArticleVersionBrief) => {
    setPreviewLoading(true);
    try {
      const full = await apiService.getArticleVersion(articleId, version.id);
      setPreviewVersion(full);
      const html = await renderMarkdown(full.content, articleFilePath);
      setPreviewHtml(html);
    } catch {
      message.error('加载版本内容失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadDiff = async (version: ArticleVersionBrief) => {
    setDiffLoading(true);
    try {
      const data = await apiService.getVersionDiff(articleId, version.id);
      setDiffData(data);
    } catch {
      message.error('加载差异失败');
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (!showPreview) return;
    const selected = versions.find(v => v.id === (previewVersion?.id || diffData?.version_id));
    if (!selected) return;
    if (viewMode === 'diff') {
      loadDiff(selected);
    } else {
      loadContent(selected);
    }
  }, [viewMode]);

  const handleRestore = (version: ArticleVersionBrief) => {
    Modal.confirm({
      title: '恢复版本',
      content: `确定要恢复到版本 ${version.version_number}（${new Date(version.created_at).toLocaleString()}）吗？当前内容将被覆盖。`,
      okText: '确定恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          const article = await apiService.restoreArticleVersion(articleId, version.id);
          message.success('版本已恢复');
          onRestore(article);
          setShowPreview(false);
          setPreviewVersion(null);
          setDiffData(null);
        } catch {
          message.error('恢复失败');
        }
      },
    });
  };

  const getSelectedVersion = (): ArticleVersionBrief | undefined => {
    const id = diffData?.version_id || previewVersion?.id;
    return versions.find(v => v.id === id);
  };

  const renderDiffContent = () => {
    if (!diffData) return null;
    const lines = diffData.diff.split('\n');
    return (
      <div style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: 12, lineHeight: 1.8 }}>
        {diffData.title_diff && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, borderLeft: '3px solid #fa8c16' }}>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>标题变更：</Typography.Text>
            <div style={{ marginTop: 4 }}>
              {diffData.title_diff.old !== null && (
                <div><Typography.Text delete type="danger">{diffData.title_diff.old}</Typography.Text></div>
              )}
              <div><Typography.Text type="success">{diffData.title_diff.new}</Typography.Text></div>
            </div>
          </div>
        )}
        {lines.length <= 1 && !diffData.diff.trim() ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>内容无差异</div>
        ) : (
          lines.map((line, i) => {
            let bg = '#fafafa';
            let color = '#333';
            let prefix = ' ';
            if (line.startsWith('+++') || line.startsWith('---')) {
              bg = '#e6f7ff';
              color = '#1890ff';
              prefix = '';
            } else if (line.startsWith('@@')) {
              bg = '#f0f0f0';
              color = '#666';
              prefix = '';
            } else if (line.startsWith('+')) {
              bg = '#f6ffed';
              color = '#52c41a';
              prefix = '+';
            } else if (line.startsWith('-')) {
              bg = '#fff2f0';
              color = '#ff4d4f';
              prefix = '-';
            }
            if (!line.trim()) return null;
            return (
              <div key={i} style={{ background: bg, color, padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {prefix ? <span style={{ opacity: 0.5, marginRight: 4 }}>{prefix}</span> : null}
                {line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') ? line : line.slice(1)}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderVersionItem = (v: ArticleVersionBrief) => (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>
        版本 {v.version_number}
      </div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
        {new Date(v.created_at).toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {v.title}
      </div>
      {v.tags && v.tags.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {v.tags.map((t, i) => <Tag key={i} style={{ fontSize: 11, margin: 0, marginRight: 4 }}>{t}</Tag>)}
        </div>
      )}
      {v.change_summary && (
        <div style={{ fontSize: 11, color: '#1890ff', marginBottom: 6, padding: '2px 6px', background: '#e6f7ff', borderRadius: 4, lineHeight: '18px' }}>
          {v.change_summary}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4 }}>
        <Button size="small" icon={<DiffOutlined />} onClick={() => handlePreview(v)}>
          差异
        </Button>
        <Button size="small" icon={<EyeOutlined />} onClick={() => { setViewMode('preview'); handlePreview(v); }}>
          预览
        </Button>
        <Button size="small" icon={<RollbackOutlined />} onClick={() => handleRestore(v)}>
          恢复
        </Button>
      </div>
    </div>
  );

  const renderPreviewPanel = () => {
    if (!showPreview) return null;
    const sv = getSelectedVersion();
    return (
      <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: 16, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Segmented
            size="small"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'preview' | 'diff')}
            options={[
              { label: '差异对比', value: 'diff' },
              { label: '内容预览', value: 'preview' },
            ]}
          />
          {sv && (
            <Button size="small" type="primary" icon={<RollbackOutlined />} onClick={() => handleRestore(sv)}>
              恢复此版本
            </Button>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {(viewMode === 'diff' ? diffLoading : previewLoading) ? (
            <Spin style={{ display: 'block', margin: '40px auto' }} />
          ) : viewMode === 'diff' ? (
            renderDiffContent()
          ) : previewVersion ? (
            <div
              style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, minHeight: 200 }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Drawer
      title="版本历史"
      open={open}
      onClose={() => { setShowPreview(false); setPreviewVersion(null); setDiffData(null); onClose(); }}
      width={showPreview ? 800 : 400}
    >
      {loading ? (
        <Spin style={{ display: 'block', margin: '40px auto' }} />
      ) : versions.length === 0 ? (
        <Empty description="暂无版本记录" />
      ) : (
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
          <div style={{ flex: showPreview ? '0 0 260px' : '1 1 auto', overflow: 'auto' }}>
            <Timeline>
              {versions.map((v) => (
                <Timeline.Item key={v.id} color="blue">
                  {renderVersionItem(v)}
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
          {renderPreviewPanel()}
        </div>
      )}
    </Drawer>
  );
};

export default VersionHistory;

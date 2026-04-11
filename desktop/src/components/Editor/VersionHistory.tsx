import React, { useEffect, useState } from 'react';
import { Drawer, Timeline, Button, Spin, message, Modal, Typography, Tag, Empty } from 'antd';
import { HistoryOutlined, RollbackOutlined, EyeOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api';
import { renderMarkdown } from '../../utils/markdown';
import type { ArticleVersionBrief, ArticleVersion } from '../../types';

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
    setPreviewLoading(true);
    setShowPreview(true);
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
        } catch {
          message.error('恢复失败');
        }
      },
    });
  };

  return (
    <Drawer
      title="版本历史"
      open={open}
      onClose={() => { setShowPreview(false); setPreviewVersion(null); onClose(); }}
      width={showPreview ? 720 : 400}
    >
      {loading ? (
        <Spin style={{ display: 'block', margin: '40px auto' }} />
      ) : versions.length === 0 ? (
        <Empty description="暂无版本记录" />
      ) : (
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
          <div style={{ flex: showPreview ? '0 0 240px' : '1 1 auto', overflow: 'auto' }}>
            <Timeline
              items={versions.map((v) => ({
                color: 'blue',
                children: (
                  <div key={v.id} style={{ paddingBottom: 8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      版本 {v.version_number}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.title}
                    </div>
                    {v.tags && v.tags.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {v.tags.map((t, i) => <Tag key={i} style={{ fontSize: 11, margin: 0, marginRight: 4 }}>{t}</Tag>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(v)}>
                        预览
                      </Button>
                      <Button size="small" icon={<RollbackOutlined />} onClick={() => handleRestore(v)}>
                        恢复
                      </Button>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
          {showPreview && (
            <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0', paddingLeft: 16, overflow: 'auto' }}>
              {previewLoading ? (
                <Spin style={{ display: 'block', margin: '40px auto' }} />
              ) : previewVersion ? (
                <>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography.Text strong>
                      版本 {previewVersion.version_number} 预览
                    </Typography.Text>
                    <Button size="small" type="primary" icon={<RollbackOutlined />} onClick={() => handleRestore(versions.find(v => v.id === previewVersion.id)!)}>
                      恢复此版本
                    </Button>
                  </div>
                  <div
                    style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, minHeight: 200 }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default VersionHistory;

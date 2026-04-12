import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Table, Spin, message, Modal, Typography, Empty } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import type { ArticleVersionBrief, VersionDiff } from '../types';

const ArticleVersionList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleId = Number(id);

  const [versions, setVersions] = useState<ArticleVersionBrief[]>([]);
  const [loading, setLoading] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffData, setDiffData] = useState<VersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    if (articleId) {
      setLoading(true);
      apiService.getArticleVersions(articleId)
        .then(setVersions)
        .catch(() => message.error('加载版本列表失败'))
        .finally(() => setLoading(false));
    }
  }, [articleId]);

  const handleViewDiff = async (version: ArticleVersionBrief) => {
    setDiffModalOpen(true);
    setDiffLoading(true);
    setDiffData(null);
    try {
      const data = await apiService.getVersionDiff(articleId, version.id);
      setDiffData(data);
    } catch {
      message.error('加载差异失败');
    } finally {
      setDiffLoading(false);
    }
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

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version_number',
      key: 'version_number',
      width: 100,
      render: (v: number) => `v${v}`,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '变更摘要',
      dataIndex: 'change_summary',
      key: 'change_summary',
      ellipsis: true,
      render: (text: string | null) =>
        text ? (
          <span style={{ fontSize: 12, color: '#1890ff', padding: '2px 6px', background: '#e6f7ff', borderRadius: 4 }}>
            {text}
          </span>
        ) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ArticleVersionBrief) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDiff(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>版本历史</h1>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Spin style={{ display: 'block', margin: '80px auto' }} />
        ) : versions.length === 0 ? (
          <Empty description="暂无版本记录" />
        ) : (
          <Table
            columns={columns}
            dataSource={versions}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            style={{ height: '100%' }}
          />
        )}
      </div>
      <Modal
        title={diffData ? `版本 v${diffData.version_number} 差异对比` : '差异对比'}
        open={diffModalOpen}
        onCancel={() => { setDiffModalOpen(false); setDiffData(null); }}
        footer={null}
        width={700}
      >
        {diffLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : diffData ? (
          <>
            {diffData.change_summary && (
              <div style={{ marginBottom: 12, fontSize: 13, color: '#1890ff', padding: '4px 8px', background: '#e6f7ff', borderRadius: 4 }}>
                {diffData.change_summary}
              </div>
            )}
            {renderDiffContent()}
          </>
        ) : null}
      </Modal>
    </div>
  );
};

export default ArticleVersionList;

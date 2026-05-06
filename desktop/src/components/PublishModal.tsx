import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Button, Radio, message, Spin, Empty } from 'antd';
import { SendOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from './PlatformIcon';
import type { PlatformAccount, PlatformInfo } from '../types';

type PublishMode = 'cloud' | 'local';

interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  primary_color: string;
}

const PRESET_COLORS = ['#07C160', '#35b378', '#1a1a1a', '#1890ff', '#f5222d', '#722ed1', '#fa8c16', '#eb2f96'];

interface PublishModalProps {
  open: boolean;
  articleId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const LOCAL_PLATFORMS = [
  { name: 'wechat_mp', label: '微信公众号' },
  { name: 'xiaohongshu', label: '小红书' },
  { name: 'zhihu', label: '知乎' },
  { name: 'juejin', label: '掘金' },
];

const PublishModal: React.FC<PublishModalProps> = ({ open, articleId, onCancel, onSuccess }) => {
  const [mode, setMode] = useState<PublishMode>('local');
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLocalPlatforms, setSelectedLocalPlatforms] = useState<string[]>([LOCAL_PLATFORMS[0].name]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('classic');
  const [customColor, setCustomColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedIds([]);
    setCustomColor(undefined);
    setSelectedThemeId('classic');
    apiService.getPlatformAccounts()
      .then(data => setAccounts(data.filter(a => a.status === 'active')))
      .catch(() => message.error('获取平台账号失败'))
      .finally(() => setLoading(false));
    apiService.getThemes()
      .then(data => setThemes(data))
      .catch(() => {/* non-critical */});
  }, [open]);

  const groupedAccounts = accounts.reduce((acc, account) => {
    const key = account.platform_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {} as Record<string, PlatformAccount[]>);

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePublishLocal = async () => {
    if (selectedLocalPlatforms.length === 0) {
      message.warning('请至少选择一个平台');
      return;
    }
    setPublishing(true);
    try {
      const result = await apiService.publishLocal(articleId, selectedLocalPlatforms, selectedThemeId, customColor);
      const succeeded = result.results.filter(r => r.success);
      const failed = result.results.filter(r => !r.success);
      if (succeeded.length > 0) {
        message.success(`${succeeded.length} 个平台文件生成成功`);
      }
      failed.forEach(r => {
        message.error(`${r.platform_name}: ${r.error_message || '生成失败'}`);
      });
      if (result.success) {
        onSuccess();
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '本地发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishCloud = async () => {
    if (selectedIds.length === 0) {
      message.warning('请至少选择一个平台账号');
      return;
    }
    setPublishing(true);
    try {
      await apiService.createPublishTask({
        article_id: articleId,
        platform_account_ids: selectedIds,
      });
      message.success('发布任务已创建');
      onSuccess();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建发布任务失败');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = () => {
    if (mode === 'local') {
      handlePublishLocal();
    } else {
      handlePublishCloud();
    }
  };

  const footerAction = mode === 'local' ? (
    <Button key="local" type="primary" icon={<DownloadOutlined />} loading={publishing} onClick={handlePublish}>
      生成 {selectedLocalPlatforms.length} 个平台文件
    </Button>
  ) : (
    <Button key="cloud" type="primary" icon={<SendOutlined />} loading={publishing} onClick={handlePublish}>
      发布到 {selectedIds.length} 个平台
    </Button>
  );

  const activeTheme = themes.find(t => t.id === selectedThemeId);

  return (
    <Modal
      title="发布"
      open={open}
      onCancel={onCancel}
      width={600}
      footer={[<Button key="cancel" onClick={onCancel}>取消</Button>, footerAction]}
    >
      <Radio.Group value={mode} onChange={e => setMode(e.target.value)} style={{ marginBottom: 16, display: 'flex' }}>
        <Radio.Button value="local"><DownloadOutlined style={{ marginRight: 4 }} />发布到本地</Radio.Button>
        <Radio.Button value="cloud"><SendOutlined style={{ marginRight: 4 }} />发布到云端</Radio.Button>
      </Radio.Group>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : mode === 'local' ? (
        <>
          <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
            {LOCAL_PLATFORMS.map(p => (
              <div
                key={p.name}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  background: selectedLocalPlatforms.includes(p.name) ? '#f6ffed' : undefined,
                  borderRadius: 6,
                }}
                onClick={() => setSelectedLocalPlatforms(prev =>
                  prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]
                )}
              >
                <Checkbox checked={selectedLocalPlatforms.includes(p.name)}>
                  <PlatformIcon platformName={p.name} size={18} showText />
                </Checkbox>
              </div>
            ))}
          </div>

          {themes.length > 0 && (
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <div style={{ marginBottom: 10, fontWeight: 500, color: '#333', fontSize: 14 }}>排版主题</div>
              <Radio.Group
                value={selectedThemeId}
                onChange={e => { setSelectedThemeId(e.target.value); setCustomColor(undefined); }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}
              >
                {themes.map(t => (
                  <Radio.Button key={t.id} value={t.id} style={{ borderRadius: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.primary_color, marginRight: 6, verticalAlign: 'middle' }} />
                    {t.name}
                  </Radio.Button>
                ))}
              </Radio.Group>

              {activeTheme && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#999' }}>{activeTheme.description}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>主题色</span>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setCustomColor(c === customColor ? undefined : c)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      cursor: 'pointer', border: customColor === c ? '2px solid #333' : '2px solid transparent',
                      transition: 'border 0.2s',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={customColor || activeTheme?.primary_color || '#07C160'}
                  onChange={e => setCustomColor(e.target.value)}
                  style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
                  title="自定义颜色"
                />
              </div>
            </div>
          )}
        </>
      ) : accounts.length === 0 ? (
        <Empty description="暂无已绑定的平台账号，请先在平台管理中绑定" />
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {Object.entries(groupedAccounts).map(([platform, accs]) => (
            <div key={platform} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                <PlatformIcon platformName={platform} size={18} showText />
              </div>
              {accs.map(account => (
                <div
                  key={account.id}
                  style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                  onClick={() => handleToggle(account.id)}
                >
                  <Checkbox checked={selectedIds.includes(account.id)}>
                    <span>{account.account_name}</span>
                  </Checkbox>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default PublishModal;

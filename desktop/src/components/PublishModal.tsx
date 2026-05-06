import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Button, Radio, message, Spin, Empty } from 'antd';
import { SendOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap } from './PlatformIcon';
import type { PlatformAccount, PlatformInfo } from '../types';

type PublishMode = 'cloud' | 'local';

interface PublishModalProps {
  open: boolean;
  articleId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const LOCAL_PLATFORMS = [
  { name: 'wechat_mp', label: '微信公众号' },
];

const PublishModal: React.FC<PublishModalProps> = ({ open, articleId, onCancel, onSuccess }) => {
  const [mode, setMode] = useState<PublishMode>('local');
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLocalPlatform, setSelectedLocalPlatform] = useState<string>(LOCAL_PLATFORMS[0].name);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedIds([]);
    apiService.getPlatformAccounts()
      .then(data => setAccounts(data.filter(a => a.status === 'active')))
      .catch(() => message.error('获取平台账号失败'))
      .finally(() => setLoading(false));
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
    setPublishing(true);
    try {
      const result = await apiService.publishLocal(articleId, selectedLocalPlatform);
      if (result.success) {
        message.success(result.output_path
          ? `文件已保存: ${result.output_path}`
          : '本地文件生成成功');
        onSuccess();
      } else {
        message.error(result.error_message || '生成失败');
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
      生成本地文件
    </Button>
  ) : (
    <Button key="cloud" type="primary" icon={<SendOutlined />} loading={publishing} onClick={handlePublish}>
      发布到 {selectedIds.length} 个平台
    </Button>
  );

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
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {LOCAL_PLATFORMS.map(p => (
            <div
              key={p.name}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f5f5f5',
                cursor: 'pointer',
                background: selectedLocalPlatform === p.name ? '#f6ffed' : undefined,
                borderRadius: 6,
              }}
              onClick={() => setSelectedLocalPlatform(p.name)}
            >
              <Checkbox checked={selectedLocalPlatform === p.name}>
                <PlatformIcon platformName={p.name} size={18} showText />
              </Checkbox>
            </div>
          ))}
        </div>
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

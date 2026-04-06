import React, { useEffect, useState } from 'react';
import { Modal, Checkbox, Button, Space, message, Spin, Empty } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap, getUnifiedPlatformName } from './PlatformIcon';
import type { PlatformAccount } from '../types';

interface PublishModalProps {
  open: boolean;
  articleId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ open, articleId, onCancel, onSuccess }) => {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
    const key = getUnifiedPlatformName(account.platform_name);
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {} as Record<string, PlatformAccount[]>);

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
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

  return (
    <Modal
      title="发布到平台"
      open={open}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="publish" type="primary" icon={<SendOutlined />} loading={publishing} onClick={handlePublish}>
          发布到 {selectedIds.length} 个平台
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
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

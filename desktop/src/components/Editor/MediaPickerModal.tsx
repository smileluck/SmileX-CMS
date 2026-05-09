import React, { useEffect, useState } from 'react';
import { Modal, Card, Image, Empty, Spin, Button } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { apiService } from '../../services/api';
import type { Media } from '../../types';

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: Media[]) => void;
}

const MediaPickerModal: React.FC<MediaPickerModalProps> = ({ open, onClose, onSelect }) => {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setLoading(true);
      apiService.getMediaFiles({ media_type: 'image' })
        .then(setItems)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleOk = () => {
    const selected = items.filter(m => selectedIds.has(m.id));
    if (selected.length > 0) onSelect(selected);
  };

  return (
    <Modal
      title={`从素材库选择图片${selectedIds.size > 0 ? `（已选 ${selectedIds.size} 张）` : ''}`}
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" disabled={selectedIds.size === 0} onClick={handleOk}>确定</Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="暂无图片素材" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, maxHeight: 480, overflowY: 'auto', padding: 4 }}>
          {items.map(m => {
            const selected = selectedIds.has(m.id);
            return (
              <Card
                key={m.id}
                hoverable
                size="small"
                bodyStyle={{ padding: 8 }}
                style={{
                  position: 'relative',
                  border: selected ? '2px solid #1677ff' : undefined,
                  cursor: 'pointer',
                }}
                cover={
                  <Image
                    src={apiService.getMediaUrl(m.file_path)}
                    style={{ height: 100, objectFit: 'cover' }}
                    preview={false}
                  />
                }
                onClick={() => toggleSelect(m.id)}
              >
                {selected && (
                  <CheckCircleFilled style={{ position: 'absolute', top: 4, right: 4, fontSize: 18, color: '#1677ff' }} />
                )}
                <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.filename}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default MediaPickerModal;

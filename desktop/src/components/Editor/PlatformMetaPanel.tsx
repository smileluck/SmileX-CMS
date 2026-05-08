import React, { useCallback } from 'react';
import { Button, Upload, message } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api';
import type { PlatformMeta } from '../../utils/platformMetadata';

interface PlatformMetaPanelProps {
  meta: PlatformMeta;
  articleId?: number | null;
  articleStoragePath?: string | null;
  onMetaChange: (meta: PlatformMeta) => void;
  visible: boolean;
}

function resolveUrl(path: string, articleStoragePath?: string | null): string {
  return apiService.getMediaUrl(path, articleStoragePath || undefined);
}

const PlatformMetaPanel: React.FC<PlatformMetaPanelProps> = ({
  meta,
  articleId,
  articleStoragePath,
  onMetaChange,
  visible,
}) => {
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (articleId) {
      const media = await apiService.uploadToArticle(articleId, file);
      return media.markdown_path || `images/${media.file_path.split('/').pop()}`;
    }
    const media = await apiService.uploadFile(file);
    return media.file_path;
  }, [articleId]);

  const handleAdd = useCallback(async (file: File) => {
    try {
      const path = await uploadImage(file);
      onMetaChange({ images: [...meta.images, `./${path}`] });
      message.success('图片已添加');
    } catch {
      message.error('图片上传失败');
    }
    return false;
  }, [meta, onMetaChange, uploadImage]);

  const handleRemove = useCallback((index: number) => {
    onMetaChange({ images: meta.images.filter((_, i) => i !== index) });
  }, [meta, onMetaChange]);

  if (!visible) return null;

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #f0f0f0',
      background: '#fff',
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 12, color: '#666', fontWeight: 500, lineHeight: '86px', whiteSpace: 'nowrap' }}>
        小红书图片{meta.images.length > 0 && ` (${meta.images.length})`}：
      </div>
      {meta.images.map((img, index) => (
        <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={resolveUrl(img, articleStoragePath)}
            alt={index === 0 ? '封面' : `图片 ${index + 1}`}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: index === 0 ? '2px solid #FE2C55' : '1px solid #eee' }}
          />
          {index === 0 && (
            <span style={{
              position: 'absolute', bottom: 2, left: 0, right: 0,
              textAlign: 'center', fontSize: 10, color: '#FE2C55', fontWeight: 500,
              background: 'rgba(255,255,255,0.85)', borderRadius: '0 0 4px 4px',
            }}>
              封面
            </span>
          )}
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleRemove(index)}
            style={{
              position: 'absolute', top: -6, right: -6,
              background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
              minWidth: 20, width: 20, height: 20, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          />
        </div>
      ))}
      <Upload accept="image/*" showUploadList={false} beforeUpload={handleAdd}>
        <div style={{
          width: 80, height: 80, border: '1px dashed #d9d9d9', borderRadius: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#999', fontSize: 11, gap: 2,
        }}>
          <PlusOutlined style={{ fontSize: 16 }} />
          <span>添加</span>
        </div>
      </Upload>
    </div>
  );
};

export default PlatformMetaPanel;

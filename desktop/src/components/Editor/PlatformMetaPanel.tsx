import React, { useCallback } from 'react';
import { Button, Upload, message } from 'antd';
import { PlusOutlined, CloseOutlined, PictureOutlined } from '@ant-design/icons';
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

  const handleCoverUpload = useCallback(async (file: File) => {
    try {
      const path = await uploadImage(file);
      onMetaChange({ ...meta, cover: `./${path}` });
      message.success('封面图已设置');
    } catch {
      message.error('封面上传失败');
    }
    return false;
  }, [meta, onMetaChange, uploadImage]);

  const handleGalleryAdd = useCallback(async (file: File) => {
    try {
      const path = await uploadImage(file);
      onMetaChange({ ...meta, gallery: [...meta.gallery, `./${path}`] });
      message.success('轮播图已添加');
    } catch {
      message.error('轮播图上传失败');
    }
    return false;
  }, [meta, onMetaChange, uploadImage]);

  const handleRemoveCover = useCallback(() => {
    onMetaChange({ ...meta, cover: null });
  }, [meta, onMetaChange]);

  const handleRemoveGalleryItem = useCallback((index: number) => {
    onMetaChange({ ...meta, gallery: meta.gallery.filter((_, i) => i !== index) });
  }, [meta, onMetaChange]);

  if (!visible) return null;

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #f0f0f0',
      background: '#fff',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 500 }}>封面图</div>
        {meta.cover ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={resolveUrl(meta.cover, articleStoragePath)}
              alt="封面"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleRemoveCover}
              style={{
                position: 'absolute', top: -6, right: -6,
                background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
                minWidth: 20, width: 20, height: 20, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            />
          </div>
        ) : (
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleCoverUpload}>
            <div style={{
              width: 100, height: 100, border: '1px dashed #d9d9d9', borderRadius: 6,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#999', fontSize: 12, gap: 4,
            }}>
              <PlusOutlined style={{ fontSize: 18 }} />
              <span>上传封面</span>
            </div>
          </Upload>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 500 }}>
          轮播图 {meta.gallery.length > 0 && `(${meta.gallery.length})`}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {meta.gallery.map((img, index) => (
            <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={resolveUrl(img, articleStoragePath)}
                alt={`轮播 ${index + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleRemoveGalleryItem(index)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
                  minWidth: 20, width: 20, height: 20, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              />
            </div>
          ))}
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleGalleryAdd}>
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
      </div>
    </div>
  );
};

export default PlatformMetaPanel;

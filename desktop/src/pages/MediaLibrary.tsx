import React, { useEffect, useState } from 'react';
import { Upload, Card, message, Image, Space, Button, Select, Empty } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchMedia, uploadMedia } from '../store/mediaSlice';
import { apiService } from '../services/api';

const MediaLibrary: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.media);
  const [filterType, setFilterType] = useState<string>('image');

  useEffect(() => { dispatch(fetchMedia()); }, [dispatch]);

  const handleUpload = async (file: File) => {
    try {
      await dispatch(uploadMedia(file)).unwrap();
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteMedia(id);
      message.success('删除成功');
      dispatch(fetchMedia());
    } catch {
      message.error('删除失败');
    }
  };

  const filteredItems = filterType ? items.filter(m => m.media_type === filterType) : items;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>媒体库</h1>
        <Space>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 120 }}
            options={[
              { value: 'image', label: '图片' },
              { value: 'video', label: '视频' },
              { value: '', label: '全部' },
            ]}
          />
          <Upload beforeUpload={file => { handleUpload(file); return false; }} showUploadList={false}>
            <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
          </Upload>
        </Space>
      </div>
      {filteredItems.length === 0 ? (
        <Empty description="暂无媒体文件" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filteredItems.map(m => (
            <Card key={m.id} hoverable
              cover={
                m.media_type === 'image' ? (
                  <Image src={apiService.getMediaUrl(m.file_path)} style={{ height: 150, objectFit: 'cover' }} preview={false} />
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                    <span>{m.media_type} - {m.filename}</span>
                  </div>
                )
              }
              actions={[<DeleteOutlined key="delete" onClick={() => handleDelete(m.id)} />]}
            >
              <Card.Meta
                title={m.filename}
                description={m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : ''}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;

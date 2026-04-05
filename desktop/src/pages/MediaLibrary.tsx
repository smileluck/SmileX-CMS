import React, { useEffect } from 'react';
import { Upload, Card, message, Image, Space, Button } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchMedia, uploadMedia } from '../store/mediaSlice';
import { apiService } from '../services/api';

const MediaLibrary: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.media);

  useEffect(() => { dispatch(fetchMedia()); }, [dispatch]);

  const handleUpload = async (file: File) => {
    await dispatch(uploadMedia(file)).unwrap();
    message.success('上传成功');
  };

  const handleDelete = async (id: number) => {
    await apiService.deleteMedia(id);
    dispatch(fetchMedia());
    message.success('删除成功');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>媒体库</h1>
        <Upload beforeUpload={file => { handleUpload(file); return false; }} showUploadList={false}>
          <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
        </Upload>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {items.filter(m => m.media_type === 'image').map(m => (
          <Card key={m.id} hoverable cover={<Image src={`http://localhost:8000/${m.file_path}`} style={{ height: 150, objectFit: 'cover' }} preview={false} />}
            actions={[<DeleteOutlined key="delete" onClick={() => handleDelete(m.id)} />]}>
            <Card.Meta title={m.filename} description={`${(m.file_size! / 1024).toFixed(1)} KB`} />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MediaLibrary;

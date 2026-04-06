import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Upload, Form, message, Space } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { createArticle } from '../store/articleSlice';

const VideoEditor: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { message.warning('请输入标题'); return; }
    setSaving(true);
    try {
      await dispatch(createArticle({
        title,
        content: description,
        article_type: 'video',
        metadata: videoFile ? { videoFileName: videoFile.name, videoFileSize: videoFile.size } : undefined,
      })).unwrap();
      message.success('创建成功');
      navigate('/videos');
    } catch {
      message.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/videos')}>返回</Button>
        <h2>新建视频</h2>
      </Space>
      <Form layout="vertical" style={{ maxWidth: 800 }}>
        <Form.Item label="标题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="视频标题" size="large" />
        </Form.Item>
        <Form.Item label="视频文件">
          <Upload
            beforeUpload={(file) => { setVideoFile(file); return false; }}
            maxCount={1}
            accept="video/*"
            onRemove={() => setVideoFile(null)}
          >
            <Button icon={<UploadOutlined />}>
              {videoFile ? videoFile.name : '选择视频文件'}
            </Button>
          </Upload>
        </Form.Item>
        <Form.Item label="简介">
          <Input.TextArea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="视频简介" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default VideoEditor;

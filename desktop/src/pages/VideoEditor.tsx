import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Button, Upload, Form, message, Space, Select, Spin } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { createArticle, updateArticle } from '../store/articleSlice';
import { fetchTags } from '../store/tagSlice';
import { apiService } from '../services/api';

const VideoEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { tags: allTags } = useSelector((state: RootState) => state.tag);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const article = await apiService.getArticleById(Number(id));
        if (cancelled) return;
        setTitle(article.title);
        setDescription(article.content || '');
        setTagIds(article.tag_objects?.map(t => t.id) || []);

        if (article.metadata?.videoFileName) {
          setVideoFileName(article.metadata.videoFileName as string);
        }

        const medias = await apiService.getMediaFiles({ media_type: 'video' });
        const videoMedia = medias.find(m => m.article_id === Number(id));
        if (videoMedia) {
          const url = apiService.getMediaUrl(videoMedia.file_path);
          setVideoUrl(url);
          if (videoMedia.filename) {
            setVideoFileName(videoMedia.filename);
          }
        }

        setLoading(false);
      } catch {
        if (cancelled) return;
        message.error('加载失败');
        navigate('/videos');
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleReplaceVideo = async () => {
    if (!videoFile || !id) return;
    setSaving(true);
    try {
      await apiService.uploadToArticle(Number(id), videoFile);
      const medias = await apiService.getMediaFiles({ media_type: 'video' });
      const videoMedia = medias.find(m => m.article_id === Number(id));
      if (videoMedia) {
        setVideoUrl(apiService.getMediaUrl(videoMedia.file_path));
        setVideoFileName(videoMedia.filename);
      }
      setVideoFile(null);
      setReplacing(false);
      message.success('视频已替换');
    } catch {
      message.error('替换视频失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { message.warning('请输入标题'); return; }
    if (!id && !videoFile) { message.warning('请选择视频文件'); return; }
    setSaving(true);
    try {
      if (id) {
        await dispatch(updateArticle({
          id: Number(id),
          data: { title, content: description, tag_ids: tagIds },
        })).unwrap();
        message.success('保存成功');
      } else {
        const result = await dispatch(createArticle({
          title,
          content: description,
          article_type: 'video',
          tag_ids: tagIds,
          metadata: { videoFileName: videoFile!.name, videoFileSize: videoFile!.size },
        })).unwrap();

        await apiService.uploadToArticle(result.id, videoFile!);

        message.success('创建成功');
      }
      navigate('/videos');
    } catch {
      message.error(id ? '保存失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/videos')}>返回</Button>
        <h2>{id ? '编辑视频' : '新建视频'}</h2>
      </Space>
      <Form layout="vertical" style={{ maxWidth: 800 }}>
        <Form.Item label="标题" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="视频标题" size="large" />
        </Form.Item>
        <Form.Item label="视频文件" required>
          {videoUrl && !replacing ? (
            <div>
              <video
                src={videoUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8, background: '#000' }}
              />
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666', fontSize: 13 }}>{videoFileName}</span>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => setReplacing(true)}
                >
                  替换视频
                </Button>
              </div>
            </div>
          ) : id && replacing ? (
            <div>
              <Upload
                beforeUpload={(file) => { setVideoFile(file); return false; }}
                maxCount={1}
                accept="video/*"
                onRemove={() => setVideoFile(null)}
              >
                <Button icon={<UploadOutlined />}>
                  {videoFile ? videoFile.name : '选择新视频文件'}
                </Button>
              </Upload>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button size="small" type="primary" onClick={handleReplaceVideo} loading={saving} disabled={!videoFile}>
                  确认替换
                </Button>
                <Button size="small" onClick={() => { setReplacing(false); setVideoFile(null); }}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </Form.Item>
        <Form.Item label="标签">
          <Select
            mode="multiple"
            maxCount={5}
            value={tagIds}
            onChange={setTagIds}
            placeholder="选择标签（最多5个）"
            style={{ width: '100%' }}
            options={allTags.map(t => ({ label: t.name, value: t.id }))}
          />
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

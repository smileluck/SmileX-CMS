import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Radio, Spin, Divider } from 'antd';
import { apiService } from '../services/api';

const getMenuLayout = (): string => localStorage.getItem('menuLayout') || 'sidebar';

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const appSettings = await apiService.getSettings();
        form.setFieldsValue({
          apiUrl: apiService.baseURL.replace('/api', ''),
          menuLayout: getMenuLayout(),
          base_storage_path: appSettings.settings.base_storage_path || '',
        });
      } catch {
        form.setFieldsValue({
          apiUrl: apiService.baseURL.replace('/api', ''),
          menuLayout: getMenuLayout(),
        });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [form]);

  const onFinish = async (values: { apiUrl: string; menuLayout: string; base_storage_path?: string }) => {
    const url = values.apiUrl.trim().replace(/\/$/, '') + '/api';
    localStorage.setItem('menuLayout', values.menuLayout);

    try {
      const settings: Record<string, string> = {};
      settings.base_storage_path = values.base_storage_path?.trim() || '';
      await apiService.updateSettings(settings);
      apiService.setBaseURL(url);
      message.success('设置已保存');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(detail || '保存失败，请检查后端连接');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>设置</h1>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="后端 API 地址" name="apiUrl" rules={[{ required: true }]}>
            <Input placeholder="http://localhost:8000" />
          </Form.Item>
          <Form.Item label="菜单位置" name="menuLayout">
            <Radio.Group>
              <Radio.Button value="sidebar">侧边栏</Radio.Button>
              <Radio.Button value="topbar">顶部栏</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider>存储位置</Divider>

          <Form.Item
            label="基础存储路径"
            name="base_storage_path"
            extra="留空则使用默认路径（应用目录下的 storage/ 文件夹）。文章和视频将分别存储在该路径的 articles/ 和 videos/ 子目录中"
          >
            <Input placeholder="例如：D:\SmileXStorage 或 /home/user/smilex" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;

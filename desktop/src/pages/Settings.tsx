import React, { useEffect } from 'react';
import { Card, Form, Input, Button, message, Radio } from 'antd';
import { apiService } from '../services/api';

const getMenuLayout = (): string => localStorage.getItem('menuLayout') || 'sidebar';

const Settings: React.FC = () => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      apiUrl: apiService.baseURL.replace('/api', ''),
      menuLayout: getMenuLayout(),
    });
  }, [form]);

  const onFinish = (values: { apiUrl: string; menuLayout: string }) => {
    const url = values.apiUrl.replace(/\/$/, '') + '/api';
    apiService.setBaseURL(url);
    localStorage.setItem('menuLayout', values.menuLayout);
    message.success('设置已保存');
  };

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
          <Form.Item>
            <Button type="primary" htmlType="submit">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;

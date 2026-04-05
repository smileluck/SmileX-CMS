import React from 'react';
import { Card, Form, Input, Button, message } from 'antd';

const Settings: React.FC = () => (
  <div>
    <h1 style={{ marginBottom: 24 }}>设置</h1>
    <Card style={{ maxWidth: 600 }}>
      <Form layout="vertical" onFinish={() => message.success('设置已保存')}>
        <Form.Item label="后端 API 地址" name="apiUrl" initialValue="http://localhost:8000">
          <Input placeholder="http://localhost:8000" />
        </Form.Item>
        <Form.Item label="文章存储目录" name="articlesDir" initialValue="./articles">
          <Input placeholder="文章存储路径" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">保存设置</Button>
        </Form.Item>
      </Form>
    </Card>
  </div>
);

export default Settings;

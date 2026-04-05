import React, { useEffect } from 'react';
import { Card, Button, Modal, Form, Input, Select, Tag, Space, message, List } from 'antd';
import { PlusOutlined, LinkOutlined, DisconnectOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchPlatforms, fetchAvailablePlatforms } from '../store/platformSlice';
import { apiService } from '../services/api';

const platformNameMap: Record<string, string> = {
  wechat_mp: '微信公众号', wechat_channels: '微信视频号', xiaohongshu: '小红书',
  bilibili: 'Bilibili', douyin_article: '抖音图文', douyin_video: '抖音视频',
};

const PlatformManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, availablePlatforms } = useSelector((state: RootState) => state.platform);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchPlatforms());
    dispatch(fetchAvailablePlatforms());
  }, [dispatch]);

  const handleBind = async (values: any) => {
    try {
      await apiService.bindPlatformAccount(values);
      message.success('绑定成功');
      setModalOpen(false);
      form.resetFields();
      dispatch(fetchPlatforms());
    } catch { message.error('绑定失败'); }
  };

  const handleUnbind = async (id: number) => {
    await apiService.unbindPlatformAccount(id);
    message.success('解绑成功');
    dispatch(fetchPlatforms());
  };

  const handleTest = async (id: number) => {
    const result = await apiService.testPlatformConnection(id);
    message[result.connected ? 'success' : 'error'](result.connected ? '连接正常' : '连接失败');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>平台管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>绑定平台</Button>
      </div>
      <List
        grid={{ gutter: 16, columns: 3 }}
        dataSource={accounts}
        renderItem={item => (
          <List.Item>
            <Card title={<Space><LinkOutlined />{platformNameMap[item.platform_name] || item.platform_name}</Space>}
              extra={<Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status}</Tag>}
              actions={[
                <Button size="small" icon={<ThunderboltOutlined />} onClick={() => handleTest(item.id)}>测试</Button>,
                <Button size="small" danger icon={<DisconnectOutlined />} onClick={() => handleUnbind(item.id)}>解绑</Button>,
              ]}>
              <p>账号：{item.account_name}</p>
            </Card>
          </List.Item>
        )}
      />
      <Modal title="绑定平台账号" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleBind}>
          <Form.Item name="platform_name" label="平台" rules={[{ required: true }]}>
            <Select placeholder="选择平台" options={availablePlatforms.map(p => ({ value: p.platform_name, label: p.display_name }))} />
          </Form.Item>
          <Form.Item name="account_name" label="账号名称" rules={[{ required: true }]}>
            <Input placeholder="输入显示名称" />
          </Form.Item>
          <Form.Item name="cookies" label="Cookie（Playwright 平台）">
            <Input.TextArea rows={3} placeholder="粘贴浏览器 Cookie" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformManager;

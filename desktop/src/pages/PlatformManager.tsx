import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, Tag, Space, message, List, Spin, InputNumber } from 'antd';
import { PlusOutlined, LinkOutlined, DisconnectOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchPlatforms, fetchAvailablePlatforms } from '../store/platformSlice';
import { apiService } from '../services/api';
import PlatformIcon, { platformNameMap, getUnifiedPlatformName } from '../components/PlatformIcon';

const HIDDEN_PLATFORMS = ['douyin_article', 'douyin_video'];

const PlatformManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, availablePlatforms, isLoading } = useSelector((state: RootState) => state.platform);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configAccountId, setConfigAccountId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchPlatforms());
    dispatch(fetchAvailablePlatforms());
  }, [dispatch]);

  const handleBind = async (values: any) => {
    try {
      const { app_id, app_secret, ...rest } = values;
      const bindData: any = { ...rest };
      if (values.platform_name === 'wechat_mp') {
        bindData.config = { app_id, app_secret };
      }
      await apiService.bindPlatformAccount(bindData);
      message.success('绑定成功');
      setModalOpen(false);
      form.resetFields();
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '绑定失败');
    }
  };

  const handleUnbind = async (id: number) => {
    try {
      await apiService.unbindPlatformAccount(id);
      message.success('解绑成功');
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '解绑失败');
    }
  };

  const handleTest = async (id: number) => {
    try {
      const result = await apiService.testPlatformConnection(id);
      message[result.connected ? 'success' : 'error'](result.connected ? '连接正常' : '连接失败');
    } catch (e: any) {
      message.error(e.response?.data?.detail || '测试失败');
    }
  };

  const handleConfigWechat = (accountId: number) => {
    const account = accounts.find(a => a.id === accountId);
    setConfigAccountId(accountId);
    configForm.setFieldsValue({
      app_id: account?.config?.app_id || '',
      app_secret: account?.config?.app_secret || '',
    });
    setConfigModalOpen(true);
  };

  const handleConfigSave = async (values: any) => {
    if (!configAccountId) return;
    try {
      await apiService.updatePlatformAccount(configAccountId, {
        config: { app_id: values.app_id, app_secret: values.app_secret },
      });
      message.success('配置已保存');
      setConfigModalOpen(false);
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '配置失败');
    }
  };

  const filteredPlatforms = availablePlatforms.filter(
    p => !HIDDEN_PLATFORMS.includes(p.platform_name)
  );

  if (isLoading && accounts.length === 0) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>平台管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>绑定平台</Button>
      </div>
      <List
        grid={{ gutter: 16, columns: 3 }}
        dataSource={accounts}
        renderItem={item => {
          const isWechatMP = item.platform_name === 'wechat_mp';
          return (
            <List.Item>
              <Card
                title={
                  <Space>
                    <PlatformIcon platformName={item.platform_name} size={20} />
                    <span>{platformNameMap[item.platform_name] || item.platform_name}</span>
                  </Space>
                }
                extra={<Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status}</Tag>}
                actions={[
                  <Button size="small" icon={<ThunderboltOutlined />} onClick={() => handleTest(item.id)}>测试</Button>,
                  ...(isWechatMP ? [<Button size="small" icon={<SettingOutlined />} onClick={() => handleConfigWechat(item.id)}>配置</Button>] : []),
                  <Button size="small" danger icon={<DisconnectOutlined />} onClick={() => handleUnbind(item.id)}>解绑</Button>,
                ]}
              >
                <p>账号：{item.account_name}</p>
                {isWechatMP && item.config?.app_id && <p style={{ color: '#999', fontSize: 12 }}>AppID：{item.config.app_id}</p>}
              </Card>
            </List.Item>
          );
        }}
      />
      <Modal title="绑定平台账号" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleBind}>
          <Form.Item name="platform_name" label="平台" rules={[{ required: true }]}>
            <Select
              placeholder="选择平台"
              options={filteredPlatforms.map(p => ({
                value: p.platform_name,
                label: (
                  <Space>
                    <PlatformIcon platformName={p.platform_name} size={16} />
                    <span>{p.display_name}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item name="account_name" label="账号名称" rules={[{ required: true }]}>
            <Input placeholder="输入显示名称" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.platform_name !== cur.platform_name}>
            {({ getFieldValue }) => {
              const platform = getFieldValue('platform_name');
              if (platform === 'wechat_mp') {
                return (
                  <>
                    <Form.Item name="app_id" label="AppID" rules={[{ required: true }]}>
                      <Input placeholder="公众号 AppID" />
                    </Form.Item>
                    <Form.Item name="app_secret" label="AppSecret" rules={[{ required: true }]}>
                      <Input.Password placeholder="公众号 AppSecret" />
                    </Form.Item>
                  </>
                );
              }
              return (
                <Form.Item name="cookies" label="Cookie（Playwright 平台）">
                  <Input.TextArea rows={3} placeholder="粘贴浏览器 Cookie" />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="微信公众号配置" open={configModalOpen} onCancel={() => setConfigModalOpen(false)} onOk={() => configForm.submit()}>
        <Form form={configForm} layout="vertical" onFinish={handleConfigSave}>
          <Form.Item name="app_id" label="AppID" rules={[{ required: true }]}>
            <Input placeholder="公众号 AppID" />
          </Form.Item>
          <Form.Item name="app_secret" label="AppSecret" rules={[{ required: true }]}>
            <Input.Password placeholder="公众号 AppSecret" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformManager;

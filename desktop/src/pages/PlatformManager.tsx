import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, Tag, Space, message, List, Spin, Descriptions } from 'antd';
import { PlusOutlined, LinkOutlined, DisconnectOutlined, ThunderboltOutlined, SettingOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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

  const [testingIds, setTestingIds] = useState<Set<number>>(new Set());
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    dispatch(fetchPlatforms());
    dispatch(fetchAvailablePlatforms());
  }, [dispatch]);

  const handleBind = async (values: any) => {
    try {
      const { app_id, app_secret, access_token, ...rest } = values;
      const bindData: any = { ...rest };
      if (values.platform_name === 'wechat_mp') {
        bindData.config = { app_id, app_secret };
        if (access_token) {
          bindData.access_token = access_token;
        }
      }
      const newAccount = await apiService.bindPlatformAccount(bindData);
      setModalOpen(false);
      form.resetFields();
      dispatch(fetchPlatforms());

      const hide = message.loading('绑定成功，正在自动测试连接...', 0);
      try {
        const result = await apiService.autoTestPlatform(newAccount.id);
        hide();
        if (result.connected) {
          message.success('自动测试通过，access_token 已保存，平台状态已更新为 active');
        } else {
          message.warning(`自动测试未通过: ${result.error || '请检查配置'}`);
        }
      } catch {
        hide();
        message.warning('自动测试失败，请稍后手动测试');
      }
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
    setTestingIds(prev => new Set(prev).add(id));
    try {
      const result = await apiService.testPlatformConnection(id);
      if (result.connected) {
        if (result.access_token_saved) {
          message.success('连接正常，access_token 已自动获取并保存，状态已更新为 active');
        } else {
          message.success('连接正常，状态已更新为 active');
        }
      } else {
        message.error(`连接失败: ${result.error || '请检查配置'}`);
      }
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '测试失败');
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleConfigWechat = (accountId: number) => {
    const account = accounts.find(a => a.id === accountId);
    setConfigAccountId(accountId);
    configForm.setFieldsValue({
      app_id: account?.config?.app_id || '',
      app_secret: account?.config?.app_secret || '',
      access_token: account?.access_token || '',
    });
    setConfigModalOpen(true);
  };

  const handleConfigSave = async (values: any) => {
    if (!configAccountId) return;
    try {
      const updateData: any = {
        config: { app_id: values.app_id, app_secret: values.app_secret },
      };
      if (values.access_token) {
        updateData.access_token = values.access_token;
      }
      await apiService.updatePlatformAccount(configAccountId, updateData);
      setConfigModalOpen(false);
      dispatch(fetchPlatforms());

      if (values.access_token) {
        const hide = message.loading('正在验证提供的 access_token...', 0);
        try {
          const result = await apiService.validatePlatformToken(configAccountId, values.access_token);
          hide();
          if (result.valid) {
            if (result.refreshed) {
              message.warning('提供的 token 无效，已重新获取并验证通过');
            } else {
              message.success('access_token 验证通过');
            }
          } else {
            message.error(result.message || 'access_token 验证失败');
          }
        } catch {
          hide();
          message.warning('token 验证请求失败');
        }
      } else {
        const hide = message.loading('配置已保存，正在自动测试连接...', 0);
        try {
          const result = await apiService.autoTestPlatform(configAccountId);
          hide();
          if (result.connected) {
            message.success('自动测试通过，access_token 已自动获取并保存');
          } else {
            message.warning('自动测试未通过，请检查配置');
          }
        } catch {
          hide();
          message.warning('自动测试失败，请稍后手动测试');
        }
      }
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '配置失败');
    }
  };

  const handleValidateToken = async () => {
    if (!configAccountId) return;
    const accessToken = configForm.getFieldValue('access_token');
    if (!accessToken) {
      message.warning('请先输入 access_token');
      return;
    }
    setValidating(true);
    try {
      const result = await apiService.validatePlatformToken(configAccountId, accessToken);
      if (result.valid) {
        if (result.refreshed) {
          message.warning('提供的 token 无效，已重新获取并验证通过');
        } else {
          message.success('access_token 验证通过');
        }
      } else {
        message.error(result.message || '验证失败');
      }
      dispatch(fetchPlatforms());
    } catch (e: any) {
      message.error(e.response?.data?.detail || '验证请求失败');
    } finally {
      setValidating(false);
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
        grid={{ gutter: 16, column: 3 }}
        dataSource={accounts}
        renderItem={item => {
          const isWechatMP = item.platform_name === 'wechat_mp';
          const hasToken = !!item.access_token;
          const isExpired = item.token_expires_at ? new Date(item.token_expires_at) < new Date() : true;
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
                  <Button size="small" icon={testingIds.has(item.id) ? <LoadingOutlined /> : <ThunderboltOutlined />} onClick={() => handleTest(item.id)} disabled={testingIds.has(item.id)}>测试</Button>,
                  ...(isWechatMP ? [<Button size="small" icon={<SettingOutlined />} onClick={() => handleConfigWechat(item.id)}>配置</Button>] : []),
                  <Button size="small" danger icon={<DisconnectOutlined />} onClick={() => handleUnbind(item.id)}>解绑</Button>,
                ]}
              >
                <p>账号：{item.account_name}</p>
                {isWechatMP && item.config?.app_id && <p style={{ color: '#999', fontSize: 12 }}>AppID：{item.config.app_id}</p>}
                {isWechatMP && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    <Space>
                      {hasToken ? (
                        isExpired ? (
                          <Tag color="orange" style={{ fontSize: 11 }}>Token 已过期</Tag>
                        ) : (
                          <Tag color="green" style={{ fontSize: 11 }}>Token 有效</Tag>
                        )
                      ) : (
                        <Tag color="default" style={{ fontSize: 11 }}>未获取 Token</Tag>
                      )}
                      {item.token_expires_at && (
                        <span>过期: {new Date(item.token_expires_at).toLocaleString()}</span>
                      )}
                    </Space>
                  </div>
                )}
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
                    <Form.Item name="access_token" label="Access Token（可选）" extra="如果已手动获取 access_token，可填入此处进行验证。留空则绑定后自动获取。">
                      <Input.Password placeholder="Access Token（可选）" />
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
      <Modal title="微信公众号配置" open={configModalOpen} onCancel={() => setConfigModalOpen(false)} width={600} footer={[
        <Button key="cancel" onClick={() => setConfigModalOpen(false)}>取消</Button>,
        <Button key="validate" icon={<SafetyCertificateOutlined />} loading={validating} onClick={handleValidateToken}>
          验证 Token
        </Button>,
        <Button key="save" type="primary" onClick={() => configForm.submit()}>
          保存
        </Button>,
      ]}>
        <Form form={configForm} layout="vertical" onFinish={handleConfigSave}>
          <Form.Item name="app_id" label="AppID" rules={[{ required: true }]}>
            <Input placeholder="公众号 AppID" />
          </Form.Item>
          <Form.Item name="app_secret" label="AppSecret" rules={[{ required: true }]}>
            <Input.Password placeholder="公众号 AppSecret" />
          </Form.Item>
          <Form.Item
            name="access_token"
            label="Access Token"
            extra="可手动填入 access_token 并点击「验证 Token」按钮验证。留空则保存时通过 AppID/AppSecret 自动获取。"
          >
            <Input.TextArea rows={2} placeholder="Access Token（可手动填入或自动获取）" />
          </Form.Item>
        </Form>
        {(() => {
          const account = accounts.find(a => a.id === configAccountId);
          if (!account) return null;
          return (
            <Descriptions size="small" bordered column={1} style={{ marginTop: 8 }}>
              <Descriptions.Item label="当前状态">
                <Tag color={account.status === 'active' ? 'green' : 'red'}>{account.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Token 状态">
                {account.access_token ? (
                  account.token_expires_at && new Date(account.token_expires_at) > new Date() ? (
                    <Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><span>有效（过期时间: {new Date(account.token_expires_at).toLocaleString()}）</span></Space>
                  ) : (
                    <Space><CloseCircleOutlined style={{ color: '#faad14' }} /><span>已过期</span></Space>
                  )
                ) : (
                  <span style={{ color: '#999' }}>未获取</span>
                )}
              </Descriptions.Item>
            </Descriptions>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PlatformManager;

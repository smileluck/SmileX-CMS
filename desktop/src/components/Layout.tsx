import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  DashboardOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  TagsOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';

const { Sider, Header, Content } = AntLayout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/articles', icon: <FileTextOutlined />, label: '图文管理' },
  { key: '/videos', icon: <VideoCameraOutlined />, label: '视频管理' },
  { key: '/tags', icon: <TagsOutlined />, label: '标签管理' },
  { key: '/media', icon: <PictureOutlined />, label: '媒体库' },
  { key: '/platforms', icon: <CloudUploadOutlined />, label: '平台管理' },
  { key: '/publish/history', icon: <HistoryOutlined />, label: '发布历史' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

const getMenuLayout = (): string => localStorage.getItem('menuLayout') || 'sidebar';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [layout, setLayout] = useState<'sidebar' | 'topbar'>(getMenuLayout() as 'sidebar' | 'topbar');

  useEffect(() => {
    const onStorage = () => setLayout(getMenuLayout() as 'sidebar' | 'topbar');
    window.addEventListener('storage', onStorage);
    const interval = setInterval(() => {
      const current = getMenuLayout();
      if (current !== layout) setLayout(current as 'sidebar' | 'topbar');
    }, 500);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, [layout]);

  const userMenu = {
    items: [
      { key: 'settings', icon: <SettingOutlined />, label: '设置', onClick: () => navigate('/settings') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => dispatch(logout()) },
    ],
  };

  const selectedKeys = [location.pathname.startsWith('/articles') || location.pathname.startsWith('/videos') ? location.pathname : location.pathname];

  if (layout === 'topbar') {
    return (
      <AntLayout style={{ height: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', gap: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginRight: 32, whiteSpace: 'nowrap' }}>SmileX-CAS</h2>
          <Menu
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1, border: 'none', minWidth: 0 }}
          />
          <Dropdown menu={userMenu}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.full_name || user?.username || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </Content>
      </AntLayout>
    );
  }

  return (
    <AntLayout style={{ height: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>SmileX-CAS</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <Dropdown menu={userMenu}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.full_name || user?.username || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';

const VideoList: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>视频管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/videos/new')}>新建视频</Button>
      </div>
      <Table columns={[
        { title: '标题', dataIndex: 'title' },
        { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === 'published' ? 'green' : 'blue'}>{s}</Tag> },
        { title: '操作', render: () => <Button size="small" icon={<EditOutlined />}>编辑</Button> },
      ]} dataSource={[]} rowKey="id" />
    </div>
  );
};

export default VideoList;

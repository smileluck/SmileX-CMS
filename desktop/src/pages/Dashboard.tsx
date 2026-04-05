import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { FileTextOutlined, VideoCameraOutlined, CloudUploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const Dashboard: React.FC = () => {
  const { articles } = useSelector((state: RootState) => state.article);
  const { tasks } = useSelector((state: RootState) => state.publish);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>仪表盘</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="总文章数" value={articles.length} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已发布" value={articles.filter(a => a.status === 'published').length} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="视频数" value={articles.filter(a => a.article_type === 'video').length} prefix={<VideoCameraOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="发布任务" value={tasks.length} prefix={<CloudUploadOutlined />} /></Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Result, Button, Space } from 'antd';
import { CheckCircleOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';

const ArticleSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { articleId?: number; articleTitle?: string; action?: string } | null;

  const isPublish = state?.action === 'publish';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title={isPublish ? '发布任务已提交' : '保存成功'}
        subTitle={state?.articleTitle || ''}
        extra={
          <Space>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/articles')}>
              返回列表
            </Button>
            {isPublish && (
              <Button icon={<PlusOutlined />} onClick={() => navigate('/articles/new')}>
                继续创建
              </Button>
            )}
            {state?.articleId && (
              <Button onClick={() => navigate(`/articles/${state.articleId}/edit`)}>
                继续编辑
              </Button>
            )}
          </Space>
        }
      />
    </div>
  );
};

export default ArticleSuccess;

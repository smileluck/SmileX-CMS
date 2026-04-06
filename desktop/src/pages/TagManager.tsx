import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Modal, Input, Form, message, Popconfirm, ColorPicker, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined, SyncOutlined, SwapOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchTags, createTag, updateTag, deleteTag } from '../store/tagSlice';
import { apiService } from '../services/api';
import type { Tag as TagType } from '../types';

const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

const TagManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tags, isLoading } = useSelector((state: RootState) => state.tag);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm();
  const [migrating, setMigrating] = useState(false);
  const [colorHex, setColorHex] = useState('#1890ff');

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingTag(null);
    const c = randomColor();
    form.resetFields();
    setColorHex(c);
    setModalOpen(true);
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    const c = tag.color || '#1890ff';
    form.setFieldsValue({ name: tag.name });
    setColorHex(c);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const color = colorHex;
      if (editingTag) {
        await dispatch(updateTag({ id: editingTag.id, data: { name: values.name, color } })).unwrap();
        message.success('标签更新成功');
      } else {
        await dispatch(createTag({ name: values.name, color })).unwrap();
        message.success('标签创建成功');
      }
      setModalOpen(false);
      dispatch(fetchTags());
    } catch (error: any) {
      if (error?.message || typeof error === 'string') {
        message.error(typeof error === 'string' ? error : '操作失败');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteTag(id)).unwrap();
      message.success('标签删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await apiService.migrateLegacyTags();
      message.success(`迁移完成，共处理 ${result.migrated} 条关联`);
      dispatch(fetchTags());
    } catch {
      message.error('迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  const columns = [
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 60,
      render: (color: string | null) => (
        <div style={{ width: 24, height: 24, borderRadius: 4, background: color || '#d9d9d9', border: '1px solid #e8e8e8' }} />
      ),
    },
    {
      title: '标签名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TagType) => (
        <Tag color={record.color || undefined}>{name}</Tag>
      ),
    },
    {
      title: '文章数',
      dataIndex: 'article_count',
      key: 'article_count',
      width: 100,
      sorter: (a: TagType, b: TagType) => a.article_count - b.article_count,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (t: string) => t ? new Date(t).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: TagType) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定要删除此标签吗？" description="删除后文章与该标签的关联也会被移除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h1><TagsOutlined style={{ marginRight: 8 }} />标签管理</h1>
        <Space>
          <Button icon={<SyncOutlined />} loading={migrating} onClick={handleMigrate}>迁移旧标签</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建标签</Button>
        </Space>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
          style={{ height: '100%' }}
        />
      </div>

      <Modal
        title={editingTag ? '编辑标签' : '新建标签'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="标签名" rules={[{ required: true, message: '请输入标签名' }, { max: 50, message: '标签名最多50个字符' }]}>
            <Input placeholder="请输入标签名" maxLength={50} />
          </Form.Item>
          <Form.Item label="颜色">
            <Space>
              <ColorPicker value={colorHex} onChange={(_, hex) => setColorHex(hex)} format="hex" presets={[{ label: '推荐颜色', colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'] }]} />
              <Button icon={<SwapOutlined />} onClick={() => setColorHex(randomColor())}>随机</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManager;

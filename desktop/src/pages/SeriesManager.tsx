import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Input, Form, message, Popconfirm, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchSeries, createSeries, updateSeries, deleteSeries } from '../store/seriesSlice';
import type { Series } from '../types';

const SeriesManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { series, isLoading } = useSelector((state: RootState) => state.series);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchSeries());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingSeries(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (s: Series) => {
    setEditingSeries(s);
    form.setFieldsValue({ name: s.name, description: s.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingSeries) {
        await dispatch(updateSeries({ id: editingSeries.id, data: { name: values.name, description: values.description || null } })).unwrap();
        message.success('系列更新成功');
      } else {
        await dispatch(createSeries({ name: values.name, description: values.description || undefined })).unwrap();
        message.success('系列创建成功');
      }
      setModalOpen(false);
      dispatch(fetchSeries());
    } catch (error: any) {
      if (error?.message || typeof error === 'string') {
        message.error(typeof error === 'string' ? error : '操作失败');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteSeries(id)).unwrap();
      message.success('系列删除成功');
      dispatch(fetchSeries());
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '系列名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FolderOutlined />
          <span>{name}</span>
          {name === '未分类' && <Tag color="default">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span style={{ color: '#ccc' }}>-</span>,
    },
    {
      title: '文章数',
      dataIndex: 'article_count',
      key: 'article_count',
      width: 100,
      sorter: (a: Series, b: Series) => a.article_count - b.article_count,
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
      render: (_: any, record: Series) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          {record.name !== '未分类' ? (
            <Popconfirm title="确定要删除此系列吗？" description="该系列下的文章将被移至「未分类」" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          ) : (
            <Tooltip title="默认系列不能删除">
              <Button size="small" danger icon={<DeleteOutlined />} disabled>删除</Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}><FolderOutlined style={{ marginRight: 8 }} />系列管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建系列</Button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={series}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
          style={{ height: '100%' }}
        />
      </div>

      <Modal
        title={editingSeries ? '编辑系列' : '新建系列'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="系列名" rules={[{ required: true, message: '请输入系列名' }, { max: 100, message: '系列名最多100个字符' }]}>
            <Input placeholder="请输入系列名" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入系列描述（可选）" maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SeriesManager;

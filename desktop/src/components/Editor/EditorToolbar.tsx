import React, { useCallback, useRef } from 'react';
import { Button, Tooltip, Upload, Dropdown, Space } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  LineOutlined,
  FontSizeOutlined,
  UndoOutlined,
  RedoOutlined,
  BlockOutlined,
  TableOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface EditorToolbarProps {
  onInsertMarkdown: (before: string, after?: string, placeholder?: string) => void;
  onImageUpload: (file: File) => void;
  editorReady: boolean;
  editMode?: 'wysiwyg' | 'markdown';
  onToggleEditMode?: () => void;
}

const headingItems: MenuProps['items'] = [
  { key: '1', label: 'H1 一级标题' },
  { key: '2', label: 'H2 二级标题' },
  { key: '3', label: 'H3 三级标题' },
  { key: '4', label: 'H4 四级标题' },
  { key: '5', label: 'H5 五级标题' },
  { key: '6', label: 'H6 六级标题' },
];

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertMarkdown,
  onImageUpload,
  editorReady,
  editMode = 'wysiwyg',
  onToggleEditMode,
}) => {
  const disabled = !editorReady;

  const handleHeading = useCallback(({ key }: { key: string }) => {
    const level = parseInt(key);
    const prefix = '#'.repeat(level) + ' ';
    onInsertMarkdown(prefix, '', '标题');
  }, [onInsertMarkdown]);

  const ToolBtn = ({
    icon,
    label,
    before,
    after,
    placeholder,
  }: {
    icon: React.ReactNode;
    label: string;
    before: string;
    after?: string;
    placeholder?: string;
  }) => (
    <Tooltip title={label}>
      <Button
        type="text"
        size="small"
        icon={icon}
        disabled={disabled}
        onClick={() => onInsertMarkdown(before, after, placeholder)}
      />
    </Tooltip>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '4px 8px',
      borderBottom: '1px solid #f0f0f0',
      background: '#fafafa',
      flexWrap: 'wrap',
    }}>
      <Dropdown menu={{ items: headingItems, onClick: handleHeading }} trigger={['click']}>
        <Tooltip title="标题">
          <Button type="text" size="small" icon={<FontSizeOutlined />} disabled={disabled} />
        </Tooltip>
      </Dropdown>

      <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 4px' }} />

      <ToolBtn icon={<BoldOutlined />} label="加粗 (Ctrl+B)" before="**" after="**" placeholder="粗体文本" />
      <ToolBtn icon={<ItalicOutlined />} label="斜体 (Ctrl+I)" before="*" after="*" placeholder="斜体文本" />
      <ToolBtn icon={<StrikethroughOutlined />} label="删除线" before="~~" after="~~" placeholder="删除线文本" />
      <ToolBtn icon={<CodeOutlined />} label="行内代码" before="`" after="`" placeholder="code" />

      <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 4px' }} />

      <ToolBtn icon={<UnorderedListOutlined />} label="无序列表" before="- " />
      <ToolBtn icon={<OrderedListOutlined />} label="有序列表" before="1. " />
      <ToolBtn icon={<BlockOutlined />} label="引用" before="> " />

      <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 4px' }} />

      <ToolBtn
        icon={<CodeOutlined />}
        label="代码块"
        before="```\n"
        after="\n```"
        placeholder="code here"
      />
      <ToolBtn icon={<LinkOutlined />} label="链接 (Ctrl+K)" before="[" after="](url)" placeholder="链接文本" />
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => { onImageUpload(file); return false; }}
      >
        <Tooltip title="插入图片">
          <Button type="text" size="small" icon={<PictureOutlined />} disabled={disabled} />
        </Tooltip>
      </Upload>
      <ToolBtn icon={<TableOutlined />} label="表格" before="\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| " after=" |  |  |\n" placeholder="内容" />
      <ToolBtn icon={<LineOutlined />} label="分割线" before="\n---\n" />

      <div style={{ flex: 1 }} />

      <Space size={2}>
        <Tooltip title={editMode === 'wysiwyg' ? '源码模式' : '富文本模式'}>
          <Button
            type={editMode === 'markdown' ? 'primary' : 'text'}
            size="small"
            icon={editMode === 'wysiwyg' ? <FileTextOutlined /> : <EditOutlined />}
            onClick={onToggleEditMode}
          />
        </Tooltip>
        <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 2px' }} />
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button type="text" size="small" icon={<UndoOutlined />} disabled={disabled} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button type="text" size="small" icon={<RedoOutlined />} disabled={disabled} />
        </Tooltip>
      </Space>
    </div>
  );
};

export default EditorToolbar;

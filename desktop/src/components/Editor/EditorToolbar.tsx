import React, { useCallback } from 'react';
import { Button, Tooltip, Upload, Dropdown, Space, Popover } from 'antd';
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
  HistoryOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { HistoryEntry } from '../../hooks/useHistory';

interface EditorToolbarProps {
  onInsertMarkdown: (before: string, after?: string, placeholder?: string, block?: boolean, description?: string) => void;
  onImageUpload: (file: File) => void;
  editorReady: boolean;
  editMode?: 'wysiwyg' | 'markdown';
  onToggleEditMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  history?: HistoryEntry[];
  currentIndex?: number;
  onJumpTo?: (index: number) => void;
  onVersionHistory?: () => void;
}

const headingItems: MenuProps['items'] = [
  { key: '1', label: 'H1 一级标题' },
  { key: '2', label: 'H2 二级标题' },
  { key: '3', label: 'H3 三级标题' },
  { key: '4', label: 'H4 四级标题' },
  { key: '5', label: 'H5 五级标题' },
  { key: '6', label: 'H6 六级标题' },
];

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5000) return '刚刚';
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return `${Math.floor(diff / 3600000)}小时前`;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertMarkdown,
  onImageUpload,
  editorReady,
  editMode = 'wysiwyg',
  onToggleEditMode,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  history = [],
  currentIndex = 0,
  onJumpTo,
  onVersionHistory,
}) => {
  const disabled = !editorReady;

  const handleHeading = useCallback(({ key }: { key: string }) => {
    const level = parseInt(key);
    const prefix = '#'.repeat(level) + ' ';
    onInsertMarkdown(prefix, '', '标题', true, `插入 H${level} 标题`);
  }, [onInsertMarkdown]);

  const ToolBtn = ({
    icon,
    label,
    before,
    after,
    placeholder,
    block,
    description,
  }: {
    icon: React.ReactNode;
    label: string;
    before: string;
    after?: string;
    placeholder?: string;
    block?: boolean;
    description?: string;
  }) => (
    <Tooltip title={label}>
      <Button
        type="text"
        size="small"
        icon={icon}
        disabled={disabled}
        onClick={() => onInsertMarkdown(before, after, placeholder, block, description)}
      />
    </Tooltip>
  );

  const historyContent = (
    <div style={{ maxHeight: 320, overflowY: 'auto', minWidth: 200 }}>
      {[...history].reverse().map((entry, i) => {
        const idx = history.length - 1 - i;
        return (
          <div
            key={idx}
            onClick={() => onJumpTo?.(idx)}
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: 4,
              background: idx === currentIndex ? '#e6f4ff' : 'transparent',
              fontWeight: idx === currentIndex ? 600 : 400,
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.description}
            </span>
            <span style={{ color: '#999', whiteSpace: 'nowrap', fontSize: 11 }}>
              {formatTimeAgo(entry.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
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

      <ToolBtn icon={<BoldOutlined />} label="加粗 (Ctrl+B)" before="**" after="**" placeholder="粗体文本" description="加粗" />
      <ToolBtn icon={<ItalicOutlined />} label="斜体 (Ctrl+I)" before="*" after="*" placeholder="斜体文本" description="斜体" />
      <ToolBtn icon={<StrikethroughOutlined />} label="删除线" before="~~" after="~~" placeholder="删除线文本" description="删除线" />
      <ToolBtn icon={<CodeOutlined />} label="行内代码" before="`" after="`" placeholder="code" description="行内代码" />

      <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 4px' }} />

      <ToolBtn icon={<UnorderedListOutlined />} label="无序列表" before="- " block description="无序列表" />
      <ToolBtn icon={<OrderedListOutlined />} label="有序列表" before="1. " block description="有序列表" />
      <ToolBtn icon={<BlockOutlined />} label="引用" before="> " block description="引用" />

      <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 4px' }} />

      <ToolBtn
        icon={<CodeOutlined />}
        label="代码块"
        before="```\n"
        after="\n```"
        placeholder="code here"
        block
        description="代码块"
      />
      <ToolBtn icon={<LinkOutlined />} label="链接 (Ctrl+K)" before="[" after="](url)" placeholder="链接文本" description="链接" />
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => { onImageUpload(file); return false; }}
      >
        <Tooltip title="插入图片">
          <Button type="text" size="small" icon={<PictureOutlined />} disabled={disabled} />
        </Tooltip>
      </Upload>
      <ToolBtn icon={<TableOutlined />} label="表格" before={
`
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| `
} after={` |  |  |
`} placeholder="内容" block description="表格" />
      <ToolBtn icon={<LineOutlined />} label="分割线" before="\n---\n" block description="分割线" />

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
          <Button type="text" size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={onUndo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button type="text" size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={onRedo} />
        </Tooltip>
        <Popover content={historyContent} title="操作历史" trigger="click" placement="bottomRight">
          <Tooltip title="操作历史">
            <Button type="text" size="small" icon={<HistoryOutlined />} disabled={history.length <= 1} />
          </Tooltip>
        </Popover>
        {onVersionHistory && (
          <Tooltip title="版本历史">
            <Button type="text" size="small" icon={<ClockCircleOutlined />} onClick={onVersionHistory} />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default EditorToolbar;

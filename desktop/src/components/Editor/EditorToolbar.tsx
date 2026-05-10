import React, { useCallback, useState } from 'react';
import { Button, Tooltip, Dropdown, Space, Popover, InputNumber } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  FolderOpenOutlined,
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
  onImageUpload: (file: File, role?: 'content' | 'gallery') => void;
  onInsertFromLibrary?: (role?: 'content' | 'cover' | 'gallery') => void;
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

function generateTableMarkdown(rows: number, cols: number): {
  before: string; after: string; placeholder: string; block: boolean; description: string;
} {
  const headerLine = '| ' + Array.from({ length: cols }, (_, i) => `列${i + 1}`).join(' | ') + ' |';
  const sepLine = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |';

  if (rows <= 1) {
    const headers = Array.from({ length: cols }, (_, i) => `列${i + 1}`);
    return {
      before: '| ',
      after: ' | ' + headers.slice(1).join(' | ') + ' |\n' + sepLine,
      placeholder: headers[0],
      block: true,
      description: `插入 1x${cols} 表格`,
    };
  }

  const dataRows = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => '内容')
  );
  const afterParts: string[] = [];
  if (dataRows[0].length > 1) {
    afterParts.push(' | ' + dataRows[0].slice(1).join(' | ') + ' |');
  } else {
    afterParts.push(' |');
  }
  for (let i = 1; i < dataRows.length; i++) {
    afterParts.push('| ' + dataRows[i].join(' | ') + ' |');
  }

  return {
    before: headerLine + '\n' + sepLine + '\n| ',
    after: afterParts.join('\n'),
    placeholder: '内容',
    block: true,
    description: `插入 ${rows}x${cols} 表格`,
  };
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertMarkdown,
  onImageUpload,
  onInsertFromLibrary,
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

  const [tablePopoverOpen, setTablePopoverOpen] = useState(false);
  const [hoveredSize, setHoveredSize] = useState({ rows: 0, cols: 0 });
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);

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

  const handleTableSelect = useCallback((rows: number, cols: number) => {
    const table = generateTableMarkdown(rows, cols);
    onInsertMarkdown(table.before, table.after, table.placeholder, table.block, table.description);
    setTablePopoverOpen(false);
  }, [onInsertMarkdown]);

  const tablePickerContent = (
    <div style={{ padding: 4 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 20px)',
        gap: 2,
        marginBottom: 4,
      }}>
        {Array.from({ length: 48 }).map((_, i) => {
          const row = Math.floor(i / 8) + 1;
          const col = (i % 8) + 1;
          const active = row <= hoveredSize.rows && col <= hoveredSize.cols;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredSize({ rows: row, cols: col })}
              onClick={() => handleTableSelect(row, col)}
              style={{
                width: 20,
                height: 20,
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                background: active ? '#e6f4ff' : '#fff',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
            />
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 8 }}>
        {hoveredSize.rows > 0 ? `${hoveredSize.rows} x ${hoveredSize.cols} 表格` : '选择表格大小'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#999', marginBottom: 6 }}>
        <b>Ctrl+Tab</b> 跳到下一个单元格<br/><b>Ctrl+Shift+Tab</b> 跳到上一个
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>行</span>
        <InputNumber min={1} max={20} size="small" value={customRows} onChange={v => setCustomRows(v || 1)} style={{ width: 60 }} />
        <span style={{ fontSize: 12, color: '#666' }}>列</span>
        <InputNumber min={1} max={20} size="small" value={customCols} onChange={v => setCustomCols(v || 1)} style={{ width: 60 }} />
        <Button size="small" type="primary" onClick={() => handleTableSelect(customRows, customCols)}>插入</Button>
      </div>
    </div>
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

      <Dropdown trigger={['click']} menu={{
        items: [
          { key: '', label: '纯文本' },
          { type: 'divider' },
          { key: 'javascript', label: 'JavaScript' },
          { key: 'typescript', label: 'TypeScript' },
          { key: 'python', label: 'Python' },
          { key: 'java', label: 'Java' },
          { key: 'php', label: 'PHP' },
          { key: 'go', label: 'Go' },
          { key: 'rust', label: 'Rust' },
          { key: 'c', label: 'C' },
          { key: 'cpp', label: 'C++' },
          { key: 'sql', label: 'SQL' },
          { key: 'bash', label: 'Bash / Shell' },
          { key: 'html', label: 'HTML' },
          { key: 'css', label: 'CSS' },
          { key: 'json', label: 'JSON' },
          { key: 'yaml', label: 'YAML' },
          { key: 'xml', label: 'XML' },
          { key: 'markdown', label: 'Markdown' },
        ],
        onClick: ({ key }) => {
          const lang = key ? key : '';
          onInsertMarkdown(
            '```' + lang + String.fromCharCode(10),
            String.fromCharCode(10) + '```',
            'code here',
            true,
            key ? `代码块 (${key})` : '代码块'
          );
        },
      }}>
        <Tooltip title="代码块">
          <Button type="text" size="small" icon={<CodeOutlined />} disabled={disabled} />
        </Tooltip>
      </Dropdown>
      <ToolBtn icon={<LinkOutlined />} label="链接 (Ctrl+K)" before="[" after="](url)" placeholder="链接文本" description="链接" />
      <Dropdown trigger={['click']} menu={{
        items: [
          { key: 'content', label: '插入图片', icon: <PictureOutlined /> },
          { key: 'gallery', label: '插入轮播图', icon: <PictureOutlined /> },
          { type: 'divider' },
          { key: 'library', label: '从素材库选择', icon: <FolderOpenOutlined /> },
        ],
        onClick: ({ key }) => {
          if (key === 'library') {
            onInsertFromLibrary?.();
            return;
          }
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onImageUpload(file, key as 'content' | 'gallery');
          };
          input.click();
        },
      }}>
        <Tooltip title="插入图片">
          <Button type="text" size="small" icon={<PictureOutlined />} disabled={disabled} />
        </Tooltip>
      </Dropdown>
      <Popover
        content={tablePickerContent}
        trigger="click"
        placement="bottom"
        open={tablePopoverOpen}
        onOpenChange={(open) => {
          setTablePopoverOpen(open);
          if (open) {
            setHoveredSize({ rows: 0, cols: 0 });
            setCustomRows(3);
            setCustomCols(3);
          }
        }}
      >
        <Tooltip title="表格">
          <Button type="text" size="small" icon={<TableOutlined />} disabled={disabled} />
        </Tooltip>
      </Popover>
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

---
name: "milkdown-react-guide"
description: "Milkdown React WYSIWYG Markdown editor integration guide. Invoke when user needs to implement Milkdown editor in React, use Crepe, or handle markdown editing with React hooks."
---

# Milkdown React 开发指南

Milkdown 是一个插件驱动的 WYSIWYG Markdown 编辑器框架，提供一流的 React 支持。

## When to Invoke

- 用户需要在 React 项目中集成 Markdown 编辑器
- 用户询问 Milkdown 或 Crepe 的使用方法
- 用户需要实现表单集成或自动保存功能
- 用户需要访问编辑器实例获取 Markdown 内容
- 用户需要配置 Crepe 功能或插件

## 1. 项目概述

### 核心特性

| 特性 | 描述 |
|------|------|
| 🔩 插件驱动 | 所有功能都是插件，可扩展语法、主题、UI 等 |
| 🤝 协作编辑 | 支持 Y.js 实时协作编辑 |
| 🤯 无头设计 | 不含任何 CSS，完全可定制样式 |
| 💡 可靠基础 | 基于 ProseMirror、Y.js、Remark 构建 |

### 两种集成方式

| 方式 | 特点 | 适用场景 |
|------|------|----------|
| **Crepe** | 功能丰富，开箱即用 | 快速集成、标准 Markdown 编辑 |
| **Milkdown Core** | 完全自定义配置 | 高度定制、特殊需求 |

## 2. 安装方法

### 使用 Crepe（推荐快速开始）

```bash
npm install @milkdown/crepe @milkdown/react @milkdown/kit
```

### 使用 Milkdown Core

```bash
npm install @milkdown/react @milkdown/kit
```

### 可选主题

```bash
npm install @milkdown/theme-nord
```

## 3. 快速开始

### 使用 Crepe 编辑器

```tsx
import { Crepe } from '@milkdown/crepe'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'

/**
 * Crepe 编辑器组件
 * 功能丰富的 WYSIWYG Markdown 编辑器
 */
const CrepeEditor: React.FC = () => {
    const { get } = useEditor((root) => {
        return new Crepe({ root })
    })
    return <Milkdown />
}

/**
 * 编辑器包装组件
 * 必须使用 MilkdownProvider 包裹
 */
export const MilkdownEditorWrapper: React.FC = () => {
    return (
        <MilkdownProvider>
            <CrepeEditor />
        </MilkdownProvider>
    )
}
```

### 使用 Milkdown Core

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { nord } from '@milkdown/theme-nord'

/**
 * Milkdown 核心编辑器组件
 * 完全自定义配置
 */
const MilkdownEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config(nord)
            .config((ctx) => {
                ctx.set(rootCtx, root)
            })
            .use(commonmark)
    )
    return <Milkdown />
}

export const MilkdownEditorWrapper: React.FC = () => {
    return (
        <MilkdownProvider>
            <MilkdownEditor />
        </MilkdownProvider>
    )
}
```

## 4. Crepe 配置详解

### Crepe 配置接口

```typescript
interface CrepeConfig {
    features?: Partial<Record<CrepeFeature, boolean>>  // 启用/禁用功能
    featureConfigs?: CrepeFeatureConfig                 // 功能配置
    root?: Node | string | null                         // 根元素
    defaultValue?: DefaultValue                         // 初始内容
}
```

### Crepe 功能列表

| 功能 | 枚举值 | 描述 |
|------|--------|------|
| 光标 | `Crepe.Feature.Cursor` | 自定义光标样式 |
| 列表项 | `Crepe.Feature.ListItem` | 列表项编辑 |
| 链接提示 | `Crepe.Feature.LinkTooltip` | 链接编辑提示 |
| 图片块 | `Crepe.Feature.ImageBlock` | 图片块编辑 |
| 块编辑 | `Crepe.Feature.BlockEdit` | 块级元素编辑 |
| 占位符 | `Crepe.Feature.Placeholder` | 空内容占位符 |
| 工具栏 | `Crepe.Feature.Toolbar` | 格式化工具栏 |
| CodeMirror | `Crepe.Feature.CodeMirror` | 代码块高亮 |
| 表格 | `Crepe.Feature.Table` | 表格支持 |
| LaTeX | `Crepe.Feature.Latex` | 数学公式支持 |

### Crepe 完整配置示例

```tsx
import { Crepe } from '@milkdown/crepe'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'

/**
 * 完整配置的 Crepe 编辑器
 */
const ConfiguredCrepeEditor: React.FC = () => {
    const { get } = useEditor((root) => {
        return new Crepe({
            root,
            // 设置初始内容
            defaultValue: '# Hello World\n\nStart writing...',
            // 功能开关
            features: {
                [Crepe.Feature.Toolbar]: true,
                [Crepe.Feature.Latex]: true,
                [Crepe.Feature.CodeMirror]: true,
                [Crepe.Feature.Table]: true,
                // 禁用不需要的功能
                [Crepe.Feature.ImageBlock]: false,
            },
            // 功能配置
            featureConfigs: {
                [Crepe.Feature.Placeholder]: {
                    text: '开始编写...',
                    mode: 'block',
                },
                [Crepe.Feature.LinkTooltip]: {
                    inputPlaceholder: '输入链接地址...',
                },
            },
        })
    })
    return <Milkdown />
}

export const CrepeEditorWrapper: React.FC = () => {
    return (
        <MilkdownProvider>
            <ConfiguredCrepeEditor />
        </MilkdownProvider>
    )
}
```

### Crepe API 方法

```tsx
/**
 * Crepe 实例方法示例
 */
const crepe = new Crepe({ root: '#editor' })

// 创建编辑器
await crepe.create()

// 获取 Markdown 内容
const markdown = crepe.getMarkdown()

// 设置只读模式
crepe.setReadonly(true)

// 销毁编辑器
crepe.destroy()

// 事件监听
crepe.on((listener) => {
    // 内容更新
    listener.markdownUpdated((ctx, markdown) => {
        console.log('Content updated:', markdown)
    })
    
    // 获得焦点
    listener.focus((ctx) => {
        console.log('Editor focused')
    })
    
    // 失去焦点
    listener.blur((ctx) => {
        console.log('Editor blurred')
    })
    
    // 选区变化
    listener.selectionUpdated((ctx, selection, prevSelection) => {
        console.log('Selection updated:', selection)
    })
})
```

## 5. 插件系统

### 插件架构

Milkdown 采用插件驱动架构，所有功能都通过 `.use()` 方法添加插件。

```typescript
Editor.make()
    .use(pluginA)      // 添加单个插件
    .use(pluginB)
    .use([pluginC, pluginD])  // 批量添加
```

### 官方插件列表

#### Preset 预设插件

| 插件 | 包名 | 描述 |
|------|------|------|
| CommonMark | `@milkdown/kit/preset/commonmark` | CommonMark 语法支持 |
| GFM | `@milkdown/kit/preset/gfm` | GitHub Flavored Markdown |

#### 功能插件

| 插件 | 包名 | 描述 |
|------|------|------|
| Listener | `@milkdown/kit/plugin/listener` | 事件监听器 |
| History | `@milkdown/kit/plugin/history` | 撤销/重做支持 |
| Clipboard | `@milkdown/kit/plugin/clipboard` | 剪贴板操作 |

### 插件使用示例

#### CommonMark + GFM 预设

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'

/**
 * 支持 GFM 的编辑器
 */
const GFMEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root)
            })
            .use(commonmark)  // 必须先添加 commonmark
            .use(gfm)         // 再添加 gfm
    )
    return <Milkdown />
}
```

#### History 插件（撤销/重做）

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { history } from '@milkdown/kit/plugin/history'
import { Milkdown, useEditor } from '@milkdown/react'

/**
 * 带撤销/重做功能的编辑器
 */
const EditorWithHistory: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config((ctx) => ctx.set(rootCtx, root))
            .use(commonmark)
            .use(history)  // 添加历史记录支持
    )
    return <Milkdown />
}
```

#### Clipboard 插件

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { Milkdown, useEditor } from '@milkdown/react'

/**
 * 带剪贴板支持的编辑器
 */
const EditorWithClipboard: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config((ctx) => ctx.set(rootCtx, root))
            .use(commonmark)
            .use(clipboard)  // 添加剪贴板支持
    )
    return <Milkdown />
}
```

#### Listener 插件（事件监听）

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { Milkdown, useEditor } from '@milkdown/react'

/**
 * 带事件监听的编辑器
 */
const EditorWithListener: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root)
                
                // 配置监听器
                ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
                    if (markdown !== prevMarkdown) {
                        console.log('Content changed:', markdown)
                        // 自动保存或同步
                    }
                })
            })
            .use(commonmark)
            .use(listener)  // 添加监听器插件
    )
    return <Milkdown />
}
```

### 完整插件组合示例

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { nord } from '@milkdown/theme-nord'

/**
 * 功能完整的编辑器
 * 包含：GFM语法、历史记录、剪贴板、事件监听
 */
const FullFeaturedEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config(nord)
            .config((ctx) => {
                ctx.set(rootCtx, root)
                
                // 配置自动保存
                ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
                    autoSave(markdown)
                })
            })
            .use(commonmark)   // 基础 Markdown
            .use(gfm)          // GitHub Flavored Markdown
            .use(history)      // 撤销/重做
            .use(clipboard)    // 剪贴板
            .use(listener)     // 事件监听
    )
    return <Milkdown />
}

/**
 * 自动保存函数
 */
async function autoSave(markdown: string): Promise<void> {
    try {
        await fetch('/api/auto-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: markdown }),
        })
    } catch (error) {
        console.error('Auto-save failed:', error)
    }
}

export const EditorWrapper: React.FC = () => (
    <MilkdownProvider>
        <FullFeaturedEditor />
    </MilkdownProvider>
)
```

## 6. API 参考

### React Hooks

#### useEditor

用于创建编辑器实例的 Hook。

```tsx
const { get } = useEditor((root) => {
    // 返回 Editor 或 Crepe 实例
    return Editor.make()
        .config((ctx) => ctx.set(rootCtx, root))
        .use(commonmark)
})
```

#### useInstance

用于访问编辑器实例的 Hook，**必须在 MilkdownProvider 内部使用**。

```tsx
const [isLoading, getInstance] = useInstance()
```

| 返回值 | 类型 | 描述 |
|--------|------|------|
| `isLoading` | boolean | 编辑器是否正在加载 |
| `getInstance` | () => Editor \| undefined | 获取编辑器实例的函数 |

### 核心组件

| 组件 | 描述 |
|------|------|
| `MilkdownProvider` | Context Provider，必须包裹编辑器组件 |
| `Milkdown` | 编辑器渲染组件 |

### 常用工具函数

```tsx
import { getMarkdown } from '@milkdown/utils'

// 获取 Markdown 内容
const content = editor.action(getMarkdown())
```

## 7. 高级用法

### 访问编辑器实例

```tsx
import { useInstance } from '@milkdown/react'
import { getMarkdown } from '@milkdown/utils'

/**
 * 编辑器控制组件
 * 必须在 MilkdownProvider 内部使用 useInstance
 */
const EditorControls: React.FC = () => {
    const [isLoading, getInstance] = useInstance()

    /**
     * 保存按钮处理函数
     */
    const handleSave = () => {
        if (isLoading) return
        
        const editor = getInstance()
        if (!editor) return
        
        const content = editor.action(getMarkdown())
        console.log('Saved content:', content)
    }

    return (
        <button onClick={handleSave} disabled={isLoading}>
            Save
        </button>
    )
}

/**
 * 完整编辑器组件（包含控制按钮）
 */
const EditorWithControls: React.FC = () => {
    return (
        <MilkdownProvider>
            <MilkdownEditorWrapper />
            <EditorControls />
        </MilkdownProvider>
    )
}
```

### 表单集成

```tsx
import { useInstance } from '@milkdown/react'
import { getMarkdown } from '@milkdown/utils'

/**
 * 表单集成示例
 * 将编辑器集成到表单提交中
 */
const FormWithEditor: React.FC = () => {
    const [isLoading, getInstance] = useInstance()

    /**
     * 表单提交处理函数
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (isLoading) return
        
        const editor = getInstance()
        if (!editor) return
        
        const content = editor.action(getMarkdown())
        submitForm({ content })
    }

    return (
        <form onSubmit={handleSubmit}>
            <MilkdownEditorWrapper />
            <button type="submit" disabled={isLoading}>
                Submit
            </button>
        </form>
    )
}
```

### 自动保存（使用 Listener 插件）

```tsx
import { Editor, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { Milkdown, useEditor } from '@milkdown/react'

/**
 * 自动保存编辑器组件
 * 内容变化时自动保存到后端
 */
const AutoSaveEditor: React.FC = () => {
    const { get } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root)
                
                ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
                    saveToBackend(markdown)
                })
            })
            .use(commonmark)
            .use(listener)
    )
    return <Milkdown />
}

/**
 * 保存到后端
 */
async function saveToBackend(markdown: string): Promise<void> {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: markdown }),
        })
    } catch (error) {
        console.error('Auto-save failed:', error)
    }
}
```

## 8. 最佳实践

### 组件结构

1. **分离关注点**: 将编辑器组件与业务逻辑分离
2. **Provider 层级**: 在必要的最高层级使用 `MilkdownProvider`
3. **类型安全**: 使用 TypeScript 获得更好的类型提示

### 性能优化

1. **记忆化配置**: 复杂配置使用 useMemo
2. **避免重渲染**: 必要时使用 React.memo
3. **懒加载**: 大型编辑器考虑懒加载

```tsx
import { useMemo } from 'react'

const OptimizedEditor: React.FC = () => {
    const editorConfig = useMemo(() => (root: HTMLElement) => 
        Editor.make()
            .config((ctx) => ctx.set(rootCtx, root))
            .use(commonmark),
        []
    )

    const { get } = useEditor(editorConfig)
    return <Milkdown />
}
```

### 错误处理

```tsx
import { useInstance } from '@milkdown/react'
import { getMarkdown } from '@milkdown/utils'

/**
 * 带错误处理的编辑器控制
 */
const SafeEditorControls: React.FC = () => {
    const [isLoading, getInstance] = useInstance()

    const handleSave = async () => {
        if (isLoading) {
            console.warn('Editor is still loading')
            return
        }
        
        try {
            const editor = getInstance()
            if (!editor) {
                throw new Error('Editor instance not available')
            }
            
            const content = editor.action(getMarkdown())
            if (!content) {
                throw new Error('Failed to get markdown content')
            }
            
            await saveContent(content)
        } catch (error) {
            console.error('Save failed:', error)
            // 显示错误提示
        }
    }

    return (
        <button onClick={handleSave} disabled={isLoading}>
            Save
        </button>
    )
}
```

## 9. 常见问题

### useInstance 返回 undefined

**问题**: `getInstance()` 返回 `undefined`

**解决方案**: 确保 `useInstance` 在 `MilkdownProvider` 内部使用

```tsx
// ❌ 错误用法
const ParentComponent = () => {
    const [isLoading, getInstance] = useInstance() // 返回 [true, () => undefined]
    return <MilkdownEditorWrapper />
}

// ✅ 正确用法
const EditorControls = () => {
    const [isLoading, getInstance] = useInstance() // 正常工作
    return <button>Save</button>
}

const App = () => (
    <MilkdownProvider>
        <MilkdownEditorWrapper />
        <EditorControls />
    </MilkdownProvider>
)
```

### 样式不生效

**解决方案**: Milkdown 是无头设计，需要导入主题或自定义样式

```tsx
import '@milkdown/theme-nord/style.css'
```

### GFM 不生效

**解决方案**: GFM 需要配合 commonmark 使用

```tsx
// ❌ 错误：单独使用 gfm
Editor.make().use(gfm)

// ✅ 正确：先 commonmark 后 gfm
Editor.make().use(commonmark).use(gfm)
```

## 10. 参考链接

| 资源 | 链接 |
|------|------|
| 官方文档 | https://milkdown.dev/docs/getting-started |
| React 集成 | https://milkdown.dev/docs/recipes/react |
| Crepe 文档 | https://milkdown.dev/docs/api/crepe |
| 插件列表 | https://milkdown.dev/docs/guide/plugins |
| 示例仓库 | https://github.com/Milkdown/examples |
| Crepe Demo | https://stackblitz.com/github/Milkdown/examples/tree/main/react-crepe |
| Commonmark Demo | https://stackblitz.com/github/Milkdown/examples/tree/main/react-commonmark |

## 11. 许可证

MIT License

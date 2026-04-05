# SmileX-CAS 技术实现方案

## 1. 项目概述

SmileX-CAS 是一个桌面端内容管理与多平台发布系统。前端使用 Electron + React，后端使用 Python + FastAPI + SQLite。支持图文/视频创作、Markdown 编辑、多平台自动发布。

## 2. 目录结构

```
SmileX-CAS/
├── desktop/                          # Electron + React 前端
│   ├── electron/                     # Electron 主进程
│   │   ├── main.ts                   # 主进程入口
│   │   ├── preload.ts                # 预加载脚本
│   │   ├── ipc/                      # IPC 通信处理
│   │   │   ├── article.ts
│   │   │   └── platform.ts
│   │   └── tray.ts                   # 系统托盘
│   ├── src/                          # React 渲染进程
│   │   ├── main.tsx                  # React 入口
│   │   ├── App.tsx                   # 路由配置
│   │   ├── components/
│   │   │   ├── Layout/               # 布局组件
│   │   │   ├── Editor/               # Markdown 编辑器 (Milkdown)
│   │   │   │   ├── MilkdownEditor.tsx
│   │   │   │   ├── ImageUploadPlugin.ts
│   │   │   │   └── EditorToolbar.tsx
│   │   │   ├── Preview/              # 文章预览
│   │   │   │   └── MarkdownPreview.tsx
│   │   │   ├── Publish/              # 发布管理
│   │   │   │   ├── PublishPanel.tsx
│   │   │   │   ├── PlatformSelector.tsx
│   │   │   │   └── PublishLog.tsx
│   │   │   ├── Media/                # 媒体管理
│   │   │   │   ├── MediaUploader.tsx
│   │   │   │   └── MediaGallery.tsx
│   │   │   └── Common/               # 通用组件
│   │   │       ├── SnowIDDisplay.tsx
│   │   │       └── FileDropzone.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ArticleEditor.tsx     # 文章编辑页（核心页面）
│   │   │   ├── ArticleList.tsx
│   │   │   ├── VideoEditor.tsx       # 视频发布页
│   │   │   ├── MediaLibrary.tsx
│   │   │   ├── PlatformManager.tsx   # 平台连接管理
│   │   │   ├── PublishHistory.tsx    # 发布日志
│   │   │   ├── Settings.tsx
│   │   │   ├── Login.tsx
│   │   │   └── NotFound.tsx
│   │   ├── store/                    # Redux Toolkit
│   │   │   ├── index.ts
│   │   │   ├── articleSlice.ts
│   │   │   ├── mediaSlice.ts
│   │   │   ├── publishSlice.ts
│   │   │   ├── platformSlice.ts
│   │   │   └── authSlice.ts
│   │   ├── services/
│   │   │   └── api.ts                # Axios API 服务
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── global.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── electron-builder.yml          # Electron 打包配置
│
├── server/                           # Python + FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI 入口
│   │   ├── config.py                 # 配置管理
│   │   ├── database.py               # 数据库连接
│   │   ├── auth.py                   # JWT 认证
│   │   ├── dependencies.py           # 公共依赖
│   │   ├── snowid.py                 # SnowID 生成器
│   │   ├── models/                   # SQLAlchemy 模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── article.py
│   │   │   ├── group.py              # 文章分组/分类
│   │   │   ├── media.py
│   │   │   ├── platform.py           # 平台账号
│   │   │   ├── publish_task.py
│   │   │   └── publish_log.py        # 发布日志
│   │   ├── schemas/                  # Pydantic 模式
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── article.py
│   │   │   ├── group.py
│   │   │   ├── media.py
│   │   │   ├── platform.py
│   │   │   └── publish.py
│   │   ├── routes/                   # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── articles.py
│   │   │   ├── groups.py
│   │   │   ├── media.py
│   │   │   ├── platforms.py
│   │   │   ├── publish.py
│   │   │   └── video.py
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── article_service.py    # 文章文件管理
│   │   │   ├── media_service.py      # 媒体文件管理
│   │   │   └── publish_service.py    # 发布调度
│   │   └── plugins/                  # 平台发布插件体系
│   │       ├── __init__.py
│   │       ├── base.py               # 插件基类
│   │       ├── registry.py           # 插件注册器
│   │       ├── wechat_mp.py          # 微信公众号 (API)
│   │       ├── wechat_channels.py    # 微信视频号 (Playwright)
│   │       ├── xiaohongshu.py        # 小红书 (Playwright)
│   │       ├── bilibili.py           # Bilibili (API)
│   │       ├── douyin_article.py     # 抖音图文 (Playwright)
│   │       └── douyin_video.py       # 抖音视频 (Playwright)
│   ├── articles/                     # 文章文件存储根目录
│   │   └── {snowid}_{title}/         # 每篇文章一个目录
│   │       ├── index.md              # Markdown 正文
│   │       └── images/               # 文章关联图片
│   ├── videos/                       # 视频文件存储
│   ├── uploads/                      # 临时上传目录
│   ├── alembic/                      # 数据库迁移
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── docker-compose.yml
├── ARCHITECTURE.md                   # 本文档
├── AGENTS.md
└── kilo.json
```

## 3. 数据库设计

### 3.1 users 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | VARCHAR(50) UNIQUE | 用户名 |
| email | VARCHAR(100) UNIQUE | 邮箱 |
| password_hash | VARCHAR(255) | 密码哈希 |
| full_name | VARCHAR(100) | 显示名 |
| avatar | VARCHAR(255) | 头像路径 |
| is_active | BOOLEAN | 是否激活 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3.2 groups 文章分组表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | VARCHAR(100) | 分组名 |
| parent_id | INTEGER FK(groups.id) | 父分组ID（支持嵌套） |
| user_id | INTEGER FK(users.id) | 所属用户 |
| sort_order | INTEGER | 排序权重 |
| created_at | DATETIME | 创建时间 |

### 3.3 articles 文章表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| snow_id | VARCHAR(20) UNIQUE | SnowID，用于文件命名 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | Markdown 正文 |
| summary | TEXT | 摘要 |
| article_type | VARCHAR(20) | article / video |
| status | VARCHAR(20) | draft / published / archived |
| file_path | VARCHAR(500) | 本地文件相对路径 |
| cover_image | VARCHAR(255) | 封面图路径 |
| group_id | INTEGER FK(groups.id) | 所属分组 |
| author_id | INTEGER FK(users.id) | 作者 |
| tags | JSON | 标签列表 |
| metadata | JSON | 扩展元数据（视频信息等） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3.4 media 媒体资源表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| snow_id | VARCHAR(20) UNIQUE | SnowID |
| filename | VARCHAR(255) | 原始文件名 |
| file_path | VARCHAR(500) | 存储路径 |
| file_type | VARCHAR(50) | MIME 类型 |
| file_size | INTEGER | 字节大小 |
| media_type | VARCHAR(20) | image / video / audio / other |
| article_id | INTEGER FK(articles.id) | 关联文章（可空） |
| user_id | INTEGER FK(users.id) | 上传者 |
| created_at | DATETIME | 创建时间 |

### 3.5 platform_accounts 平台账号表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| platform_name | VARCHAR(50) | 平台标识（wechat_mp / wechat_channels / xiaohongshu / bilibili / douyin） |
| account_name | VARCHAR(100) | 账号显示名 |
| access_token | VARCHAR(500) | 访问令牌（加密存储） |
| refresh_token | VARCHAR(500) | 刷新令牌（加密存储） |
| token_expires_at | DATETIME | 令牌过期时间 |
| cookies | TEXT | 浏览器 Cookie（Playwright 模式使用） |
| config | JSON | 平台特定配置 |
| status | VARCHAR(20) | active / expired / disabled |
| user_id | INTEGER FK(users.id) | 所属用户 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3.6 publish_tasks 发布任务表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| article_id | INTEGER FK(articles.id) | 关联文章 |
| platform_account_id | INTEGER FK(platform_accounts.id) | 目标平台账号 |
| user_id | INTEGER FK(users.id) | 发起者 |
| status | VARCHAR(20) | pending / running / success / failed / cancelled |
| publish_method | VARCHAR(20) | api / playwright |
| platform_post_id | VARCHAR(100) | 平台返回的内容ID |
| platform_post_url | VARCHAR(500) | 发布后的 URL |
| error_message | TEXT | 错误信息 |
| retry_count | INTEGER | 重试次数 |
| started_at | DATETIME | 开始执行时间 |
| completed_at | DATETIME | 完成时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3.7 publish_logs 发布日志表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| task_id | INTEGER FK(publish_tasks.id) | 关联任务 |
| level | VARCHAR(10) | info / warn / error |
| message | TEXT | 日志内容 |
| details | JSON | 结构化详情（截图路径、HTML快照等） |
| created_at | DATETIME | 创建时间 |

## 4. API 设计

### 4.1 认证 API
```
POST   /api/auth/login           # 登录
POST   /api/auth/register        # 注册
POST   /api/auth/refresh         # 刷新令牌
GET    /api/auth/me              # 当前用户信息
```

### 4.2 文章分组 API
```
GET    /api/groups               # 获取分组树
POST   /api/groups               # 创建分组
PUT    /api/groups/{id}          # 更新分组
DELETE /api/groups/{id}          # 删除分组
PATCH  /api/groups/sort          # 调整排序
```

### 4.3 文章 API
```
GET    /api/articles             # 文章列表（?group_id=&status=&search=）
POST   /api/articles             # 创建文章（生成 SnowID + 文件目录）
GET    /api/articles/{id}        # 文章详情
PUT    /api/articles/{id}        # 更新文章（同步写文件）
DELETE /api/articles/{id}        # 删除文章（清理文件目录）
POST   /api/articles/{id}/duplicate  # 复制文章
```

**创建文章请求体：**
```json
{
  "title": "文章标题",
  "content": "# Markdown 内容",
  "summary": "摘要",
  "article_type": "article",
  "group_id": 1,
  "tags": ["标签1", "标签2"],
  "cover_image": "articles/xxx_title/cover.jpg"
}
```

**创建文章响应体：**
```json
{
  "id": 1,
  "snow_id": "1890123456789012345",
  "title": "文章标题",
  "content": "# Markdown 内容",
  "file_path": "articles/1890123456789012345_文章标题",
  "status": "draft",
  "article_type": "article",
  "group_id": 1,
  "author_id": 1,
  "tags": ["标签1", "标签2"],
  "created_at": "2026-04-04T12:00:00Z",
  "updated_at": "2026-04-04T12:00:00Z"
}
```

### 4.4 媒体 API
```
POST   /api/media/upload             # 上传文件（multipart/form-data）
GET    /api/media                    # 媒体列表（?media_type=&article_id=）
GET    /api/media/{id}               # 媒体详情
DELETE /api/media/{id}               # 删除媒体
POST   /api/media/upload-to-article/{article_id}  # 上传到文章目录
```

**上传到文章目录：** 文件保存在 `articles/{snowid}_{title}/` 下，返回相对路径，用于 Markdown 中引用。

### 4.5 视频 API
```
POST   /api/videos/upload            # 上传视频文件
POST   /api/videos                   # 创建视频文章
GET    /api/videos                   # 视频列表
PUT    /api/videos/{id}              # 更新视频信息
DELETE /api/videos/{id}              # 删除视频
```

### 4.6 平台账号 API
```
GET    /api/platforms                # 已绑定平台列表
POST   /api/platforms/bind           # 绑定平台账号
PUT    /api/platforms/{id}           # 更新配置
DELETE /api/platforms/{id}           # 解绑
POST   /api/platforms/{id}/test      # 测试连接
POST   /api/platforms/{id}/auth/url  # 获取 OAuth 授权 URL（API 模式）
POST   /api/platforms/{id}/auth/callback  # OAuth 回调
POST   /api/platforms/{id}/cookies   # 保存 Cookie（Playwright 模式）
```

### 4.7 发布 API
```
POST   /api/publish                  # 创建发布任务（支持批量多平台）
GET    /api/publish/tasks            # 任务列表（?status=&platform=）
GET    /api/publish/tasks/{id}       # 任务详情
POST   /api/publish/tasks/{id}/retry # 重试
POST   /api/publish/tasks/{id}/cancel  # 取消
GET    /api/publish/tasks/{id}/logs  # 获取发布日志
```

**创建发布任务请求体（支持多平台批量发布）：**
```json
{
  "article_id": 1,
  "platform_account_ids": [1, 2, 3],
  "publish_options": {
    "1": {"visibility": "public"},
    "2": {"cover_url": "xxx"}
  }
}
```

## 5. 前端组件架构

### 5.1 页面路由
| 路径 | 组件 | 说明 |
|------|------|------|
| /login | LoginPage | 登录 |
| /dashboard | DashboardPage | 概览仪表盘 |
| /articles | ArticleListPage | 文章列表（树形分组 + 列表） |
| /articles/new | ArticleEditorPage | 新建文章 |
| /articles/:id/edit | ArticleEditorPage | 编辑文章 |
| /videos | VideoListPage | 视频列表 |
| /videos/new | VideoEditorPage | 新建视频 |
| /media | MediaLibraryPage | 媒体库 |
| /platforms | PlatformManagerPage | 平台管理 |
| /publish/history | PublishHistoryPage | 发布历史/日志 |
| /settings | SettingsPage | 设置 |

### 5.2 核心组件

**MilkdownEditor：**
- 基于 Milkdown 的 Markdown 编辑器
- 自定义图片上传插件：拖拽/粘贴图片 → 调用后端上传到文章目录 → 插入相对路径
- 自定义工具栏：标题、加粗、斜体、链接、图片、代码块、表格

**MarkdownPreview：**
- 实时预览 Markdown 渲染结果
- 图片路径解析：将相对路径转换为完整 URL

**PublishPanel：**
- 选择目标平台（多选）
- 各平台独立配置（封面、标签、简介等）
- 一键发布 / 定时发布
- 发布进度实时展示

**PublishLog：**
- 发布日志流式展示
- 错误详情、重试按钮
- Playwright 截图预览

## 6. 发布插件体系

### 6.1 插件基类
```python
class BasePublishPlugin(ABC):
    platform_name: str
    display_name: str
    supported_types: list[str]       # ["article", "video"]
    auth_method: str                 # "oauth" | "cookie" | "manual"

    @abstractmethod
    async def publish(self, article, account, options) -> PublishResult

    @abstractmethod
    async def test_connection(self, account) -> bool

    @abstractmethod
    async def get_auth_url(self) -> str
```

### 6.2 平台对接方式
| 平台 | 内容类型 | 对接方式 | 说明 |
|------|----------|----------|------|
| 微信公众号 | 图文 | API (OAuth) | 官方图文消息接口 |
| Bilibili | 图文+视频 | API (OAuth) | Bilibili 开放平台 API |
| 小红书 | 图文 | Playwright | 无公开 API，浏览器自动化 |
| 抖音 | 图文+视频 | Playwright | 无公开图文 API，浏览器自动化 |
| 微信视频号 | 视频 | Playwright | 无开放 API，浏览器自动化 |

### 6.3 插件注册机制
```python
# server/app/plugins/registry.py
class PluginRegistry:
    _plugins: dict[str, BasePublishPlugin] = {}

    @classmethod
    def register(cls, plugin: BasePublishPlugin):
        cls._plugins[plugin.platform_name] = plugin

    @classmethod
    def get(cls, platform_name: str) -> BasePublishPlugin:
        return cls._plugins.get(platform_name)
```

新增平台只需：创建 `plugins/xxx.py` → 继承 `BasePublishPlugin` → 实现方法 → 注册。

## 7. 文件存储策略

### 7.1 文章存储
```
articles/
└── 1890123456789012345_我的文章标题/
    ├── index.md                 # Markdown 正文
    ├── cover.jpg                # 封面图
    └── image_001.png            # 文章内嵌图片
```

### 7.2 视频存储
```
videos/
└── 1890987654321098765_视频标题/
    ├── video.mp4                # 视频文件
    ├── cover.jpg                # 封面
    └── description.md           # 简介Markdown
```

### 7.3 Markdown 图片引用
编辑器中使用相对路径：`![描述](./image_001.png)`  
发布时由插件负责将相对路径的图片上传至目标平台并替换。

## 8. 部署与构建

### 8.1 后端 Docker 化
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.2 Electron 打包
使用 `electron-builder`，配置 `electron-builder.yml`：
- Windows: NSIS 安装包
- macOS: DMG
- Linux: AppImage

### 8.3 开发模式
```bash
# 后端
cd server && uvicorn app.main:app --reload --port 8000

# 前端（Electron 开发模式）
cd desktop && npm run dev
```

## 9. 实施阶段

### Phase 1: 基础架构（1-2 周）
- server/ 目录搭建、数据库模型迁移、SnowID 生成器
- desktop/ Electron 脚手架、路由、布局

### Phase 2: 核心编辑（2-3 周）
- Milkdown 编辑器集成
- 图片上传 + 相对路径引用
- 文章 CRUD + 文件系统同步
- 分组管理

### Phase 3: 视频功能（1 周）
- 视频上传、转码信息提取
- 视频文章管理

### Phase 4: 多平台发布（3-4 周）
- 插件体系搭建
- 微信公众号 API 对接
- Bilibili API 对接
- Playwright 自动化（小红书、抖音、视频号）

### Phase 5: 打磨发布（1-2 周）
- 发布日志与错误回溯
- Electron 打包
- Docker 化
- 测试与优化

# SmileX-CAS

桌面端内容管理与多平台发布系统。支持图文/视频创作、Markdown 编辑、多平台自动发布。

## 功能概览

- **内容创作** — 图文 / 视频创作，Markdown 编辑器 (Milkdown)，文件系统存储
- **多平台发布** — 插件化架构，支持微信公众号、小红书、Bilibili、抖音图文、抖音视频、微信视频号
- **媒体管理** — 图片/视频上传、文章内嵌资源管理
- **平台账号** — OAuth / Cookie 两种认证模式，连接测试
- **发布任务** — 批量多平台发布、任务状态追踪、重试/取消、发布日志
- **文章分组** — 树形分组结构，拖拽排序
- **桌面应用** — Electron 跨平台打包 (Windows / macOS / Linux)

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python 3.11+ / FastAPI / SQLAlchemy / SQLite |
| 前端 | React 18 / TypeScript / Ant Design 5 / Redux Toolkit |
| 桌面 | Electron 33 / Vite 5 |
| 包管理 | uv (后端) / npm (前端) |

## 目录结构

```
SmileX-CAS/
├── server/                           # Python 后端
│   ├── app/
│   │   ├── main.py                   # FastAPI 入口 + 生命周期
│   │   ├── config.py                 # 环境变量配置
│   │   ├── database.py               # SQLAlchemy 引擎 & 会话
│   │   ├── auth.py                   # JWT + bcrypt 认证工具
│   │   ├── dependencies.py           # get_current_user 依赖注入
│   │   ├── snowid.py                 # Snowflake ID 生成器
│   │   ├── models/                   # ORM 模型
│   │   │   ├── user.py               #   用户
│   │   │   ├── article.py            #   文章 (含 snow_id, 文件系统路径)
│   │   │   ├── group.py              #   文章分组 (树形)
│   │   │   ├── media.py              #   媒体资源
│   │   │   ├── platform.py           #   平台账号
│   │   │   ├── publish_task.py       #   发布任务
│   │   │   └── publish_log.py        #   发布日志
│   │   ├── schemas/                  # Pydantic 请求/响应模式
│   │   ├── routes/                   # API 路由
│   │   │   ├── auth.py               #   注册 / 登录 / 当前用户
│   │   │   ├── articles.py           #   文章 CRUD + 复制
│   │   │   ├── groups.py             #   分组 CRUD + 排序
│   │   │   ├── media.py              #   上传 / 列表 / 删除
│   │   │   ├── platforms.py          #   绑定 / 解绑 / 测试连接
│   │   │   └── publish.py            #   发布任务 + 重试/取消/日志
│   │   ├── services/                 # 业务逻辑层
│   │   └── plugins/                  # 平台发布插件
│   │       ├── base.py               #   插件基类 (BasePublishPlugin)
│   │       ├── registry.py           #   插件注册表
│   │       ├── wechat_mp.py          #   微信公众号 (OAuth)
│   │       ├── wechat_channels.py    #   微信视频号 (Playwright)
│   │       ├── xiaohongshu.py        #   小红书 (Playwright)
│   │       ├── bilibili.py           #   Bilibili (OAuth)
│   │       ├── douyin_article.py     #   抖音图文 (Playwright)
│   │       └── douyin_video.py       #   抖音视频 (Playwright)
│   ├── articles/                     # 文章文件存储
│   ├── videos/                       # 视频文件存储
│   ├── uploads/                      # 上传文件存储
│   ├── alembic/                      # 数据库迁移
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env
│
├── desktop/                          # Electron + React 前端
│   ├── electron/
│   │   ├── main.ts                   # Electron 主进程
│   │   └── preload.ts                # 预加载脚本 (context bridge)
│   ├── src/
│   │   ├── main.tsx                  # React 入口
│   │   ├── App.tsx                   # 路由配置 + PrivateRoute
│   │   ├── components/
│   │   │   └── Layout.tsx            # 侧边栏 + 顶栏布局
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # 仪表盘
│   │   │   ├── Login.tsx             # 登录
│   │   │   ├── ArticleList.tsx       # 文章列表
│   │   │   ├── ArticleEditor.tsx     # 文章编辑器
│   │   │   ├── VideoList.tsx         # 视频列表
│   │   │   ├── VideoEditor.tsx       # 视频创建
│   │   │   ├── MediaLibrary.tsx      # 媒体库
│   │   │   ├── PlatformManager.tsx   # 平台管理
│   │   │   ├── PublishHistory.tsx    # 发布历史
│   │   │   ├── Settings.tsx          # 设置
│   │   │   └── NotFound.tsx          # 404
│   │   ├── store/                    # Redux Toolkit 状态管理
│   │   │   ├── authSlice.ts
│   │   │   ├── articleSlice.ts
│   │   │   ├── mediaSlice.ts
│   │   │   ├── platformSlice.ts
│   │   │   └── publishSlice.ts
│   │   ├── services/
│   │   │   └── api.ts                # Axios API 服务层
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript 类型定义
│   │   └── styles/
│   │       └── global.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── electron-builder.yml
│   └── tsconfig.json
│
├── docker-compose.yml
├── ARCHITECTURE.md                   # 技术架构详细文档
└── .vscode/                          # VS Code 调试配置
    ├── launch.json
    └── tasks.json
```

## 快速开始

### 环境要求

- Python >= 3.11
- Node.js >= 18
- [uv](https://docs.astral.sh/uv/) (Python 包管理)
- npm

### 安装依赖

```bash
# 后端
cd server
uv sync

# 前端
cd desktop
npm install
```

### 开发模式

**方式一：命令行启动**

```bash
# 终端 1 — 启动后端 (端口 8000, 支持 --reload 热重载)
cd server
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 终端 2 — 启动前端开发服务器 (端口 5173)
cd desktop
npm run dev

# 终端 3 (可选) — 启动 Electron 桌面窗口
cd desktop
npm run electron:dev
```

**方式二：VS Code 启动 (推荐)**

按 `F5` 从调试面板选择配置：

| 配置 | 说明 |
|---|---|
| `Server: FastAPI` | 启动后端 API 服务 |
| `Desktop: Vite Dev` | 启动前端 + Chrome 调试 |
| `Desktop: Electron Dev` | 启动前端 + Electron 桌面窗口 |
| `Full Stack: Server + Desktop` | 同时启动后端 + Chrome 前端 |
| `Full Stack: Server + Electron` | 同时启动后端 + Electron 桌面端 |

### 环境变量

后端配置通过 `server/.env` 管理：

```env
DATABASE_URL=sqlite:///./cas.db
SECRET_KEY=smilex-cas-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
HOST=127.0.0.1
PORT=8000
DEBUG=true
```

## 部署

### Docker 部署后端

```bash
docker-compose up -d
```

服务将在 `http://localhost:8000` 启动，数据持久化通过 volumes 映射：
- `articles/` — 文章文件
- `videos/` — 视频文件
- `uploads/` — 上传资源
- `cas.db` — SQLite 数据库

### Electron 桌面端打包

```bash
cd desktop
npm run electron:build
```

产出安装包：
- Windows: NSIS 安装包 (`*.exe`)
- macOS: DMG
- Linux: AppImage

## API 概览

后端 API 路径前缀：`/api/`

| 模块 | 端点 | 说明 |
|---|---|---|
| 认证 | `POST /api/auth/register` | 用户注册 |
| | `POST /api/auth/login` | 登录获取 JWT |
| | `GET /api/auth/me` | 当前用户信息 |
| 文章 | `GET/POST /api/articles` | 文章列表 / 创建 |
| | `GET/PUT/DELETE /api/articles/{id}` | 文章详情 / 更新 / 删除 |
| | `POST /api/articles/{id}/duplicate` | 复制文章 |
| 分组 | `GET/POST /api/groups` | 分组列表 / 创建 |
| | `PUT/DELETE /api/groups/{id}` | 分组更新 / 删除 |
| | `PATCH /api/groups/sort` | 批量排序 |
| 媒体 | `POST /api/media/upload` | 上传文件 |
| | `POST /api/media/upload-to-article/{id}` | 上传到文章目录 |
| | `GET /api/media` | 媒体列表 |
| 平台 | `GET /api/platforms/available` | 可用平台列表 |
| | `POST /api/platforms/bind` | 绑定平台账号 |
| | `POST /api/platforms/{id}/test` | 测试连接 |
| 发布 | `POST /api/publish` | 创建发布任务 (支持批量) |
| | `GET /api/publish/tasks` | 任务列表 |
| | `POST /api/publish/tasks/{id}/retry` | 重试 |
| | `POST /api/publish/tasks/{id}/cancel` | 取消 |

所有认证后的端点需携带 `Authorization: Bearer <token>` 请求头。

## 文件存储

文章以文件系统目录方式组织：

```
articles/
└── 1890123456789012345_文章标题/
    ├── index.md          # Markdown 正文
    ├── cover.jpg         # 封面图
    └── image_001.png     # 内嵌图片
```

每篇文章拥有唯一的 Snowflake ID，Markdown 中通过相对路径 `./image_001.png` 引用图片。发布时由插件负责将图片上传至目标平台并替换路径。

## License

Private

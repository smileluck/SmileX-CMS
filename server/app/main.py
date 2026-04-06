import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
from .database import engine, Base, SessionLocal, init_db
from .routes import auth, articles, groups, media, platforms, publish, tags, settings
from .plugins.registry import PluginRegistry
from .plugins.wechat_mp import WeChatMPPlugin
from .plugins.xiaohongshu import XiaohongshuPlugin
from .plugins.bilibili import BilibiliPlugin
from .plugins.douyin import DouyinPlugin, DouyinArticlePlugin, DouyinVideoPlugin
from .plugins.wechat_channels import WeChatChannelsPlugin
from .config import UPLOADS_DIR, BASE_STORAGE_DIR, CORS_ORIGINS
from .dependencies import get_current_user

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    PluginRegistry.register(WeChatMPPlugin())
    PluginRegistry.register(XiaohongshuPlugin())
    PluginRegistry.register(BilibiliPlugin())
    PluginRegistry.register(DouyinPlugin())
    PluginRegistry.register(DouyinArticlePlugin())
    PluginRegistry.register(DouyinVideoPlugin())
    PluginRegistry.register(WeChatChannelsPlugin())
    yield


app = FastAPI(title="SmileX-CAS API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(groups.router)
app.include_router(media.router)
app.include_router(platforms.router)
app.include_router(publish.router)
app.include_router(tags.router)
app.include_router(settings.router)


@app.get("/")
def read_root():
    return {"message": "SmileX-CAS API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/uploads/{file_path:path}")
async def serve_uploaded_file(
    file_path: str,
    current_user=Depends(get_current_user),
):
    full_path = (UPLOADS_DIR / file_path).resolve()
    if not full_path.is_relative_to(UPLOADS_DIR.resolve()):
        raise HTTPException(status_code=403, detail="Access denied")
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)


@app.get("/storage-files/{file_path:path}")
async def serve_storage_file(
    file_path: str,
    current_user=Depends(get_current_user),
):
    full_path = (BASE_STORAGE_DIR / file_path).resolve()
    if not full_path.is_relative_to(BASE_STORAGE_DIR.resolve()):
        raise HTTPException(status_code=403, detail="Access denied")
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)

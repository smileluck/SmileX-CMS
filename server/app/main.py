from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .database import engine, Base, SessionLocal
from .routes import auth, articles, groups, media, platforms, publish
from .plugins.registry import PluginRegistry
from .plugins.wechat_mp import WeChatMPPlugin
from .plugins.xiaohongshu import XiaohongshuPlugin
from .plugins.bilibili import BilibiliPlugin
from .plugins.douyin import DouyinArticlePlugin, DouyinVideoPlugin
from .plugins.wechat_channels import WeChatChannelsPlugin
from .config import UPLOADS_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    PluginRegistry.register(WeChatMPPlugin())
    PluginRegistry.register(XiaohongshuPlugin())
    PluginRegistry.register(BilibiliPlugin())
    PluginRegistry.register(DouyinArticlePlugin())
    PluginRegistry.register(DouyinVideoPlugin())
    PluginRegistry.register(WeChatChannelsPlugin())
    yield


app = FastAPI(title="SmileX-CAS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(groups.router)
app.include_router(media.router)
app.include_router(platforms.router)
app.include_router(publish.router)


@app.get("/")
def read_root():
    return {"message": "SmileX-CAS API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

import logging
import httpx
from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult

logger = logging.getLogger(__name__)


class WeChatMPPlugin(BasePublishPlugin):
    platform_name = "wechat_mp"
    display_name = "微信公众号"
    supported_types = ["article"]
    auth_method = "oauth"

    def _get_credentials(self, account) -> tuple[str, str]:
        config = account.config or {}
        app_id = config.get("app_id", "")
        app_secret = config.get("app_secret", "")
        return app_id, app_secret

    async def _get_access_token(self, account) -> str:
        app_id, app_secret = self._get_credentials(account)
        if not app_id or not app_secret:
            raise ValueError("Missing app_id or app_secret in account config")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.weixin.qq.com/cgi-bin/token",
                params={
                    "grant_type": "client_credential",
                    "appid": app_id,
                    "secret": app_secret,
                },
            )
            data = resp.json()
            if "access_token" not in data:
                raise ValueError(
                    f"Failed to get access_token: {data.get('errmsg', 'unknown error')}"
                )
            return data["access_token"]

    async def _upload_thumb_media(self, access_token: str, article) -> str:
        async with httpx.AsyncClient() as client:
            import json
            from pathlib import Path
            from ..config import ARTICLES_DIR

            article_dir = Path(article.file_path) if article.file_path else None
            if article_dir and not article_dir.is_absolute():
                article_dir = ARTICLES_DIR.parent / article_dir

            content_text = article.content or ""
            first_image = None
            import re

            img_matches = re.findall(r"!\[.*?\]\((.*?)\)", content_text)
            for img_path in img_matches:
                if img_path.startswith("./") and article_dir:
                    full_path = article_dir / img_path.replace("./", "")
                    if full_path.exists():
                        first_image = full_path
                        break

            if not first_image:
                return ""

            with open(first_image, "rb") as f:
                resp = await client.post(
                    f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={access_token}&type=image",
                    files={"media": (first_image.name, f, "image/jpeg")},
                )
                data = resp.json()
                return data.get("media_id", "")

    async def _add_draft(self, access_token: str, article, thumb_media_id: str) -> str:
        async with httpx.AsyncClient() as client:
            import re

            content_text = article.content or ""

            content_text = re.sub(
                r"!\[([^\]]*)\]\(\./([^)]+)\)",
                lambda m: f"![{m.group(1)}]({m.group(2)})",
                content_text,
            )

            articles_data = [
                {
                    "title": article.title,
                    "author": "",
                    "digest": article.summary or content_text[:120],
                    "content": content_text,
                    "content_source_url": "",
                    "thumb_media_id": thumb_media_id,
                    "need_open_comment": 0,
                    "only_fans_can_comment": 0,
                }
            ]

            resp = await client.post(
                f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}",
                json={"articles": articles_data},
            )
            data = resp.json()
            if "media_id" not in data:
                raise ValueError(
                    f"Failed to add draft: {data.get('errmsg', 'unknown error')}"
                )
            return data["media_id"]

    async def _submit_publish(self, access_token: str, media_id: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token={access_token}",
                json={"media_id": media_id},
            )
            data = resp.json()
            if data.get("errcode", 0) != 0:
                raise ValueError(
                    f"Failed to submit publish: {data.get('errmsg', 'unknown error')}"
                )
            return data.get("publish_id", "")

    async def _get_publish_status(
        self, access_token: str, publish_id: str
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token={access_token}",
                json={"publish_id": publish_id},
            )
            return resp.json()

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        try:
            access_token = await self._get_access_token(account)
        except Exception as e:
            return PublishResult(
                success=False, error_message=f"获取 access_token 失败: {e}"
            )

        try:
            thumb_media_id = await self._upload_thumb_media(access_token, article)
        except Exception as e:
            logger.warning("Failed to upload thumb media: %s", e)
            thumb_media_id = ""

        try:
            media_id = await self._add_draft(access_token, article, thumb_media_id)
        except Exception as e:
            return PublishResult(success=False, error_message=f"创建草稿失败: {e}")

        try:
            publish_id = await self._submit_publish(access_token, media_id)
        except Exception as e:
            return PublishResult(
                success=False,
                error_message=f"草稿创建成功（media_id: {media_id}），但提交发布失败: {e}",
                platform_post_id=media_id,
            )

        return PublishResult(
            success=True,
            platform_post_id=media_id,
            platform_post_url=f"https://mp.weixin.qq.com (publish_id: {publish_id})",
            metadata={"publish_id": publish_id, "media_id": media_id},
        )

    async def test_connection(self, account) -> bool:
        try:
            await self._get_access_token(account)
            return True
        except Exception as e:
            logger.warning("WeChat MP test connection failed: %s", e)
            return False

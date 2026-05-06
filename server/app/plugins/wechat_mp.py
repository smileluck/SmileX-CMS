import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
import mistune

from ..config import BASE_STORAGE_DIR
from .base import BasePublishPlugin, GenerateResult, PublishResult
from .wechat_styles import apply_inline_styles

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

    async def _request_access_token(self, account) -> tuple[str, int]:
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
                errcode = data.get("errcode", "")
                errmsg = data.get("errmsg", "unknown error")
                raise ValueError(
                    f"获取 access_token 失败 (errcode={errcode}): {errmsg}"
                )
            return data["access_token"], data.get("expires_in", 7200)

    async def _validate_access_token(self, access_token: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.weixin.qq.com/cgi-bin/get_api_domain_ip",
                params={"access_token": access_token},
            )
            data = resp.json()
            if "ip_list" in data and data.get("errcode", 0) == 0:
                return True
            return False

    async def _get_or_refresh_access_token(self, account, db=None) -> str:
        now = datetime.now(timezone.utc)
        if account.access_token and account.token_expires_at:
            if account.token_expires_at > now + timedelta(minutes=5):
                if await self._validate_access_token(account.access_token):
                    return account.access_token
        access_token, expires_in = await self._request_access_token(account)
        if db is not None:
            account.access_token = access_token
            account.token_expires_at = now + timedelta(seconds=expires_in)
            account.status = "active"
            db.commit()
        return access_token

    def _resolve_article_dir(self, article) -> Optional[Path]:
        if not article.file_path:
            return None
        article_dir = Path(article.file_path)
        if not article_dir.is_absolute():
            article_dir = BASE_STORAGE_DIR / article_dir
        return article_dir if article_dir.exists() else None

    async def _upload_content_images(self, access_token: str, article) -> str:
        content_text = article.content or ""
        article_dir = self._resolve_article_dir(article)

        img_matches = re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", content_text)
        if not img_matches:
            return content_text

        async with httpx.AsyncClient(timeout=60) as client:
            for alt_text, img_path in img_matches:
                if img_path.startswith("http://") or img_path.startswith("https://"):
                    continue

                local_file = None
                if article_dir:
                    clean_path = img_path.lstrip("./")
                    full_path = article_dir / clean_path
                    if full_path.exists():
                        local_file = full_path

                if not local_file:
                    storage_path = Path(img_path)
                    if not storage_path.is_absolute():
                        storage_path = BASE_STORAGE_DIR / storage_path
                    if storage_path.exists():
                        local_file = storage_path

                if not local_file:
                    logger.warning("Image file not found, skipping: %s", img_path)
                    continue

                try:
                    with open(local_file, "rb") as f:
                        resp = await client.post(
                            "https://api.weixin.qq.com/cgi-bin/media/uploadimg",
                            params={"access_token": access_token},
                            files={"media": (local_file.name, f, "image/jpeg")},
                        )
                        data = resp.json()
                        wx_url = data.get("url")
                        if wx_url:
                            old_md = f"![{alt_text}]({img_path})"
                            new_md = f"![{alt_text}]({wx_url})"
                            content_text = content_text.replace(old_md, new_md, 1)
                            logger.info("Uploaded image %s -> %s", img_path, wx_url)
                        else:
                            logger.warning(
                                "Failed to upload image %s: %s",
                                img_path,
                                data.get("errmsg", "unknown"),
                            )
                except Exception as e:
                    logger.warning("Error uploading image %s: %s", img_path, e)

        return content_text

    async def _upload_thumb_media(self, access_token: str, article) -> str:
        article_dir = self._resolve_article_dir(article)
        content_text = article.content or ""
        first_image = None

        img_matches = re.findall(r"!\[.*?\]\(([^)]+)\)", content_text)
        for img_path in img_matches:
            if img_path.startswith("http://") or img_path.startswith("https://"):
                continue
            if article_dir:
                clean_path = img_path.lstrip("./")
                full_path = article_dir / clean_path
                if full_path.exists():
                    first_image = full_path
                    break
            storage_path = Path(img_path)
            if not storage_path.is_absolute():
                storage_path = BASE_STORAGE_DIR / storage_path
            if storage_path.exists():
                first_image = storage_path
                break

        if not first_image:
            return ""

        async with httpx.AsyncClient() as client:
            with open(first_image, "rb") as f:
                resp = await client.post(
                    f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={access_token}&type=image",
                    files={"media": (first_image.name, f, "image/jpeg")},
                )
                data = resp.json()
                media_id = data.get("media_id", "")
                if not media_id:
                    logger.warning(
                        "Failed to upload thumb: %s", data.get("errmsg", "unknown")
                    )
                return media_id

    def _save_published_html(self, article, html_content: str) -> Optional[str]:
        article_dir = self._resolve_article_dir(article)
        if not article_dir:
            return None
        try:
            out_dir = article_dir / "published" / self.platform_name
            out_dir.mkdir(parents=True, exist_ok=True)
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            out_file = out_dir / f"{ts}.html"
            out_file.write_text(html_content, encoding="utf-8")
            logger.info("Saved published HTML to %s", out_file)
            return str(out_file)
        except Exception as e:
            logger.warning("Failed to save published HTML: %s", e)
            return None

    def _convert_markdown_to_html(self, markdown_content: str) -> str:
        md = mistune.create_markdown(plugins=["table", "strikethrough"])
        html = md(markdown_content)
        return apply_inline_styles(html)

    async def _add_draft(
        self, access_token: str, article, thumb_media_id: str, content: str
    ) -> str:
        async with httpx.AsyncClient() as client:
            articles_data = [
                {
                    "title": article.title,
                    "author": "",
                    "digest": article.summary or content[:120],
                    "content": content,
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
                    f"Failed to add draft: {data.get('errmsg', 'unknown error')} (errcode={data.get('errcode', '')})"
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
                    f"Failed to submit publish: {data.get('errmsg', 'unknown error')} (errcode={data.get('errcode', '')})"
                )
            return data.get("publish_id", "")

    @staticmethod
    def _resolve_image_paths_for_local(markdown_content: str) -> str:
        def _replace(match: re.Match) -> str:
            alt, url = match.group(1), match.group(2)
            if url.startswith("http://") or url.startswith("https://"):
                return match.group(0)
            clean = url.lstrip("./")
            return f"![{alt}](../../{clean})"

        return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", _replace, markdown_content)

    def generate(self, article, options: Dict[str, Any]) -> GenerateResult:
        content_override = options.get("_content_override")
        if content_override:
            content = content_override
        else:
            content = self._resolve_image_paths_for_local(article.content or "")
        try:
            html_content = self._convert_markdown_to_html(content)
        except Exception as e:
            return GenerateResult(success=False, error_message=str(e))
        output_path = self._save_published_html(article, html_content)
        return GenerateResult(
            success=True,
            output_path=output_path,
            content=html_content,
        )

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        db = options.get("_db")
        try:
            access_token = await self._get_or_refresh_access_token(account, db)
        except Exception as e:
            return PublishResult(
                success=False, error_message=f"获取 access_token 失败: {e}"
            )

        try:
            content = await self._upload_content_images(access_token, article)
        except Exception as e:
            logger.warning("Failed to upload content images: %s", e)
            content = article.content or ""

        gen = self.generate(article, {"_content_override": content})
        html_content = gen.content if gen.success else content

        try:
            thumb_media_id = await self._upload_thumb_media(access_token, article)
        except Exception as e:
            logger.warning("Failed to upload thumb media: %s", e)
            thumb_media_id = ""

        try:
            media_id = await self._add_draft(
                access_token, article, thumb_media_id, html_content
            )
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

    async def test_connection(self, account, db=None) -> Dict[str, Any]:
        try:
            access_token, expires_in = await self._request_access_token(account)
            result = {
                "connected": True,
                "status": "active",
                "access_token_saved": False,
            }
            if db is not None:
                now = datetime.now(timezone.utc)
                account.access_token = access_token
                account.token_expires_at = now + timedelta(seconds=expires_in)
                account.status = "active"
                db.commit()
                result["access_token_saved"] = True
                result["expires_at"] = account.token_expires_at.isoformat()
            return result
        except Exception as e:
            logger.warning("WeChat MP test connection failed: %s", e)
            result = {
                "connected": False,
                "status": "inactive",
                "access_token_saved": False,
                "error": str(e),
            }
            if db is not None:
                account.status = "inactive"
                db.commit()
            return result

    async def validate_token(
        self, account, access_token: str, db=None
    ) -> Dict[str, Any]:
        is_valid = await self._validate_access_token(access_token)
        if is_valid:
            result = {
                "valid": True,
                "status": "active",
                "access_token_saved": False,
                "message": "提供的 access_token 验证通过",
            }
            if db is not None:
                account.access_token = access_token
                account.token_expires_at = None
                account.status = "active"
                db.commit()
                result["access_token_saved"] = True
            return result

        try:
            new_token, expires_in = await self._request_access_token(account)
            new_valid = await self._validate_access_token(new_token)
            if new_valid:
                result = {
                    "valid": True,
                    "status": "active",
                    "access_token_saved": False,
                    "refreshed": True,
                    "message": "提供的 token 无效，已重新获取 access_token 并验证通过",
                }
                if db is not None:
                    now = datetime.now(timezone.utc)
                    account.access_token = new_token
                    account.token_expires_at = now + timedelta(seconds=expires_in)
                    account.status = "active"
                    db.commit()
                    result["access_token_saved"] = True
                    result["expires_at"] = account.token_expires_at.isoformat()
                return result
            else:
                result = {
                    "valid": False,
                    "status": "inactive",
                    "access_token_saved": False,
                    "message": "提供的 token 和重新获取的 token 均验证失败",
                }
                if db is not None:
                    account.status = "inactive"
                    db.commit()
                return result
        except Exception as e:
            result = {
                "valid": False,
                "status": "inactive",
                "access_token_saved": False,
                "message": f"提供的 token 无效，重新获取 token 失败: {e}",
            }
            if db is not None:
                account.status = "inactive"
                db.commit()
            return result

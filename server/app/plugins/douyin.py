from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class DouyinPlugin(BasePublishPlugin):
    platform_name = "douyin"
    display_name = "抖音"
    supported_types = ["article", "video"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        content_type = options.get("content_type", "article")
        if content_type == "video":
            return PublishResult(
                success=False, error_message="Douyin video plugin not yet implemented"
            )
        return PublishResult(
            success=False, error_message="Douyin article plugin not yet implemented"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}


class DouyinArticlePlugin(BasePublishPlugin):
    platform_name = "douyin_article"
    display_name = "抖音图文"
    supported_types = ["article"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Douyin article plugin not yet implemented"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}


class DouyinVideoPlugin(BasePublishPlugin):
    platform_name = "douyin_video"
    display_name = "抖音视频"
    supported_types = ["video"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Douyin video plugin not yet implemented"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

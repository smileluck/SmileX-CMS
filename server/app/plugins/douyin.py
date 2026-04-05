from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class DouyinArticlePlugin(BasePublishPlugin):
    platform_name = "douyin_article"
    display_name = "抖音图文"
    supported_types = ["article"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Douyin article plugin not yet implemented"
        )

    async def test_connection(self, account) -> bool:
        return False


class DouyinVideoPlugin(BasePublishPlugin):
    platform_name = "douyin_video"
    display_name = "抖音视频"
    supported_types = ["video"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Douyin video plugin not yet implemented"
        )

    async def test_connection(self, account) -> bool:
        return False

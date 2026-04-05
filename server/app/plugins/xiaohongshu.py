from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class XiaohongshuPlugin(BasePublishPlugin):
    platform_name = "xiaohongshu"
    display_name = "小红书"
    supported_types = ["article"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Xiaohongshu plugin not yet implemented"
        )

    async def test_connection(self, account) -> bool:
        return False

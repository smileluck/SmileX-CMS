from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class WeChatMPPlugin(BasePublishPlugin):
    platform_name = "wechat_mp"
    display_name = "微信公众号"
    supported_types = ["article"]
    auth_method = "oauth"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="WeChat MP plugin not yet implemented"
        )

    async def test_connection(self, account) -> bool:
        return False

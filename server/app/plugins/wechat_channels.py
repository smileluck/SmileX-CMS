from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class WeChatChannelsPlugin(BasePublishPlugin):
    platform_name = "wechat_channels"
    display_name = "微信视频号"
    supported_types = ["video"]
    auth_method = "cookie"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="WeChat Channels plugin not yet implemented"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

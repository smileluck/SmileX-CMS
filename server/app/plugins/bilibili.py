from typing import Any, Dict
from .base import BasePublishPlugin, PublishResult


class BilibiliPlugin(BasePublishPlugin):
    platform_name = "bilibili"
    display_name = "Bilibili"
    supported_types = ["article", "video"]
    auth_method = "oauth"

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="Bilibili plugin not yet implemented"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

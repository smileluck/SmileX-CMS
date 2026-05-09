from typing import Any, Dict

from .base import BasePublishPlugin, GenerateResult, PublishResult
from .publish_utils import resolve_image_paths_for_local, strip_platform_metadata, save_published_file


class JuejinPlugin(BasePublishPlugin):
    platform_name = "juejin"
    display_name = "掘金"
    supported_types = ["article"]
    auth_method = "cookie"

    def generate(self, article, options: Dict[str, Any]) -> GenerateResult:
        content = strip_platform_metadata(article.content or "")
        content = resolve_image_paths_for_local(content)
        output_path = save_published_file(article, content, self.platform_name, ext="md")
        return GenerateResult(success=True, output_path=output_path, content=content)

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="掘金云端发布暂不支持"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

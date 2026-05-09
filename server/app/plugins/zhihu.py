from typing import Any, Dict

from .base import BasePublishPlugin, GenerateResult, PublishResult
from .publish_utils import (
    resolve_image_paths_for_local,
    strip_platform_metadata,
    markdown_to_styled_html,
    save_published_file,
)
from .zhihu_styles import ZHIHU_ELEMENT_STYLES, ZHIHU_CODE_BLOCK_STYLE


class ZhihuPlugin(BasePublishPlugin):
    platform_name = "zhihu"
    display_name = "知乎"
    supported_types = ["article"]
    auth_method = "cookie"

    def generate(self, article, options: Dict[str, Any]) -> GenerateResult:
        content = strip_platform_metadata(article.content or "")
        content = resolve_image_paths_for_local(content)
        try:
            html = markdown_to_styled_html(content, ZHIHU_ELEMENT_STYLES, ZHIHU_CODE_BLOCK_STYLE)
        except Exception as e:
            return GenerateResult(success=False, error_message=str(e))
        output_path = save_published_file(article, html, self.platform_name)
        return GenerateResult(success=True, output_path=output_path, content=html)

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="知乎云端发布暂不支持"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

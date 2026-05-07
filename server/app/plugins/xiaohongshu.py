import json
from typing import Any, Dict

from .base import BasePublishPlugin, GenerateResult, PublishResult
from .image_metadata import parse_images_from_markdown, resolve_image_url
from .publish_utils import (
    markdown_to_styled_html,
    resolve_image_paths_for_local,
    save_published_file,
)
from .xiaohongshu_styles import XIAOHONGSHU_ELEMENT_STYLES, XIAOHONGSHU_CODE_BLOCK_STYLE


class XiaohongshuPlugin(BasePublishPlugin):
    platform_name = "xiaohongshu"
    display_name = "小红书"
    supported_types = ["article"]
    auth_method = "cookie"

    def generate(self, article, options: Dict[str, Any]) -> GenerateResult:
        parsed = parse_images_from_markdown(article.content or "")

        # Convert body markdown (with cover/gallery removed) to styled HTML
        body_md = resolve_image_paths_for_local(parsed.body_markdown)
        try:
            body_html = markdown_to_styled_html(
                body_md, XIAOHONGSHU_ELEMENT_STYLES, XIAOHONGSHU_CODE_BLOCK_STYLE
            )
        except Exception as e:
            return GenerateResult(success=False, error_message=str(e))

        # Resolve image URLs for cover and gallery
        cover_url = resolve_image_url(parsed.cover.url) if parsed.cover else None
        gallery_urls = [resolve_image_url(g.url) for g in parsed.gallery]

        # Build full HTML
        parts = []

        # Embed metadata as HTML comment
        meta = {"cover": cover_url, "gallery": gallery_urls}
        parts.append(f"<!-- xhs-meta: {json.dumps(meta, ensure_ascii=False)} -->")

        # Cover section
        if cover_url:
            parts.append('<div style="margin-bottom:16px;">')
            parts.append(
                f'<img src="{cover_url}" alt="封面"'
                ' style="max-width:100%;border-radius:12px;display:block;" />'
            )
            parts.append("</div>")

        # Gallery section
        for i, url in enumerate(gallery_urls, 1):
            parts.append('<div style="margin-bottom:8px;">')
            parts.append(
                f'<img src="{url}" alt="轮播图{i}"'
                ' style="max-width:100%;border-radius:8px;display:block;" />'
            )
            parts.append("</div>")

        # Body content
        parts.append(body_html)

        full_html = "\n".join(parts)
        output_path = save_published_file(article, full_html, self.platform_name)

        return GenerateResult(
            success=True,
            output_path=output_path,
            content=full_html,
            metadata={"cover_path": cover_url, "gallery_paths": gallery_urls},
        )

    async def publish(self, article, account, options: Dict[str, Any]) -> PublishResult:
        return PublishResult(
            success=False, error_message="小红书云端发布暂不支持"
        )

    async def test_connection(self, account, db=None) -> dict:
        return {"connected": False, "status": "inactive"}

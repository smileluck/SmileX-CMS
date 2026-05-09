"""Shared utilities for local article generation plugins."""

import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import mistune

from ..config import BASE_STORAGE_DIR
from .themes import apply_primary_color, get_theme
from .wechat_styles import apply_inline_styles

logger = logging.getLogger(__name__)


def strip_platform_metadata(markdown_content: str) -> str:
    """Remove :::platform metadata blocks from markdown content."""
    return re.sub(r'^:::\w+\s*\n[\s\S]*?\n:::\s*$', '', markdown_content, flags=re.MULTILINE).strip()


def resolve_article_dir(article) -> Optional[Path]:
    if not article.file_path:
        return None
    article_dir = Path(article.file_path)
    if not article_dir.is_absolute():
        article_dir = BASE_STORAGE_DIR / article_dir
    return article_dir if article_dir.exists() else None


def resolve_image_paths_for_local(markdown_content: str) -> str:
    def _replace(match: re.Match) -> str:
        alt, url = match.group(1), match.group(2)
        if url.startswith("http://") or url.startswith("https://"):
            return match.group(0)
        clean = url.lstrip("./")
        return f"![{alt}](../../{clean})"

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", _replace, markdown_content)


def markdown_to_styled_html(
    markdown_content: str,
    style_map: dict | None = None,
    code_block_style: dict | None = None,
    theme_id: str | None = None,
    primary_color: str | None = None,
) -> str:
    md = mistune.create_markdown(plugins=["table", "strikethrough"])
    html = md(markdown_content)

    if theme_id:
        theme = get_theme(theme_id)
        if theme:
            sm = theme.styles
            cb = theme.code_block_style
            if primary_color:
                sm = apply_primary_color(sm, theme.primary_color, primary_color)
            return apply_inline_styles(html, sm, cb)

    return apply_inline_styles(html, style_map, code_block_style)


def save_published_file(article, content: str, platform_name: str, ext: str = "html") -> Optional[str]:
    article_dir = resolve_article_dir(article)
    if not article_dir:
        return None
    try:
        out_dir = article_dir / "published" / platform_name
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        out_file = out_dir / f"{ts}.{ext}"
        out_file.write_text(content, encoding="utf-8")
        logger.info("Saved published file to %s", out_file)
        return str(out_file)
    except Exception as e:
        logger.warning("Failed to save published file: %s", e)
        return None

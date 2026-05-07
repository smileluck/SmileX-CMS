"""Extract cover/gallery/content images from markdown using alt-text conventions.

Convention:
    ![封面](path) / ![cover](path)   -> cover image
    ![轮播](path) / ![gallery](path) -> gallery (carousel) image
    all other images                 -> inline content images
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

COVER_ALTS = {"cover", "封面"}
GALLERY_ALTS = {"gallery", "轮播"}


@dataclass
class ExtractedImage:
    alt: str
    url: str
    index: int


@dataclass
class ParsedImages:
    cover: Optional[ExtractedImage] = None
    gallery: list = field(default_factory=list)
    content_images: list = field(default_factory=list)
    body_markdown: str = ""


def parse_images_from_markdown(
    markdown_content: str,
    article_dir: Optional[Path] = None,
) -> ParsedImages:
    """Parse markdown and classify images by their alt text."""
    cover = None
    gallery = []
    content_images = []
    lines_to_remove = set()

    lines = markdown_content.split("\n")

    for line_idx, line in enumerate(lines):
        for match in IMAGE_PATTERN.finditer(line):
            alt, url = match.group(1), match.group(2)
            alt_lower = alt.strip().lower()
            img = ExtractedImage(alt=alt, url=url, index=line_idx)

            if alt_lower in COVER_ALTS:
                if cover is None:
                    cover = img
                lines_to_remove.add(line_idx)
            elif alt_lower in GALLERY_ALTS:
                gallery.append(img)
                lines_to_remove.add(line_idx)
            else:
                content_images.append(img)

    body_lines = [
        line for idx, line in enumerate(lines) if idx not in lines_to_remove
    ]
    body_markdown = "\n".join(body_lines).strip()

    return ParsedImages(
        cover=cover,
        gallery=gallery,
        content_images=content_images,
        body_markdown=body_markdown,
    )


def resolve_image_url(img_url: str) -> str:
    """Resolve a markdown image path for local HTML generation."""
    if img_url.startswith(("http://", "https://")):
        return img_url
    clean = img_url.lstrip("./")
    return f"../../{clean}"

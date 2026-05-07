"""Doocs/md-inspired themes for local article generation.

Three built-in themes converted to inline style dictionaries:
- Classic (经典): Traditional WeChat-friendly style with green accents
- Grace (优雅): Elegant style with purple tones and decorative borders
- Simple (简洁): Minimalist clean style with neutral colors
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Theme:
    id: str
    name: str
    styles: dict[str, dict[str, str]]
    code_block_style: dict[str, str]
    primary_color: str
    description: str = ""


_CLASSIC_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "22px", "font-weight": "700",
        "margin-top": "24px", "margin-bottom": "16px",
        "color": "#191919", "line-height": "1.4",
        "border-bottom": "2px solid #07C160", "padding-bottom": "8px",
    },
    "h2": {
        "font-size": "20px", "font-weight": "700",
        "margin-top": "20px", "margin-bottom": "14px",
        "color": "#191919", "line-height": "1.4",
    },
    "h3": {
        "font-size": "18px", "font-weight": "700",
        "margin-top": "18px", "margin-bottom": "12px",
        "color": "#191919", "line-height": "1.4",
    },
    "h4": {
        "font-size": "16px", "font-weight": "700",
        "margin-top": "16px", "margin-bottom": "10px",
        "color": "#191919", "line-height": "1.4",
    },
    "h5": {
        "font-size": "15px", "font-weight": "700",
        "margin-top": "14px", "margin-bottom": "8px",
        "color": "#191919", "line-height": "1.4",
    },
    "h6": {
        "font-size": "14px", "font-weight": "700",
        "margin-top": "12px", "margin-bottom": "8px",
        "color": "#888", "line-height": "1.4",
    },
    "p": {
        "margin": "0 0 16px", "font-size": "16px",
        "line-height": "1.75", "letter-spacing": "1px", "color": "#333",
    },
    "strong": {"font-weight": "700", "color": "#07C160"},
    "em": {"font-style": "italic"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {
        "color": "#07C160", "text-decoration": "none",
        "border-bottom": "1px solid #07C160",
    },
    "blockquote": {
        "margin": "16px 0", "padding": "12px 16px",
        "border-left": "3px solid #07C160",
        "background": "#f7f7f7", "color": "#888", "font-size": "15px",
    },
    "code": {
        "background": "#fff5f5", "color": "#ff502c",
        "padding": "2px 6px", "border-radius": "3px", "font-size": "14px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#2b2b2b", "border-radius": "6px",
        "padding": "16px", "margin": "16px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.75",
        "letter-spacing": "1px", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.75",
        "letter-spacing": "1px", "color": "#333",
    },
    "li": {"margin": "6px 0"},
    "img": {"max-width": "100%", "border-radius": "4px", "display": "block", "margin": "12px auto"},
    "hr": {"border": "none", "border-top": "1px solid #eee", "margin": "24px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "16px 0", "font-size": "15px",
    },
    "th": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left", "background": "#ebfaf2",
        "font-weight": "600", "color": "#191919",
    },
    "td": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left",
    },
}

_CLASSIC_CODE_BLOCK: dict[str, str] = {
    "color": "#d4d4d4",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

_GRACE_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "24px", "font-weight": "700",
        "margin-top": "28px", "margin-bottom": "18px",
        "color": "#35b378", "line-height": "1.4",
        "text-align": "center",
        "border-bottom": "2px solid #35b378", "padding-bottom": "10px",
    },
    "h2": {
        "font-size": "20px", "font-weight": "700",
        "margin-top": "24px", "margin-bottom": "14px",
        "color": "#35b378", "line-height": "1.5",
        "border-bottom": "1px dashed #e8e8e8", "padding-bottom": "6px",
    },
    "h3": {
        "font-size": "18px", "font-weight": "600",
        "margin-top": "20px", "margin-bottom": "12px",
        "color": "#35b378", "line-height": "1.5",
    },
    "h4": {
        "font-size": "17px", "font-weight": "600",
        "margin-top": "18px", "margin-bottom": "10px",
        "color": "#333", "line-height": "1.5",
    },
    "h5": {
        "font-size": "16px", "font-weight": "600",
        "margin-top": "16px", "margin-bottom": "8px",
        "color": "#333", "line-height": "1.5",
    },
    "h6": {
        "font-size": "15px", "font-weight": "600",
        "margin-top": "14px", "margin-bottom": "8px",
        "color": "#888", "line-height": "1.5",
    },
    "p": {
        "margin": "0 0 16px", "font-size": "16px",
        "line-height": "2", "letter-spacing": "0.5px", "color": "#333",
    },
    "strong": {"font-weight": "700", "color": "#35b378"},
    "em": {"font-style": "italic", "color": "#35b378"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {
        "color": "#35b378", "text-decoration": "none",
        "border-bottom": "1px solid #35b378",
    },
    "blockquote": {
        "margin": "16px 0", "padding": "14px 20px",
        "border-left": "4px solid #35b378",
        "background": "#f8f9fa", "color": "#666", "font-size": "15px",
        "line-height": "1.8",
    },
    "code": {
        "background": "#e8f5e9", "color": "#35b378",
        "padding": "2px 6px", "border-radius": "4px", "font-size": "14px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#282c34", "border-radius": "8px",
        "padding": "18px", "margin": "16px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "2",
        "letter-spacing": "0.5px", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "2",
        "letter-spacing": "0.5px", "color": "#333",
    },
    "li": {"margin": "6px 0"},
    "img": {"max-width": "100%", "border-radius": "8px", "display": "block", "margin": "14px auto"},
    "hr": {"border": "none", "border-top": "1px dashed #e8e8e8", "margin": "24px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "16px 0", "font-size": "15px",
    },
    "th": {
        "border": "1px solid #e8e8e8", "padding": "10px 14px",
        "text-align": "left", "background": "#eef8f4",
        "font-weight": "600", "color": "#35b378",
    },
    "td": {
        "border": "1px solid #e8e8e8", "padding": "10px 14px",
        "text-align": "left",
    },
}

_GRACE_CODE_BLOCK: dict[str, str] = {
    "color": "#abb2bf",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

_SIMPLE_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "22px", "font-weight": "700",
        "margin-top": "24px", "margin-bottom": "16px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h2": {
        "font-size": "19px", "font-weight": "700",
        "margin-top": "20px", "margin-bottom": "14px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h3": {
        "font-size": "17px", "font-weight": "600",
        "margin-top": "18px", "margin-bottom": "12px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h4": {
        "font-size": "16px", "font-weight": "600",
        "margin-top": "16px", "margin-bottom": "10px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h5": {
        "font-size": "15px", "font-weight": "600",
        "margin-top": "14px", "margin-bottom": "8px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h6": {
        "font-size": "14px", "font-weight": "600",
        "margin-top": "12px", "margin-bottom": "8px",
        "color": "#888", "line-height": "1.4",
    },
    "p": {
        "margin": "0 0 14px", "font-size": "16px",
        "line-height": "1.8", "color": "#333",
    },
    "strong": {"font-weight": "700", "color": "#1a1a1a"},
    "em": {"font-style": "italic"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {"color": "#4a90d9", "text-decoration": "none"},
    "blockquote": {
        "margin": "14px 0", "padding": "10px 16px",
        "border-left": "3px solid #ddd",
        "background": "#fafafa", "color": "#666", "font-size": "15px",
    },
    "code": {
        "background": "#f5f5f5", "color": "#c7254e",
        "padding": "2px 6px", "border-radius": "3px", "font-size": "14px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#f5f5f5", "border-radius": "4px",
        "padding": "16px", "margin": "14px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.8", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.8", "color": "#333",
    },
    "li": {"margin": "5px 0"},
    "img": {"max-width": "100%", "border-radius": "2px", "display": "block", "margin": "12px auto"},
    "hr": {"border": "none", "border-top": "1px solid #eee", "margin": "20px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "14px 0", "font-size": "15px",
    },
    "th": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left", "background": "#ececec",
        "font-weight": "600", "color": "#1a1a1a",
    },
    "td": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left",
    },
}

_SIMPLE_CODE_BLOCK: dict[str, str] = {
    "color": "#333",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

_THEMES: dict[str, Theme] = {
    "classic": Theme(
        id="classic",
        name="经典",
        description="经典绿色风格，适合微信公众号",
        styles=_CLASSIC_STYLES,
        code_block_style=_CLASSIC_CODE_BLOCK,
        primary_color="#07C160",
    ),
    "grace": Theme(
        id="grace",
        name="优雅",
        description="优雅翠绿风格，带装饰边框",
        styles=_GRACE_STYLES,
        code_block_style=_GRACE_CODE_BLOCK,
        primary_color="#35b378",
    ),
    "simple": Theme(
        id="simple",
        name="简洁",
        description="极简黑白风格，干净利落",
        styles=_SIMPLE_STYLES,
        code_block_style=_SIMPLE_CODE_BLOCK,
        primary_color="#1a1a1a",
    ),
}


def get_theme(theme_id: str) -> Optional[Theme]:
    return _THEMES.get(theme_id)


def list_themes() -> list[Theme]:
    return list(_THEMES.values())


_PRIMARY_COLOR_TARGETS = ("color", "border-left", "border-bottom", "background", "border")
_PRIMARY_COLOR_HIGHLIGHTS = ("strong", "em", "a", "blockquote", "th", "code", "table", "td")


def _lighten_color(hex_color: str, factor: float = 0.92) -> str:
    """Create a light tint of a hex color by mixing with white."""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    r = int(r + (255 - r) * factor)
    g = int(g + (255 - g) * factor)
    b = int(b + (255 - b) * factor)
    return f"#{r:02x}{g:02x}{b:02x}"


def apply_primary_color(styles: dict[str, dict[str, str]], default_color: str, custom_color: str) -> dict[str, dict[str, str]]:
    """Replace the theme's primary color with a user-chosen color across all element styles."""
    if custom_color.lower() == default_color.lower():
        return styles

    default_light = _lighten_color(default_color)
    custom_light = _lighten_color(custom_color)

    result: dict[str, dict[str, str]] = {}
    for tag, props in styles.items():
        new_props: dict[str, str] = {}
        for prop, val in props.items():
            if tag in _PRIMARY_COLOR_HIGHLIGHTS and prop in _PRIMARY_COLOR_TARGETS:
                new_val = val.replace(default_color, custom_color)
                new_val = new_val.replace(default_light, custom_light)
                new_props[prop] = new_val
            else:
                new_props[prop] = val
        result[tag] = new_props
    return result

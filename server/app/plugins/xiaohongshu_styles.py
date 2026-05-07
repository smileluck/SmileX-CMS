"""Xiaohongshu (小红书) inline styles for HTML content.

Young, warm, rounded style matching Xiaohongshu's visual identity.
"""

XIAOHONGSHU_ELEMENT_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "22px", "font-weight": "700",
        "margin-top": "24px", "margin-bottom": "14px",
        "color": "#333", "line-height": "1.5",
    },
    "h2": {
        "font-size": "20px", "font-weight": "700",
        "margin-top": "20px", "margin-bottom": "12px",
        "color": "#333", "line-height": "1.5",
    },
    "h3": {
        "font-size": "18px", "font-weight": "600",
        "margin-top": "18px", "margin-bottom": "10px",
        "color": "#333", "line-height": "1.5",
    },
    "h4": {
        "font-size": "17px", "font-weight": "600",
        "margin-top": "16px", "margin-bottom": "8px",
        "color": "#333", "line-height": "1.5",
    },
    "p": {
        "margin": "0 0 14px", "font-size": "17px",
        "line-height": "1.8", "color": "#333",
    },
    "strong": {"font-weight": "700", "color": "#FE2C55"},
    "em": {"font-style": "italic"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {"color": "#FE2C55", "text-decoration": "none"},
    "blockquote": {
        "margin": "14px 0", "padding": "12px 16px",
        "border-left": "3px solid #FE2C55",
        "background": "#fff5f7", "color": "#666", "font-size": "16px",
    },
    "code": {
        "background": "#fff5f7", "color": "#FE2C55",
        "padding": "2px 6px", "border-radius": "4px", "font-size": "14px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#282c34", "border-radius": "8px",
        "padding": "16px", "margin": "14px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "17px", "line-height": "1.8", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "17px", "line-height": "1.8", "color": "#333",
    },
    "li": {"margin": "6px 0"},
    "img": {"max-width": "100%", "border-radius": "8px", "display": "block", "margin": "14px auto"},
    "hr": {"border": "none", "border-top": "1px solid #eee", "margin": "20px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "14px 0", "font-size": "15px",
    },
    "th": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left", "background": "#fff5f7",
        "font-weight": "600", "color": "#333",
    },
    "td": {
        "border": "1px solid #eee", "padding": "8px 12px",
        "text-align": "left",
    },
}

XIAOHONGSHU_CODE_BLOCK_STYLE: dict[str, str] = {
    "color": "#abb2bf",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

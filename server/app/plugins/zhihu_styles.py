"""Zhihu (知乎) inline styles for HTML content.

Professional, clean, restrained style matching Zhihu's editorial design.
"""

ZHIHU_ELEMENT_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "22px", "font-weight": "600",
        "margin-top": "24px", "margin-bottom": "16px",
        "color": "#1a1a1a", "line-height": "1.5",
    },
    "h2": {
        "font-size": "20px", "font-weight": "600",
        "margin-top": "22px", "margin-bottom": "14px",
        "color": "#1a1a1a", "line-height": "1.5",
    },
    "h3": {
        "font-size": "18px", "font-weight": "600",
        "margin-top": "20px", "margin-bottom": "12px",
        "color": "#1a1a1a", "line-height": "1.5",
    },
    "h4": {
        "font-size": "16px", "font-weight": "600",
        "margin-top": "18px", "margin-bottom": "10px",
        "color": "#1a1a1a", "line-height": "1.5",
    },
    "p": {
        "margin": "0 0 16px", "font-size": "15px",
        "line-height": "1.7", "color": "#333",
    },
    "strong": {"font-weight": "600", "color": "#1a1a1a"},
    "em": {"font-style": "italic"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {"color": "#175199", "text-decoration": "none"},
    "blockquote": {
        "margin": "16px 0", "padding": "12px 20px",
        "border-left": "4px solid #175199",
        "background": "#f6f6f6", "color": "#666", "font-size": "14px",
    },
    "code": {
        "background": "#f0f0f0", "color": "#c7254e",
        "padding": "2px 6px", "border-radius": "3px", "font-size": "13px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#f6f8fa", "border-radius": "4px",
        "padding": "16px", "margin": "16px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "15px", "line-height": "1.7", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "15px", "line-height": "1.7", "color": "#333",
    },
    "li": {"margin": "5px 0"},
    "img": {"max-width": "100%", "border-radius": "4px", "display": "block", "margin": "12px auto"},
    "hr": {"border": "none", "border-top": "1px solid #e0e0e0", "margin": "24px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "16px 0", "font-size": "14px",
    },
    "th": {
        "border": "1px solid #e0e0e0", "padding": "8px 12px",
        "text-align": "left", "background": "#f6f6f6",
        "font-weight": "600", "color": "#1a1a1a",
    },
    "td": {
        "border": "1px solid #e0e0e0", "padding": "8px 12px",
        "text-align": "left",
    },
}

ZHIHU_CODE_BLOCK_STYLE: dict[str, str] = {
    "color": "#333",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

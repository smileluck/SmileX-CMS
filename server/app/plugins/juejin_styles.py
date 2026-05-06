"""Juejin (掘金) inline styles for HTML content.

Tech-oriented, clean style matching Juejin's article design.
"""

JUEJIN_ELEMENT_STYLES: dict[str, dict[str, str]] = {
    "h1": {
        "font-size": "24px", "font-weight": "700",
        "margin-top": "24px", "margin-bottom": "16px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h2": {
        "font-size": "20px", "font-weight": "700",
        "margin-top": "22px", "margin-bottom": "14px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h3": {
        "font-size": "18px", "font-weight": "700",
        "margin-top": "20px", "margin-bottom": "12px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "h4": {
        "font-size": "16px", "font-weight": "700",
        "margin-top": "18px", "margin-bottom": "10px",
        "color": "#1a1a1a", "line-height": "1.4",
    },
    "p": {
        "margin": "0 0 16px", "font-size": "16px",
        "line-height": "1.6", "color": "#333",
    },
    "strong": {"font-weight": "700", "color": "#1a1a1a"},
    "em": {"font-style": "italic"},
    "del": {"text-decoration": "line-through", "color": "#999"},
    "a": {"color": "#1e80ff", "text-decoration": "none"},
    "blockquote": {
        "margin": "16px 0", "padding": "12px 16px",
        "border-left": "4px solid #1e80ff",
        "background": "#f7f8fa", "color": "#666", "font-size": "15px",
    },
    "code": {
        "background": "#fff5f5", "color": "#c7254e",
        "padding": "2px 6px", "border-radius": "3px", "font-size": "14px",
        "font-family": "'Menlo','Monaco','Consolas',monospace",
    },
    "pre": {
        "background": "#282c34", "border-radius": "6px",
        "padding": "16px", "margin": "16px 0", "overflow": "auto",
    },
    "ul": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.6", "color": "#333",
    },
    "ol": {
        "margin": "10px 0", "padding-left": "24px",
        "font-size": "16px", "line-height": "1.6", "color": "#333",
    },
    "li": {"margin": "6px 0"},
    "img": {"max-width": "100%", "border-radius": "4px", "margin": "12px 0"},
    "hr": {"border": "none", "border-top": "1px solid #e0e0e0", "margin": "24px 0"},
    "table": {
        "width": "100%", "border-collapse": "collapse",
        "margin": "16px 0", "font-size": "14px",
    },
    "th": {
        "border": "1px solid #e0e0e0", "padding": "8px 12px",
        "text-align": "left", "background": "#f7f8fa",
        "font-weight": "600", "color": "#1a1a1a",
    },
    "td": {
        "border": "1px solid #e0e0e0", "padding": "8px 12px",
        "text-align": "left",
    },
}

JUEJIN_CODE_BLOCK_STYLE: dict[str, str] = {
    "color": "#abb2bf",
    "font-family": "'Menlo','Monaco','Consolas',monospace",
    "white-space": "pre",
}

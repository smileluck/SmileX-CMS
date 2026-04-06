export function inlineStyles(html: string, platform: string): string {
  const styleMap = getPlatformStyles(platform);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as HTMLElement;

  applyInlineStyles(container, styleMap);
  cleanAttributes(container);

  return container.innerHTML;
}

function getPlatformStyles(platform: string): Record<string, Record<string, string>> {
  if (platform === 'wechat_mp') {
    return {
      'h1': { 'font-size': '22px', 'font-weight': '700', 'margin-top': '24px', 'margin-bottom': '16px', 'color': '#191919', 'line-height': '1.4', 'border-bottom': '1px solid #eee', 'padding-bottom': '8px' },
      'h2': { 'font-size': '20px', 'font-weight': '700', 'margin-top': '20px', 'margin-bottom': '14px', 'color': '#191919', 'line-height': '1.4' },
      'h3': { 'font-size': '18px', 'font-weight': '700', 'margin-top': '18px', 'margin-bottom': '12px', 'color': '#191919', 'line-height': '1.4' },
      'h4': { 'font-size': '16px', 'font-weight': '700', 'margin-top': '16px', 'margin-bottom': '10px', 'color': '#191919', 'line-height': '1.4' },
      'h5': { 'font-size': '15px', 'font-weight': '700', 'margin-top': '14px', 'margin-bottom': '8px', 'color': '#191919', 'line-height': '1.4' },
      'h6': { 'font-size': '14px', 'font-weight': '700', 'margin-top': '12px', 'margin-bottom': '8px', 'color': '#888', 'line-height': '1.4' },
      'p': { 'margin': '0 0 16px', 'font-size': '16px', 'line-height': '1.75', 'letter-spacing': '1px', 'color': '#333' },
      'strong': { 'font-weight': '700', 'color': '#191919' },
      'em': { 'font-style': 'italic' },
      'del': { 'text-decoration': 'line-through', 'color': '#999' },
      'a': { 'color': '#576b95', 'text-decoration': 'none', 'border-bottom': '1px solid #576b95' },
      'blockquote': { 'margin': '16px 0', 'padding': '12px 16px', 'border-left': '3px solid #07C160', 'background': '#f7f7f7', 'color': '#888', 'font-size': '15px' },
      'code': { 'background': '#fff5f5', 'color': '#ff502c', 'padding': '2px 6px', 'border-radius': '3px', 'font-size': '14px', 'font-family': "'Menlo','Monaco','Consolas',monospace" },
      'pre': { 'background': '#2b2b2b', 'border-radius': '6px', 'padding': '16px', 'margin': '16px 0', 'overflow': 'auto' },
      'ul': { 'margin': '10px 0', 'padding-left': '24px', 'font-size': '16px', 'line-height': '1.75', 'letter-spacing': '1px', 'color': '#333' },
      'ol': { 'margin': '10px 0', 'padding-left': '24px', 'font-size': '16px', 'line-height': '1.75', 'letter-spacing': '1px', 'color': '#333' },
      'li': { 'margin': '6px 0' },
      'img': { 'max-width': '100%', 'border-radius': '4px', 'margin': '12px 0' },
      'hr': { 'border': 'none', 'border-top': '1px solid #eee', 'margin': '24px 0' },
      'table': { 'width': '100%', 'border-collapse': 'collapse', 'margin': '16px 0', 'font-size': '15px' },
      'th': { 'border': '1px solid #eee', 'padding': '8px 12px', 'text-align': 'left', 'background': '#f7f7f7', 'font-weight': '600', 'color': '#191919' },
      'td': { 'border': '1px solid #eee', 'padding': '8px 12px', 'text-align': 'left' },
    };
  }

  return {
    'h1': { 'font-size': '24px', 'font-weight': '700', 'margin': '24px 0 16px', 'line-height': '1.4' },
    'h2': { 'font-size': '20px', 'font-weight': '700', 'margin': '20px 0 14px', 'line-height': '1.4' },
    'h3': { 'font-size': '18px', 'font-weight': '700', 'margin': '18px 0 12px', 'line-height': '1.4' },
    'p': { 'margin': '0 0 16px', 'font-size': '15px', 'line-height': '1.75' },
    'code': { 'background': '#f0f0f0', 'padding': '2px 6px', 'border-radius': '3px', 'font-size': '14px' },
    'pre': { 'background': '#f6f8fa', 'border-radius': '6px', 'padding': '16px', 'margin': '12px 0' },
    'blockquote': { 'margin': '16px 0', 'padding': '8px 16px', 'border-left': '4px solid #ddd', 'background': '#f9f9f9', 'color': '#666' },
    'img': { 'max-width': '100%', 'border-radius': '4px' },
    'hr': { 'border': 'none', 'border-top': '1px solid #ddd', 'margin': '24px 0' },
  };
}

function applyInlineStyles(
  container: HTMLElement,
  styleMap: Record<string, Record<string, string>>,
) {
  for (const [selector, styles] of Object.entries(styleMap)) {
    const elements = container.querySelectorAll(selector);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const existingStyle = htmlEl.getAttribute('style') || '';
      const newStyle = Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join('; ');
      htmlEl.setAttribute('style', existingStyle ? `${existingStyle}; ${newStyle}` : newStyle);
    });
  }
}

function cleanAttributes(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element);
  }
  elements.forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('id');
  });
}

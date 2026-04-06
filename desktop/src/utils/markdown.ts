import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRhype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { apiService } from '../services/api';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRhype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

function resolveMediaUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = apiService.baseURL.replace('/api', '');
  const clean = url.startsWith('./') ? url.slice(2) : url;
  if (clean.startsWith('articles/') || clean.startsWith('videos/')) {
    return `${base}/storage-files/${clean}`;
  }
  if (clean.startsWith('images/')) {
    return `${base}/storage-files/${clean}`;
  }
  return `${base}/${clean}`;
}

export async function renderMarkdown(md: string): Promise<string> {
  let processed = md;
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return _match;
    return `![${alt}](${resolveMediaUrl(url)})`;
  });
  processed = processed.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return _match;
    return `[${text}](${resolveMediaUrl(url)})`;
  });
  try {
    const result = await processor.process(processed);
    return String(result);
  } catch {
    return `<p>${processed.replace(/\n/g, '<br>')}</p>`;
  }
}

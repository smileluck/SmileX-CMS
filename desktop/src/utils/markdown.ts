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

function resolveMediaUrl(url: string, articleStoragePath?: string | null): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const base = apiService.baseURL.replace('/api', '');
  const token = localStorage.getItem('token');
  const withToken = (resolved: string) =>
    token ? `${resolved}${resolved.includes('?') ? '&' : '?'}token=${token}` : resolved;

  const clean = url.startsWith('./') ? url.slice(2) : url;

  // Article-relative path: ./images/xxx.png or images/xxx.png
  if (clean.startsWith('images/') && articleStoragePath) {
    return withToken(`${base}/storage-files/${articleStoragePath}/${clean}`);
  }

  // Old-format full paths: 1/articles/xxx/images/file.png (backward compat)
  if (clean.includes('/images/') || clean.startsWith('articles/') || clean.startsWith('videos/')) {
    return withToken(`${base}/storage-files/${clean}`);
  }

  // General media paths
  return withToken(`${base}/storage-files/${clean}`);
}

export async function renderMarkdown(md: string, articleStoragePath?: string | null): Promise<string> {
  let processed = md;
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return _match;
    return `![${alt}](${resolveMediaUrl(url, articleStoragePath)})`;
  });
  processed = processed.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return _match;
    return `[${text}](${resolveMediaUrl(url, articleStoragePath)})`;
  });
  try {
    const result = await processor.process(processed);
    return String(result);
  } catch {
    return `<p>${processed.replace(/\n/g, '<br>')}</p>`;
  }
}

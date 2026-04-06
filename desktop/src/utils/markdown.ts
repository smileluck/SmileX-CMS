import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { apiService } from '../services/api';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  let processed = md;
  processed = processed.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_match, alt, filename) => {
    const url = apiService.getMediaUrl(filename);
    return `![${alt}](${url})`;
  });
  processed = processed.replace(/(?<!!)\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_match, text, filename) => {
    const url = apiService.getMediaUrl(filename);
    return `[${text}](${url})`;
  });
  try {
    const result = await processor.process(processed);
    return String(result);
  } catch {
    return `<p>${processed.replace(/\n/g, '<br>')}</p>`;
  }
}

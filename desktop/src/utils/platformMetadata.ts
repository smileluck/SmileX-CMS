export interface PlatformMeta {
  images: string[];
}

const BLOCK_REGEX = (platform: string) =>
  new RegExp(`^:::${platform}\\s*\\n([\\s\\S]*?)\\n:::\\s*$`, 'm');

function parseBlockContent(text: string): PlatformMeta {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key === 'images') {
      return { images: value ? value.split(',').map(s => s.trim()).filter(Boolean) : [] };
    }
  }
  return { images: [] };
}

function serializeBlock(platform: string, meta: PlatformMeta): string {
  const lines: string[] = [`:::${platform}`];
  lines.push(`images: ${meta.images.join(', ')}`);
  lines.push(':::');
  return lines.join('\n');
}

export function extractPlatformMeta(content: string, platform: string): PlatformMeta {
  const regex = BLOCK_REGEX(platform);
  const match = content.match(regex);
  if (!match) return { images: [] };
  return parseBlockContent(match[1]);
}

export function setPlatformMeta(
  content: string,
  platform: string,
  meta: PlatformMeta,
): string {
  const regex = BLOCK_REGEX(platform);
  const stripped = content.replace(regex, '').trim();

  if (meta.images.length === 0) {
    return stripped;
  }

  return serializeBlock(platform, meta) + '\n\n' + stripped;
}

export function removePlatformMeta(content: string, platform: string): string {
  const regex = BLOCK_REGEX(platform);
  return content.replace(regex, '').trim();
}

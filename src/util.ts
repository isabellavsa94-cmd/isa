import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Ref } from './supabase.js';

const DIACRITICS = /[̀-ͯ]/g;

export function slugify(input: string, max = 60): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'untitled';
}

export function refToMarkdown(ref: Ref, collectionName?: string): string {
  const frontmatter = [
    '---',
    `id: ${ref.id}`,
    ref.url ? `url: ${ref.url}` : null,
    ref.title ? `title: ${JSON.stringify(ref.title)}` : null,
    collectionName ? `collection: ${collectionName}` : null,
    `type: ${ref.type}`,
    ref.tags.length ? `tags: [${ref.tags.join(', ')}]` : null,
    `created_at: ${ref.created_at}`,
    '---',
  ].filter(Boolean).join('\n');

  const parts = [frontmatter, ''];
  if (ref.title) parts.push(`# ${ref.title}`, '');
  if (ref.content) parts.push(ref.content, '');
  if (ref.notes) parts.push('## Notes', '', ref.notes, '');
  return parts.join('\n');
}

export async function writeRefFile(
  outDir: string,
  ref: Ref,
  collectionName?: string,
): Promise<string> {
  const folder = collectionName ? join(outDir, slugify(collectionName)) : outDir;
  const fileName = `${slugify(ref.title ?? ref.id)}-${ref.id.slice(0, 8)}.md`;
  const fullPath = join(folder, fileName);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, refToMarkdown(ref, collectionName), 'utf8');
  return fullPath;
}

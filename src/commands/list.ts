import chalk from 'chalk';
import { supabase, type Ref } from '../supabase.js';

export type ListOpts = {
  collection?: string;
  tag?: string;
  limit?: number;
};

export async function listRefs(opts: ListOpts): Promise<void> {
  let query = supabase
    .from('refs')
    .select('*, collections(name)')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.collection) {
    const { data: col } = await supabase
      .from('collections')
      .select('id')
      .eq('name', opts.collection)
      .maybeSingle();
    if (!col) {
      console.error(chalk.red(`Collection "${opts.collection}" not found`));
      process.exit(1);
    }
    query = query.eq('collection_id', col.id);
  }

  if (opts.tag) {
    query = query.contains('tags', [opts.tag]);
  }

  const { data, error } = await query;
  if (error) throw error;

  const refs = (data ?? []) as (Ref & { collections: { name: string } | null })[];
  if (!refs.length) {
    console.log(chalk.gray('No refs match those filters.'));
    return;
  }

  for (const r of refs) {
    const when = new Date(r.created_at).toISOString().slice(0, 10);
    const col = r.collections?.name ?? '—';
    const title = r.title ?? r.url ?? r.id;
    const tags = r.tags.length ? chalk.gray(` [${r.tags.join(', ')}]`) : '';
    console.log(
      `${chalk.gray(when)}  ${chalk.cyan(col.padEnd(14))}  ${chalk.bold(title)}${tags}`,
    );
    if (r.url && r.url !== title) console.log(`  ${chalk.gray(r.url)}`);
  }
}

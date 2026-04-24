import chalk from 'chalk';
import { supabase, type Ref } from '../supabase.js';
import { writeRefFile } from '../util.js';

export type PullOpts = {
  collection?: string;
  tag?: string;
  out: string;
  limit?: number;
};

export async function pullRefs(opts: PullOpts): Promise<void> {
  let collectionName: string | undefined;
  let collectionId: string | undefined;

  if (opts.collection) {
    const { data: col, error } = await supabase
      .from('collections')
      .select('id, name')
      .eq('name', opts.collection)
      .maybeSingle();
    if (error) throw error;
    if (!col) {
      console.error(chalk.red(`Collection "${opts.collection}" not found`));
      process.exit(1);
    }
    collectionName = col.name;
    collectionId = col.id;
  }

  let query = supabase
    .from('refs')
    .select('*, collections(name)')
    .order('created_at', { ascending: false });

  if (collectionId) query = query.eq('collection_id', collectionId);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;

  const refs = (data ?? []) as (Ref & { collections: { name: string } | null })[];
  if (!refs.length) {
    console.log(chalk.gray('Nothing to pull.'));
    return;
  }

  let written = 0;
  for (const r of refs) {
    const colName = r.collections?.name ?? collectionName ?? 'inbox';
    const path = await writeRefFile(opts.out, r, colName);
    console.log(chalk.gray(`  ${path}`));
    written++;
  }
  console.log(chalk.green(`Pulled ${written} ref${written === 1 ? '' : 's'} to ${opts.out}`));
}

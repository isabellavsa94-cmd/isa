import chalk from 'chalk';
import { supabase, type Ref } from '../supabase.js';
import { writeRefFile } from '../util.js';

export type SearchOpts = {
  query: string;
  out?: string;
  limit?: number;
};

export async function searchRefs(opts: SearchOpts): Promise<void> {
  const pattern = `%${opts.query}%`;
  const { data, error } = await supabase
    .from('refs')
    .select('*, collections(name)')
    .or(`title.ilike.${pattern},content.ilike.${pattern},notes.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) throw error;

  const refs = (data ?? []) as (Ref & { collections: { name: string } | null })[];
  if (!refs.length) {
    console.log(chalk.gray(`No refs match "${opts.query}".`));
    return;
  }

  console.log(chalk.bold(`${refs.length} match${refs.length === 1 ? '' : 'es'}:`));
  for (const r of refs) {
    const title = r.title ?? r.url ?? r.id;
    const col = r.collections?.name ?? '—';
    console.log(`  ${chalk.cyan(col)}  ${chalk.bold(title)}`);
  }

  if (opts.out) {
    console.log('');
    for (const r of refs) {
      const colName = r.collections?.name ?? 'inbox';
      const path = await writeRefFile(opts.out, r, colName);
      console.log(chalk.gray(`  ${path}`));
    }
    console.log(chalk.green(`Pulled ${refs.length} ref${refs.length === 1 ? '' : 's'} to ${opts.out}`));
  }
}

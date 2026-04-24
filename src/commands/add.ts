import chalk from 'chalk';
import { supabase } from '../supabase.js';

export type AddOpts = {
  title?: string;
  url?: string;
  collection?: string;
  tags?: string[];
  notes?: string;
  type?: 'page' | 'selection' | 'image' | 'video' | 'note';
  content?: string;
};

export async function addRef(opts: AddOpts): Promise<void> {
  let collection_id: string | null = null;
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
    collection_id = col.id;
  }

  const { data, error } = await supabase
    .from('refs')
    .insert({
      title: opts.title ?? null,
      url: opts.url ?? null,
      content: opts.content ?? null,
      notes: opts.notes ?? null,
      tags: opts.tags ?? [],
      type: opts.type ?? 'note',
      collection_id,
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(chalk.green(`Added ref ${data.id}`));
}

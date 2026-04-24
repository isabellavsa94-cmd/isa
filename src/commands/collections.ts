import chalk from 'chalk';
import { supabase, type Collection } from '../supabase.js';

export async function listCollections(): Promise<void> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('name');

  if (error) throw error;

  const collections = (data ?? []) as Collection[];
  if (!collections.length) {
    console.log(chalk.gray('No collections yet. Create one in Supabase or via the extension.'));
    return;
  }

  for (const c of collections) {
    const { count } = await supabase
      .from('refs')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', c.id);
    console.log(
      `${chalk.cyan(c.name)} ${chalk.gray(`(${count ?? 0})`)}` +
        (c.description ? `  ${chalk.gray(c.description)}` : ''),
    );
  }
}

export async function createCollection(name: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .insert({ name, description: description ?? null });
  if (error) throw error;
  console.log(chalk.green(`Created collection "${name}"`));
}

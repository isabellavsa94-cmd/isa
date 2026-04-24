import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import chalk from 'chalk';

config();

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error(chalk.red('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env'));
    console.error(chalk.gray('Copy .env.example to .env and fill in your Supabase credentials.'));
    process.exit(1);
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === 'function' ? (value as Function).bind(c) : value;
  },
});

export type Ref = {
  id: string;
  collection_id: string | null;
  url: string | null;
  title: string | null;
  content: string | null;
  type: 'page' | 'selection' | 'image' | 'video' | 'note';
  tags: string[];
  notes: string | null;
  media_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

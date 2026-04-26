import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { PromptsView } from './PromptsView';
import type { Prompt } from '@/lib/types';

export default async function PromptsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  const prompts = (data ?? []) as Prompt[];

  return (
    <div className="flex">
      <Sidebar activeSection="prompts" />
      <PromptsView initialPrompts={prompts} />
    </div>
  );
}

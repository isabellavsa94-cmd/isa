import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { BriefingsView } from './BriefingsView';
import type { Briefing } from '@/lib/types';

export default async function BriefingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('briefings')
    .select('*')
    .order('created_at', { ascending: false });

  const briefings = (data ?? []) as Briefing[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeSection="briefings" />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <BriefingsView briefings={briefings} />
      </main>
    </div>
  );
}

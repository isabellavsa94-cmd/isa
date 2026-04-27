import { createClient } from '@/lib/supabase/server';
import { BriefingsView } from './BriefingsView';
import type { Briefing, Client } from '@/lib/types';

export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientId } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientsData }, { data: briefingsData }] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: true }),
    supabase
      .from('briefings')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const clients = (clientsData ?? []) as Client[];
  const allBriefings = (briefingsData ?? []) as Briefing[];

  const activeClientId = clientId ?? clients[0]?.id ?? null;
  const briefings = activeClientId
    ? allBriefings.filter((b) => b.client_id === activeClientId)
    : allBriefings;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <BriefingsView
        key={activeClientId}
        briefings={briefings}
        clients={clients}
        activeClientId={activeClientId}
      />
    </div>
  );
}

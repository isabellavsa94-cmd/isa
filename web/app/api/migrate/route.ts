import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== 'migr8now') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const client = new Client({
    host: '2600:1f18:2e13:9d28:b8a3:912c:111e:7deb',
    port: 5432,
    user: 'postgres',
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    await client.query(`
      create table if not exists clients (
        id text primary key default gen_random_uuid()::text,
        name text not null,
        created_at timestamptz default now()
      );
    `);

    await client.query(`alter table clients enable row level security;`);

    await client.query(`
      do $$ begin
        if not exists (select 1 from pg_policies where tablename = 'clients' and policyname = 'authenticated users can read clients') then
          create policy "authenticated users can read clients" on clients for select to authenticated using (true);
        end if;
      end $$;
    `);

    await client.query(`
      do $$ begin
        if not exists (select 1 from pg_policies where tablename = 'clients' and policyname = 'authenticated users can insert clients') then
          create policy "authenticated users can insert clients" on clients for insert to authenticated with check (true);
        end if;
      end $$;
    `);

    await client.query(`
      do $$ begin
        if not exists (select 1 from pg_policies where tablename = 'clients' and policyname = 'authenticated users can update clients') then
          create policy "authenticated users can update clients" on clients for update to authenticated using (true);
        end if;
      end $$;
    `);

    await client.query(`alter table briefings add column if not exists client_id text references clients(id);`);

    await client.query(`insert into clients (id, name) values ('reportei-flux', 'Reportei Flux') on conflict (id) do nothing;`);

    await client.query(`update briefings set client_id = 'reportei-flux' where client_id is null;`);

    await client.end();
    return NextResponse.json({ ok: true, message: 'Migration complete' });
  } catch (err: unknown) {
    await client.end().catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const SUPABASE_SETUP_SQL = `create extension if not exists pgcrypto;

create table if not exists analysis_history (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  result_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table analysis_history enable row level security;

create policy "Public read history"
on analysis_history
for select
using (true);

create policy "Public insert history"
on analysis_history
for insert
with check (true);`;

function createMockClient() {
  const builder = {
    insert: async () => ({ data: null, error: null }),
    select: () => builder,
    order: () => builder,
    limit: async () => ({ data: [], error: null }),
  };

  return {
    from: () => builder,
  };
}

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createMockClient();

if (!supabaseEnabled && import.meta.env.DEV) {
  console.warn(
    "[ToS Analyzer] Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env to enable persistent history."
  );
}

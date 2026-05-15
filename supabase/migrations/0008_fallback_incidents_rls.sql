-- Allow any authenticated user to read global fallback incidents
-- (system-level table, no per-user data, safe to expose to all brokers)
create policy "authenticated users can read fallback incidents"
  on public.fallback_incidents for select
  using (auth.role() = 'authenticated');

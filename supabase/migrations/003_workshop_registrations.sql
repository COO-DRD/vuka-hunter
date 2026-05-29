-- Workshop / webinar registrations
create table if not exists hunter_workshop_registrations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  company    text,
  role       text,
  created_at timestamptz default now()
);

create unique index if not exists hunter_workshop_registrations_email_idx
  on hunter_workshop_registrations (lower(email));

-- Admins only — no public reads or writes
alter table hunter_workshop_registrations enable row level security;

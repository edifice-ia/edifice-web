alter table public.pinterest_pins
add column if not exists review_status text not null default 'pending',
add column if not exists reviewed_at timestamptz,
add column if not exists reviewed_by text,
add column if not exists review_notes text;

alter table public.pinterest_pins
drop constraint if exists pinterest_pins_review_status_check;

alter table public.pinterest_pins
add constraint pinterest_pins_review_status_check
check (review_status in ('pending', 'approved', 'needs_revision', 'rejected'));

create index if not exists pinterest_pins_review_status_idx
on public.pinterest_pins (review_status);

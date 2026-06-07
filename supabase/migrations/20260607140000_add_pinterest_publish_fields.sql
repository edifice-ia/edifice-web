alter table public.pinterest_pins
add column if not exists pinterest_pin_id text,
add column if not exists last_error text;

create index if not exists pinterest_pins_pinterest_pin_id_idx
on public.pinterest_pins (pinterest_pin_id);

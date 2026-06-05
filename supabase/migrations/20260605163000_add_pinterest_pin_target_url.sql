alter table public.pinterest_pins
add column if not exists target_url text;

comment on column public.pinterest_pins.target_url is
'Destination du pin, preparee pour une future publication Pinterest.';

alter table public.pinterest_pins
add column if not exists suggested_board_id text,
add column if not exists suggested_board_name text,
add column if not exists board_suggestion_reason text,
add column if not exists board_suggestion_confidence text;

alter table public.pinterest_pins
drop constraint if exists pinterest_pins_board_suggestion_confidence_check;

alter table public.pinterest_pins
add constraint pinterest_pins_board_suggestion_confidence_check
check (
  board_suggestion_confidence is null
  or board_suggestion_confidence in ('eleve', 'moyen', 'faible')
);

create index if not exists pinterest_pins_suggested_board_id_idx
on public.pinterest_pins (suggested_board_id);

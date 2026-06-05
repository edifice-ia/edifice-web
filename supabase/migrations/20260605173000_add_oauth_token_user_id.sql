alter table public.oauth_tokens
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists oauth_tokens_user_id_idx
on public.oauth_tokens (user_id);

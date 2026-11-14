-- 하루하루 말씀카드 — Supabase 스키마 (무료 플랜용)
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행, 또는 MCP apply_migration
-- 사전 설정: Authentication > Sign In / Providers > "Allow anonymous sign-ins" 켜기
-- 원칙: 모든 테이블 RLS 사용. 친구 조회·요청·공유 집계는 security definer 함수로만 노출.

create extension if not exists pgcrypto;

-- 1) 프로필: 닉네임 + 친구 코드(헷갈리는 0/O/1/I 제외 6자리)
create or replace function public.gen_friend_code() returns text language plpgsql as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(chars, 1 + (get_byte(gen_random_bytes(1), 0) % 31), 1); end loop;
    exit when not exists (select 1 from public.profiles where friend_code = c);
  end loop;
  return c;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '성도' check (char_length(nickname) between 1 and 20),
  friend_code text not null unique check (friend_code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table if not exists public.meditations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_date date not null check (card_date between date '2000-01-01' and (now() at time zone 'Asia/Seoul')::date + 2),
  body text not null check (char_length(body) between 1 and 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_date)
);

create table if not exists public.share_events (
  id bigint generated always as identity primary key,
  card_date date not null check (card_date between date '2000-01-01' and (now() at time zone 'Asia/Seoul')::date + 2),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- 친구 코드 조회 시도 기록(성공·실패 모두) — 무차별 대입 제한용
create table if not exists public.friend_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists friend_attempts_user_idx on public.friend_attempts(user_id, created_at);
create index if not exists share_events_date_idx on public.share_events(card_date);
create index if not exists share_events_user_date_idx on public.share_events(user_id, card_date);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.meditations enable row level security;
alter table public.share_events enable row level security;
alter table public.friend_attempts enable row level security;

-- 친구 여부
create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where status = 'accepted'
    and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

-- RLS 정책
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- 친구 코드는 바꾸지 못하게
revoke update on public.profiles from authenticated, anon;
grant update (nickname) on public.profiles to authenticated;

drop policy if exists "own meditations" on public.meditations;
create policy "own meditations" on public.meditations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- friendships / share_events: 직접 접근 정책 없음 → 함수로만 접근

revoke all on public.friendships, public.share_events, public.friend_attempts from anon, authenticated;
revoke all on public.profiles, public.meditations from anon;

-- 2) 함수(RPC)
create or replace function public.ensure_profile() returns setof public.profiles
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  insert into profiles(id, friend_code) values (auth.uid(), gen_friend_code()) on conflict (id) do nothing;
  return query select * from profiles where id = auth.uid();
end $$;

create or replace function public.request_friend(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; begin
  if me is null then raise exception 'auth'; end if;
  if p_code !~ '^[A-Z2-9]{6}$' then raise exception 'bad_code'; end if;
  -- 무차별 대입 완화: 성공·실패 포함 하루 20회 제한 (시도 기록은 예외가 나도 남도록 먼저 커밋되는 구조가 아니므로 실패 시 'not_found' 대신 null 반환)
  if (select count(*) from friend_attempts where user_id = me and created_at > now() - interval '1 day') >= 20 then raise exception 'too_many'; end if;
  insert into friend_attempts(user_id) values (me);
  select id into other from profiles where friend_code = p_code;
  if other is null then return 'not_found'; end if;  -- 예외를 던지면 시도 기록이 롤백되므로 값으로 반환
  if other = me then return 'self'; end if;
  if exists (select 1 from friendships where requester = other and addressee = me) then
    update friendships set status = 'accepted' where requester = other and addressee = me;
    return 'accepted';
  end if;
  if exists (select 1 from friendships where requester = me and addressee = other) then return 'exists'; end if;
  insert into friendships(requester, addressee) values (me, other);
  return 'pending';
end $$;

create or replace function public.my_friends()
returns table(friend_id uuid, nickname text, status text, direction text)
language sql stable security definer set search_path = public as $$
  select case when f.requester = auth.uid() then f.addressee else f.requester end,
         p.nickname, f.status,
         case when f.requester = auth.uid() then 'outgoing' else 'incoming' end
  from friendships f
  join profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by p.nickname;
$$;

create or replace function public.accept_friend(p_other uuid) returns void
language sql security definer set search_path = public as $$
  update friendships set status = 'accepted' where requester = p_other and addressee = auth.uid();
$$;

create or replace function public.remove_friend(p_other uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships where (requester = auth.uid() and addressee = p_other) or (requester = p_other and addressee = auth.uid());
$$;

create or replace function public.friend_meditations(p_date date)
returns table(nickname text, body text)
language sql stable security definer set search_path = public as $$
  select p.nickname, m.body from meditations m join profiles p on p.id = m.user_id
  where m.card_date = p_date and m.user_id <> auth.uid() and are_friends(auth.uid(), m.user_id)
  order by m.updated_at desc limit 50;
$$;

create or replace function public.record_share(p_date date) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if p_date < date '2000-01-01' or p_date > (now() at time zone 'Asia/Seoul')::date + 1 then raise exception 'bad_date'; end if;
  if (select count(*) from share_events where user_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then raise exception 'too_many'; end if;
  insert into share_events(card_date, user_id) values (p_date, auth.uid());
  return (select count(distinct user_id) from share_events where card_date = p_date);
end $$;

create or replace function public.share_count(p_date date) returns bigint
language sql stable security definer set search_path = public as $$
  select count(distinct user_id) from share_events where card_date = p_date;  -- 공유한 사람 수
$$;

-- 묵상 저장량 제한: 사용자당 최대 1,500개(약 4년치)
create or replace function public.limit_meditations() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from meditations where user_id = new.user_id) >= 1500 then raise exception 'too_many'; end if;
  return new;
end $$;
drop trigger if exists meditations_limit on public.meditations;
create trigger meditations_limit before insert on public.meditations for each row execute function public.limit_meditations();

-- 계정·서버 기록 전체 삭제(profiles → cascade)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- 함수 실행 권한: 로그인(익명 포함) 사용자만
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.ensure_profile(), public.request_friend(text), public.my_friends(),
  public.accept_friend(uuid), public.remove_friend(uuid), public.friend_meditations(date),
  public.record_share(date), public.share_count(date), public.delete_my_account() to authenticated;

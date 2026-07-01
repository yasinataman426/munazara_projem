  -- Supabase Setup Script for Kürsü Debate Platform



  -- 2. Motions Table
  create table if not exists motions (
      id text primary key,
      text text unique not null,
      category text not null,
      info_slide text
  );

  -- 3. Rooms Table
  create table if not exists rooms (
      room_id text primary key,
      room_name text not null,
      status text not null,
      motion jsonb,
      is_motion_released boolean default false not null,
      are_spectator_votes_released boolean default false not null,
      prep_started_at bigint,
      active_speaker text,
      timer jsonb not null,
      active_poi jsonb,
      spectator_votes jsonb default '[]'::jsonb not null,
      result jsonb,
      participants jsonb default '{}'::jsonb not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );



  -- Insert Default Motions
  insert into motions (id, text, category, info_slide) values
  ('m1', 'Bu meclis yapay zeka gelişimini sınırlandırır.', 'Teknoloji', 'Yapay zeka modellerinin son yıllardaki logaritmik hızdaki gelişimi ve otomasyonun iş gücü piyasalarına etkisi göz önüne alınmalıdır.'),
  ('m2', 'Bu meclis sosyal medyanın anonim olmasını yasaklar.', 'Toplum & Teknoloji', 'Sosyal medya platformlarında kimlik doğrulaması zorunlu hale getirilerek sahte hesapların ve siber zorbalığın önüne geçilmesi amaçlanmaktadır.'),
  ('m3', 'Bu meclis tüm vergileri tek bir karbon vergisiyle değiştirir.', 'Ekonomi & Çevre', 'Mevcut gelir ve kurumlar vergisi gibi tüm dolaylı/dolaysız vergiler kaldırılarak sadece karbon salınımı üzerinden vergilendirme yapılacaktır.'),
  ('m4', 'Bu meclis yargıçların yerine yapay zeka karar vericilerinin kullanılmasını destekler.', 'Hukuk & Adalet', 'AI yargıç sistemleri, insan yargıçların sahip olabileceği bilinçaltı önyargılardan arındırılmış ve milyonlarca içtihadı anında analiz edebilen sistemlerdir.'),
  ('m5', 'Bu meclis asgari ücret uygulamasını kaldırıp evrensel temel geliri getirir.', 'Ekonomi', 'Her vatandaşa çalışıp çalışmadığına bakılmaksızın devlet tarafından düzenli ve koşulsuz bir asgari geçim ödeneği sağlanacaktır.')
  on conflict (id) do nothing;

  -- Insert Default Rooms
  insert into rooms (room_id, room_name, status, motion, is_motion_released, are_spectator_votes_released, prep_started_at, active_speaker, timer, active_poi, spectator_votes, result, participants) values
  (
    'r1', 
    'Uludağ Kupası - Yarı Final A', 
    'preparation', 
    '{"id": "m1", "text": "Bu meclis yapay zeka gelişimini sınırlandırır.", "category": "Teknoloji", "infoSlide": "Yapay zeka modellerinin son yıllardaki logaritmik hızdaki gelişimi ve otomasyonun iş gücü piyasalarına etkisi göz önüne alınmalıdır."}'::jsonb,
    false, 
    false, 
    1719230000000, -- simulated started at
    null,
    '{"status": "idle", "elapsedSeconds": 0, "startedAt": null, "pausedAt": null}'::jsonb,
    null,
    '[]'::jsonb,
    null,
    '{"p1": {"id": "p1", "username": "jury_ali", "role": "jury", "status": null, "joinedAt": 1719230000000, "isMuted": false}, "p2": {"id": "p2", "username": "deb_berk", "role": "debater", "status": "open", "joinedAt": 1719230000000, "isMuted": false}}'::jsonb
  ),
  (
    'r2', 
    'Ege Open Münazara Şampiyonası', 
    'lobby', 
    '{"id": "m3", "text": "Bu meclis tüm vergileri tek bir karbon vergisiyle değiştirir.", "category": "Ekonomi & Çevre", "infoSlide": "Mevcut gelir ve kurumlar vergisi gibi tüm dolaylı/dolaysız vergiler kaldırılarak sadece karbon salınımı üzerinden vergilendirme yapılacaktır."}'::jsonb,
    false, 
    false, 
    null,
    null,
    '{"status": "idle", "elapsedSeconds": 0, "startedAt": null, "pausedAt": null}'::jsonb,
    null,
    '[]'::jsonb,
    null,
    '{"p3": {"id": "p3", "username": "jury_ayse", "role": "jury", "status": null, "joinedAt": 1719230000000, "isMuted": false}}'::jsonb
  ),
  (
    'r3', 
    'Kürsü Haftalık Gösteri Maçı', 
    'debate', 
    '{"id": "m4", "text": "Bu meclis yargıçların yerine yapay zeka karar vericilerinin kullanılmasını destekler.", "category": "Hukuk & Adalet", "infoSlide": "AI yargıç sistemleri, insan yargıçların sahip olabileceği bilinçaltı önyargılardan arındırılmış ve milyonlarca içtihadı anında analiz edebilen sistemlerdir."}'::jsonb,
    true, 
    false, 
    null,
    'PM',
    '{"status": "idle", "elapsedSeconds": 240, "startedAt": null, "pausedAt": null}'::jsonb,
    null,
    '[{"userId": "u100", "username": "spectator_can", "team": "HA", "timestamp": 1719230000000}]'::jsonb,
    null,
    '{"p4": {"id": "p4", "username": "jury_mehmet", "role": "jury", "status": null, "joinedAt": 1719230000000, "isMuted": false}}'::jsonb
  )
  on conflict (room_id) do nothing;



-- 5. Disable RLS (Row Level Security) for frontend demo access

alter table motions disable row level security;
alter table rooms disable row level security;

-- 6. Add created_at migration for existing database schemas
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 7. Admin RPC Functions
create or replace function get_users()
returns table (
  id uuid,
  email varchar,
  username varchar,
  full_name varchar,
  phone_number varchar,
  role varchar,
  status varchar,
  city varchar,
  age integer,
  school varchar,
  created_at timestamptz
) security definer
as $$
begin
  if (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' then
    raise exception 'Unauthorized';
  end if;
  return query select 
    au.id, 
    au.email::varchar, 
    (au.raw_user_meta_data->>'username')::varchar,
    (au.raw_user_meta_data->>'fullName')::varchar,
    (au.raw_user_meta_data->>'phoneNumber')::varchar,
    (au.raw_user_meta_data->>'role')::varchar,
    (au.raw_user_meta_data->>'status')::varchar,
    (au.raw_user_meta_data->>'city')::varchar,
    cast(au.raw_user_meta_data->>'age' as integer),
    (au.raw_user_meta_data->>'school')::varchar,
    au.created_at
  from auth.users au
  order by au.created_at desc;
end;
$$ language plpgsql;

create or replace function set_user_role(target_user_id uuid, new_role text, new_status text)
returns void
security definer
as $$
begin
  if (auth.jwt() -> 'user_metadata' ->> 'role') != 'admin' then
    raise exception 'Unauthorized';
  end if;
  
  if new_status is null then
    update auth.users
    set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', to_jsonb(new_role)) - 'status'
    where id = target_user_id;
  else
    update auth.users
    set raw_user_meta_data = jsonb_set(jsonb_set(raw_user_meta_data, '{role}', to_jsonb(new_role)), '{status}', to_jsonb(new_status))
    where id = target_user_id;
  end if;
end;
$$ language plpgsql;

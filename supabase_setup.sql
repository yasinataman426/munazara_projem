  -- Supabase Setup Script for Kürsü Debate Platform

  -- 1. Users Table
  create table if not exists users (
      id text primary key,
      username text unique not null,
      full_name text not null,
      phone_number text not null,
      email text unique not null,
      password text,
      city text not null,
      age integer not null,
      school text not null,
      role text not null check (role in ('admin', 'jury', 'debater', 'spectator')),
      status text check (status in ('rookie', 'open', null)),
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

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

  -- 4. Insert Default Users
  insert into users (id, username, full_name, phone_number, email, password, city, age, school, role, status, created_at) values
  ('p1', 'jury_ali', 'Ali Yılmaz', '0555 111 2233', 'jury_ali@kursumunazara.com', 'password123', 'Ankara', 35, 'Orta Doğu Teknik Üniversitesi', 'jury', null, now()),
  ('p2', 'deb_berk', 'Berk Can', '0555 222 3344', 'deb_berk@kursumunazara.com', 'password123', 'İzmir', 21, 'Ege Üniversitesi', 'debater', 'open', now()),
  ('p3', 'jury_ayse', 'Ayşe Demir', '0555 333 4455', 'jury_ayse@kursumunazara.com', 'password123', 'İstanbul', 29, 'Boğaziçi Üniversitesi', 'jury', null, now()),
  ('p4', 'jury_mehmet', 'Mehmet Öz', '0555 444 5566', 'jury_mehmet@kursumunazara.com', 'password123', 'Bursa', 32, 'Uludağ Üniversitesi', 'jury', null, now())
  on conflict (id) do nothing;

-- 5. Disable RLS (Row Level Security) for frontend demo access
alter table users disable row level security;
alter table motions disable row level security;
alter table rooms disable row level security;

-- 6. Add created_at migration for existing database schemas
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default timezone('utc'::text, now()) not null;




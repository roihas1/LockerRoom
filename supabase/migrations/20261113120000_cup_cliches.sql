-- Cup clichés: curated quotes + fan submissions (pending until admin approves).
-- Public reads/writes go through security definer RPCs so device_id stays private.
-- Admin moderates via session client + is_admin() RLS.

create table public.cup_cliches (
  id bigint generated always as identity primary key,
  body text not null,
  said_by text not null,
  weight integer not null default 80 check (weight between 1 and 100),
  verified boolean not null default false,
  said_on text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  device_id uuid,
  created_at timestamptz not null default now(),
  constraint cup_cliches_body_len check (char_length(body) between 2 and 120),
  constraint cup_cliches_said_by_len check (char_length(said_by) between 2 and 120),
  constraint cup_cliches_body_unique unique (body)
);

create index cup_cliches_status_weight on public.cup_cliches (status, weight desc);
create index cup_cliches_device_recent on public.cup_cliches (device_id, created_at) where device_id is not null;
create index cup_cliches_pending on public.cup_cliches (created_at desc) where status = 'pending';

alter table public.cup_cliches enable row level security;
revoke all on public.cup_cliches from anon, authenticated;
grant select, update, delete on public.cup_cliches to authenticated;

create policy cup_cliches_admin_select on public.cup_cliches
  for select to authenticated using ((select public.is_admin()));
create policy cup_cliches_admin_update on public.cup_cliches
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cup_cliches_admin_delete on public.cup_cliches
  for delete to authenticated using ((select public.is_admin()));

create or replace function public.list_approved_cup_cliches()
returns table (id bigint, body text, said_by text, weight integer, verified boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.body, c.said_by, c.weight, c.verified
  from public.cup_cliches c
  where c.status = 'approved'
  order by c.id;
$$;

create or replace function public.submit_cup_cliche(
  p_body text,
  p_said_by text,
  p_weight integer,
  p_device_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  cleaned_body text;
  cleaned_said text;
  new_id bigint;
begin
  cleaned_body := trim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'));
  cleaned_said := trim(regexp_replace(coalesce(p_said_by, ''), '\s+', ' ', 'g'));

  if char_length(cleaned_body) < 2 or char_length(cleaned_body) > 120 then
    raise exception 'invalid body' using errcode = '22023';
  end if;
  if char_length(cleaned_said) < 2 or char_length(cleaned_said) > 120 then
    raise exception 'invalid said_by' using errcode = '22023';
  end if;
  if p_weight not in (60, 80, 100) then
    raise exception 'invalid weight' using errcode = '22023';
  end if;
  if cleaned_body ~ '[<>]' or cleaned_said ~ '[<>]' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;
  if cleaned_body ~* 'https?://|www\.|@|#|javascript:' or cleaned_said ~* 'https?://|www\.|javascript:' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;

  select count(*) into recent
  from public.cup_cliches
  where device_id = p_device_id and created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into public.cup_cliches (body, said_by, weight, verified, status, device_id)
  values (cleaned_body, cleaned_said, p_weight, false, 'pending', p_device_id)
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    raise exception 'duplicate' using errcode = '23505';
end;
$$;

revoke all on function public.list_approved_cup_cliches() from public;
revoke all on function public.submit_cup_cliche(text, text, integer, uuid) from public;
grant execute on function public.list_approved_cup_cliches() to anon, authenticated;
grant execute on function public.submit_cup_cliche(text, text, integer, uuid) to anon, authenticated;

-- Allow admin push topic (fan topics stay the same; fan UI never offers admin).
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_topics_valid;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_valid
  check (topics <@ array['games', 'live', 'plays', 'feed', 'admin']::text[]);

insert into public.cup_cliches (body, said_by, weight, verified, said_on, source_url, status)
values
  ('לגביע חוקים משלו', 'קלישאת הספורט הישראלית הקלאסית', 100, true, null, 'https://www.one.co.il/Opinion/111134.html', 'approved'),
  ('במשחק אחד הכל יכול לקרות', 'אסי בלדוט, קפטן בני יהודה', 100, true, '2010-05', 'https://sports.walla.co.il/item/1673159', 'approved'),
  ('אנחנו באים לנצח, נקודה', 'גיא לוזון, מאמן בני יהודה', 98, true, '2010-05', 'https://sports.walla.co.il/item/1673159', 'approved'),
  ('אין תירוצים להפסד', 'גיא לוזון, מאמן בני יהודה', 96, true, '2010-05', 'https://sports.walla.co.il/item/1673159', 'approved'),
  ('אלה רגעים שחייבים לנצל', 'אלי גוטמן', 94, true, '2010-05', 'https://sports.walla.co.il/item/1673159', 'approved'),
  ('אולי חיפה פייבוריטית, אבל לא הייתי מספיד אותנו', 'אלי גוטמן, מאמן הפועל תל אביב', 96, true, '2011-05-24', 'https://sports.walla.co.il/item/1826293', 'approved'),
  ('אם נזכה בדאבל, ניזכר כאחת הקבוצות הגדולות של המועדון', 'אלישע לוי, מאמן מכבי חיפה', 84, true, '2011-05-24', 'https://sports.walla.co.il/item/1826293', 'approved'),
  ('אם אתה בא מוכן, הכל יכול להיות', 'מוטי איווניר, מאמן הפועל נוף הגליל', 98, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('זה עולם אחר מלאמן ולשחק בגמר', 'מוטי איווניר', 78, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('אנחנו לא יודעים מתי נגיע שוב למעמד כזה', 'מוטי איווניר', 85, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('עצם ההגעה למעמד היא הישג, אבל אנחנו לא מסתפקים בזה', 'בן שהר, מכבי פתח תקווה', 87, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('נצטרך לעבוד קשה מאוד בכדי להשיג את זה', 'בן שהר', 84, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('לא מקלים ראש לקראת משחק מאוד קשה', 'רן קוז''וך, מאמן מכבי פתח תקווה', 88, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('גביע זה מפעל שמעניק הזדמנות שווה לכולם', 'עודד קטש, מאמן מכבי תל אביב', 95, true, '2024-05-15', 'https://ibasketball.co.il/news/2024/05/', 'approved'),
  ('אנחנו צריכים לשמוח שאנחנו זוכים לשחק במעמד כזה', 'עודד קטש', 85, true, '2024-05-15', 'https://ibasketball.co.il/news/2024/05/', 'approved'),
  ('אוי ואבוי אם מישהו מאיתנו יחשוב על המילים בלתי אפשרי', 'יהוא אורלנד, מאמן בני הרצליה', 91, true, '2026-03', 'https://www.ynet.co.il/sport/israelibasketball/article/s16bykxo11e', 'approved'),
  ('כל מאמן מאמין בקבוצה שלו', 'יהוא אורלנד', 91, true, '2026-03', 'https://www.ynet.co.il/sport/israelibasketball/article/s16bykxo11e', 'approved'),
  ('יש לנו רק מה להרוויח מהמשחק הזה', 'עודד קטש', 96, true, '2026-03', 'https://www.ynet.co.il/sport/israelibasketball/article/s16bykxo11e', 'approved'),
  ('התחושות טובות, התרגשות לקראת המשחק', 'יבגני ברגמן, קפטן הפועל נוף הגליל', 82, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('נעשה הכל בשביל לעלות לגמר', 'יבגני ברגמן', 96, true, '2024-04-29', 'https://www.sport5.co.il/articles.aspx?DocId=468707', 'approved'),
  ('אמא, הבאתי גביע!', 'פיני גרשון', 100, true, '1996', 'https://www.ynet.co.il/sport/article/one396884', 'approved'),
  ('דובון כמוני אוהב קצפת, אבל אני כל כך רוצה את הדובדבן', 'פיני גרשון', 85, true, '1993-05-06', 'https://he.wikiquote.org/wiki/פיני_גרשון', 'approved'),
  ('אנחנו צריכים להיות עיוורים, פיסחים וחרשים כדי לא לזכות באליפות', 'פיני גרשון', 72, true, '1993', 'https://he.wikiquote.org/wiki/פיני_גרשון', 'approved'),
  ('המאמן תמיד צודק, גם כשהוא לא צודק', 'שלמה שרף', 95, true, '1998', 'https://he.wikiquote.org/wiki/שלמה_שרף', 'approved'),
  ('השפיץ של הנעל', 'שלמה שרף', 87, true, null, 'https://he.wikiquote.org/wiki/שלמה_שרף', 'approved'),
  ('מה שחשוב במשחקי הגביע זו לא הדרך. חשובה התוצאה. וזה מה שחשוב', 'שלמה שרף', 100, true, '2011', 'https://he.wikiquote.org/wiki/שלמה_שרף', 'approved'),
  ('איזו הפתעה, איזו הפתעה, איזו הפתעה. אבל תשמע, זאת לא הפתעה', 'שלמה שרף, בפרשנות להדחה מפתיעה בגביע', 93, true, '2008-02-27', 'https://he.wikiquote.org/wiki/שלמה_שרף', 'approved'),
  ('אנחנו לא באים לשמש תפאורה', 'קלישאת האנדרדוג', 98, false, null, null, 'approved'),
  ('אין פייבוריטית בגביע', 'כל פרשן לפני הגרלת הגביע', 100, false, null, null, 'approved'),
  ('אנחנו באים לתת 200 אחוז', 'כל שחקן ישראלי לפני משחק', 99, false, null, null, 'approved'),
  ('הקהל יהיה השחקן ה-12 שלנו', 'כל קפטן לפני משחק בית', 95, false, null, null, 'approved'),
  ('צריך לבוא עם סכין בין השיניים', 'קלישאת חדר ההלבשה', 95, false, null, null, 'approved'),
  ('אנחנו מתייחסים למשחק הזה כמו לגמר', 'כל מאמן לפני משחק גביע', 94, false, null, null, 'approved'),
  ('הכל תלוי בנו', 'כל מאמן לפני משחק', 93, false, null, null, 'approved'),
  ('מי שרוצה יותר, ינצח', 'קלישאת מאמנים', 92, false, null, null, 'approved'),
  ('אנחנו באים צנועים אבל מאמינים בעצמנו', 'כל אנדרדוג לפני משחק', 90, false, null, null, 'approved'),
  ('המשחק הזה יוכרע על הפרטים הקטנים', 'כל פרשן ספורט', 90, false, null, null, 'approved'),
  ('צריך לבוא מרוכזים מהדקה הראשונה', 'כל מאמן בישראל', 89, false, null, null, 'approved'),
  ('אנחנו לא מפחדים מאף קבוצה', 'כל מאמן אנדרדוג', 88, false, null, null, 'approved'),
  ('אין לנו מה להפסיד', 'כל קבוצה קטנה לפני משחק מול הגדולות', 88, false, null, null, 'approved'),
  ('אנחנו באים לעשות היסטוריה', 'כל קבוצה קטנה לפני חצי גמר', 87, false, null, null, 'approved'),
  ('הגביע הוא תואר בפני עצמו', 'כל מנהל מקצועי', 85, false, null, null, 'approved'),
  ('בגביע אין הזדמנות שנייה', 'כל פרשן', 85, false, null, null, 'approved'),
  ('צריך לדעת לנצח גם משחקים מכוערים', 'כל מאמן', 83, false, null, null, 'approved'),
  ('ההגנה מנצחת משחקים', 'כל מאמן כדורסל', 82, false, null, null, 'approved'),
  ('אנחנו צריכים להכתיב את הקצב', 'כל מאמן כדורסל', 81, false, null, null, 'approved'),
  ('הראש כבר במשחק הבא', 'כל מאמן אחרי הדחה', 80, false, null, null, 'approved'),
  ('עשינו את כל ההכנות, עכשיו צריך לבצע', 'כל מאמן לפני משחק', 78, false, null, null, 'approved'),
  ('הגענו עד לכאן בזכות ולא בחסד', 'כל אנדרדוג לפני גמר', 77, false, null, null, 'approved'),
  ('הכדור לא נכנס, זה חלק מהמשחק', 'כל מאמן אחרי הפסד', 75, false, null, null, 'approved'),
  ('היו לנו את המצבים, הכדור פשוט לא נכנס', 'כל מאמן אחרי הדחה', 75, false, null, null, 'approved'),
  ('אנחנו יוצאים עם הרבה דברים חיוביים מהמשחק', 'כל מאמן אחרי הפסד', 72, false, null, null, 'approved'),
  ('בסוף זוכרים רק את התוצאה', 'קלישאת מאמנים', 70, false, null, null, 'approved'),
  ('הכל בראש', 'כל מאמן אחרי הפסד', 68, false, null, null, 'approved'),
  ('לא באנו עד לכאן כדי לעצור עכשיו', 'כל קפטן לפני גמר', 65, false, null, null, 'approved')
on conflict (body) do nothing;

-- Announcer-style introduction and a short hashtag shown next to the player's name.

alter table public.players
  add column intro text check (char_length(intro) <= 160),
  add column hashtag text check (char_length(hashtag) <= 30 and hashtag !~ '[\s#]');

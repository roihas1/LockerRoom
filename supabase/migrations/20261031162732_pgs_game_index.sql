-- Speeds up box score / live reads that filter player_game_stats by game_id.
-- Unique (game_id, player_id) already exists; a leading game_id index serves WHERE game_id = ?.
create index pgs_game on public.player_game_stats (game_id);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE,
  password_hash text,
  is_guest      boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE player_scores (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_score integer NOT NULL DEFAULT 0 CHECK (current_score >= 0),
  best_score    integer NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_scores_best ON player_scores (best_score DESC);

CREATE TABLE rounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_move text NOT NULL,
  bot_move    text NOT NULL,
  result      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rounds_user_created ON rounds (user_id, created_at);
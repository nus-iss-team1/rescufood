ALTER TABLE users ADD COLUMN username text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX users_username_uq ON users (lower(username)) WHERE username <> '';

CREATE TABLE login_restrictions (
    username     text PRIMARY KEY,
    failed_count integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

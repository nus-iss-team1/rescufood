CREATE TYPE org_type AS ENUM ('donor', 'rescue_partner');
CREATE TYPE org_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE organisations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL UNIQUE,
    type          org_type NOT NULL,
    status        org_status NOT NULL DEFAULT 'pending',
    description   text NOT NULL DEFAULT '',
    contact_email text NOT NULL,
    contact_phone text NOT NULL DEFAULT '',
    address       text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub text NOT NULL UNIQUE,
    email       text NOT NULL,
    name        text NOT NULL DEFAULT '',
    org_id      uuid REFERENCES organisations(id),
    is_admin    boolean NOT NULL DEFAULT false,
    status      text NOT NULL DEFAULT 'active',
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organisations_status_idx ON organisations (status);
CREATE INDEX users_org_id_idx ON users (org_id);

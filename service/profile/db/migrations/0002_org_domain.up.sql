ALTER TABLE organisations ADD COLUMN domain text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX organisations_domain_uq ON organisations (domain) WHERE domain <> '';

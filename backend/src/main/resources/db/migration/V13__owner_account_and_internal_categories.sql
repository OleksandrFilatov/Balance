CREATE TABLE owner_account (
 id smallint PRIMARY KEY CHECK(id=1),
 username varchar(100) NOT NULL CHECK(length(btrim(username))>0),
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE categories ADD COLUMN internal boolean NOT NULL DEFAULT false;

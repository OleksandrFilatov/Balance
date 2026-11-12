-- Display names are preferences. Existing shares, payments and income stay unchanged.
CREATE TABLE household_profile (
    id boolean PRIMARY KEY CHECK (id),
    first_name varchar(60),
    partner_name varchar(60),
    version bigint NOT NULL DEFAULT 0
);
INSERT INTO household_profile(id) VALUES (true);

-- Existing manual salaries remain authoritative until automatic income is explicitly selected.
ALTER TABLE household_monthly_income ADD COLUMN mine_source varchar(8) NOT NULL DEFAULT 'MANUAL'
 CHECK(mine_source IN ('MANUAL','SHIFTS'));

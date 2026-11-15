ALTER TABLE savings_goals ADD COLUMN plan_from_date date;
ALTER TABLE savings_goals ADD COLUMN plan_reserved_baseline numeric NOT NULL DEFAULT 0 CHECK (plan_reserved_baseline >= 0);
UPDATE savings_goals SET plan_from_date=start_date;
ALTER TABLE savings_goals ALTER COLUMN plan_from_date SET NOT NULL;

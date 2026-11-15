ALTER TABLE savings_goals ADD COLUMN start_date date;
UPDATE savings_goals SET start_date = LEAST((created_at AT TIME ZONE 'Europe/Berlin')::date, COALESCE(deadline,(created_at AT TIME ZONE 'Europe/Berlin')::date));
ALTER TABLE savings_goals ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE savings_goals ADD CONSTRAINT savings_goal_dates CHECK (deadline IS NULL OR deadline >= start_date);

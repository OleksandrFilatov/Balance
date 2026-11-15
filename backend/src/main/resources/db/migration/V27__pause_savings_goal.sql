ALTER TABLE savings_goals DROP CONSTRAINT savings_goals_status_check;
ALTER TABLE savings_goals ADD CONSTRAINT savings_goals_status_check CHECK (status IN ('ACTIVE','PAUSED','ACHIEVED','ARCHIVED'));

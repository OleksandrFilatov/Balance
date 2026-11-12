CREATE TABLE savings_goals (
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, description varchar(2000) NOT NULL,
 target numeric(19,2) NOT NULL CHECK(target>0 AND target<>'NaN'::numeric),
 currency varchar(3) NOT NULL CHECK(currency='EUR'), deadline date,
 monthly_plan numeric(19,2) NOT NULL CHECK(monthly_plan>=0 AND monthly_plan<>'NaN'::numeric),
 status varchar(20) NOT NULL CHECK(status IN ('ACTIVE','ACHIEVED','ARCHIVED')),
 created_at timestamptz NOT NULL, deleted boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 0
);
CREATE TABLE savings_commands (id uuid PRIMARY KEY, fingerprint text NOT NULL);
CREATE TABLE savings_entries (
 id uuid PRIMARY KEY, goal_id uuid NOT NULL REFERENCES savings_goals(id) ON DELETE RESTRICT,
 account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
 amount numeric(19,2) NOT NULL CHECK(amount<>'NaN'::numeric),
 action varchar(30) NOT NULL, note varchar(2000) NOT NULL,
 created_at timestamptz NOT NULL, command_id uuid REFERENCES savings_commands(id),
 CHECK ((account_id IS NULL AND amount=0) OR account_id IS NOT NULL)
);
CREATE INDEX savings_entries_goal_date ON savings_entries(goal_id,created_at DESC,id);
CREATE INDEX savings_entries_account ON savings_entries(account_id);
CREATE INDEX savings_goals_status ON savings_goals(status) WHERE NOT deleted;

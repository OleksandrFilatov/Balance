-- Persist the rule on the schedule, independently of its editable name/category.
-- No bank transaction, amount, date, account or execution history is modified.
ALTER TABLE recurring_templates
    ADD COLUMN household_split varchar(16) NOT NULL DEFAULT 'EQUAL'
    CHECK (household_split IN ('PROPORTIONAL', 'EQUAL'));

-- Existing five household categories keep their established proportional rule.
UPDATE recurring_templates SET household_split = 'PROPORTIONAL'
WHERE type = 'EXPENSE' AND scope = 'HOUSEHOLD' AND category_id IN (
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0001-000000000004'
);

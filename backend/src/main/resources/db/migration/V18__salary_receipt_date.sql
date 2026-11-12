-- Earnings month continues to determine household proportions; cash arrives on its own date.
-- Existing salary values and financial records are retained. NULL uses next month's 15th day.
ALTER TABLE household_monthly_income ADD COLUMN mine_receipt_date date;
ALTER TABLE household_monthly_income ADD CONSTRAINT household_salary_receipt_date
 CHECK (mine_receipt_date IS NULL OR
   (mine_receipt_date >= month AND extract(year FROM mine_receipt_date) BETWEEN 1 AND 9999));
CREATE INDEX household_salary_receipt ON household_monthly_income(mine_receipt_date)
 WHERE mine_receipt_date IS NOT NULL;

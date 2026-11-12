ALTER TABLE recurring_templates ADD COLUMN end_date date;
ALTER TABLE recurring_templates ADD CONSTRAINT recurring_templates_end_date_check
 CHECK(end_date IS NULL OR (end_date>=first_date AND end_date<=DATE '9999-12-31'));
ALTER TABLE recurring_templates DROP CONSTRAINT recurring_templates_frequency_check;
ALTER TABLE recurring_templates ADD CONSTRAINT recurring_templates_frequency_check
 CHECK(frequency IN ('ONCE','DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY'));

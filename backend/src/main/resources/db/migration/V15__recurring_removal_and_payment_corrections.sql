ALTER TABLE recurring_templates ADD COLUMN deleted boolean NOT NULL DEFAULT false;
ALTER TABLE recurring_executions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE recurring_executions ADD COLUMN cancellation_reason varchar(500);
ALTER TABLE recurring_executions ADD CONSTRAINT recurring_cancellation_audit
  CHECK ((cancelled_at IS NULL AND cancellation_reason IS NULL) OR
         (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) BETWEEN 1 AND 500));

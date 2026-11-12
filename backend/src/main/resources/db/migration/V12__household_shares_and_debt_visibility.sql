CREATE TABLE household_monthly_income (
 month date PRIMARY KEY CHECK (extract(day FROM month)=1),
 mine numeric(19,2) NOT NULL CHECK(mine>=0 AND mine<>'NaN'::numeric),
 ira numeric(19,2) NOT NULL CHECK(ira>=0 AND ira<>'NaN'::numeric),
 version bigint NOT NULL DEFAULT 0
);
ALTER TABLE debts ADD COLUMN deleted boolean NOT NULL DEFAULT false;

-- Visual completion only. Does not create financial transactions or change paid minutes.
CREATE TABLE work_shift_marks (
 work_date date PRIMARY KEY,
 month date NOT NULL REFERENCES work_months(month),
 marked_at timestamptz NOT NULL DEFAULT now(),
 CHECK(work_date>=month AND work_date<month+interval '1 month')
);

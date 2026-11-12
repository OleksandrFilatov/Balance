CREATE TABLE work_months (
 month date PRIMARY KEY CHECK(extract(day FROM month)=1),
 hourly_rate numeric(6,2) NOT NULL CHECK(hourly_rate>0 AND hourly_rate<=1000),
 start_time time NOT NULL,end_time time NOT NULL,birth_date date,
 saxony boolean NOT NULL,children integer NOT NULL CHECK(children BETWEEN 0 AND 20),
 children_under25 integer NOT NULL CHECK(children_under25 BETWEEN 0 AND 5 AND children_under25<=children),
 health_extra numeric(4,2) NOT NULL CHECK(health_extra BETWEEN 0 AND 10),version bigint NOT NULL DEFAULT 1
);
CREATE TABLE work_shifts (
 work_date date PRIMARY KEY,month date NOT NULL REFERENCES work_months(month),working boolean NOT NULL,
 start_time time,end_time time,
 CHECK(work_date>=month AND work_date<month+interval '1 month'),
 CHECK((working AND start_time IS NOT NULL AND end_time IS NOT NULL) OR (NOT working AND start_time IS NULL AND end_time IS NULL))
);

CREATE TABLE work_weekly_rotation (
 id boolean PRIMARY KEY CHECK(id),
 anchor_monday date NOT NULL CHECK(extract(isodow FROM anchor_monday)=1),
 first_start time NOT NULL, first_end time NOT NULL,
 second_start time NOT NULL, second_end time NOT NULL
);

-- Add personal 1-5 star rating to movies and series
alter table movies
  add column rating smallint check (rating >= 1 and rating <= 5);

alter table series
  add column rating smallint check (rating >= 1 and rating <= 5);

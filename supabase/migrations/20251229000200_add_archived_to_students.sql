-- Add archived column to students table
alter table students add column if not exists archived boolean not null default false;

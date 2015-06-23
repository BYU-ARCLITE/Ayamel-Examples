# add views column to content table

# --- !Ups

alter table content add column views bigint not null default 0;

# --- !Downs

alter table content drop views;
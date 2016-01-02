# --- Adding course enrollment settings

# --- !Ups

alter table course add column enrollment varchar(128) not null default "closed";

# --- !Downs

alter table course drop column enrollment;
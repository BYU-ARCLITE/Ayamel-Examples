# --- Adding featured courses

# --- !Ups

alter table course add column featured boolean default false;

# --- !Downs

alter table course drop column featured;
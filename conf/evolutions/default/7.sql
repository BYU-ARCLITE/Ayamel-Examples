# --- Add role to user

# --- !Ups

alter table userAccount add column role int not null default 0;

# --- !Downs

alter table userAccount drop column role;
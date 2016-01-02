# --- Adding account stats

# --- !Ups

alter table userAccount
    add column created varchar(255) not null default "2013-01-01T12:00:00.000-06:00",
    add column lastLogin varchar(255) not null default "2013-01-01T12:00:00.000-06:00";

# --- !Downs

alter table userAccount drop column created, drop column lastLogin;
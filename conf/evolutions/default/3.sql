# --- Add shareability and visibility to content

# --- !Ups

alter table content
    add column visibility int not null default 2,
    add column shareability int not null default 3;

# --- !Downs

alter table content drop column visibility, drop column shareability;
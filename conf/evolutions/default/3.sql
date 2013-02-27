# --- User Database

# --- !Ups

alter table movie add column description longtext not null;


# --- !Downs

alter table movie drop column description;
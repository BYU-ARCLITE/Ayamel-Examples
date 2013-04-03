# --- Add authKey to content

# --- !Ups

alter table content add column authKey varchar(255) not null;

# --- !Downs

alter table content drop column authKey;
# --- Adding content labels

# --- !Ups

alter table content add column labels longtext not null;

# --- !Downs

alter table content drop column labels;
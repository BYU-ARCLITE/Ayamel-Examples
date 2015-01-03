# --- New permissions system

# --- !Ups

alter table wordList add column srcLang varchar(8) not null default "eng";
alter table wordList add column destLang varchar(8) not null default "eng";
update wordList set srcLang = language;
alter table wordList drop language;


# --- !Downs

alter table wordList add column language varchar(8) not null default "eng";
update wordList set language = srcLang;
alter table wordList drop srcLang;
alter table wordList drop destLang;
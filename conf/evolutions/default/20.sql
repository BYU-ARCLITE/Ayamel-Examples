# --- New permissions system

# --- !Ups

alter table content drop column settings;

create table contentSetting (
  id                bigint not null auto_increment,
  contentId         bigint not null,
  setting           varchar(255) not null,
  argument          text not null,
  primary key(id)
);

# --- !Downs

alter table content add column settings longtext not null;

drop table if exists contentSetting;
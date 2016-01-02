# --- Removing activity streams

# --- !Ups

drop table if exists activity;

# --- !Downs

create table activity (
  id                bigint not null auto_increment,
  actor             bigint not null,
  verb              varchar(255) not null,
  pageCategory      varchar(255) not null,
  pageAction        varchar(255) not null,
  pageId            bigint not null,
  generatorType     varchar(255) not null,
  generatorId       varchar(255) not null,
  generatorItemRef  varchar(255) not null,
  objectType        varchar(255) not null,
  objectId          varchar(255) not null,
  objectItemRef     varchar(255) not null,
  published         varchar(255) not null,
  primary key(id)
);
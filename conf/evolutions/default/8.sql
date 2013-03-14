# --- Institution, content, and class tables

# --- !Ups

create table institution (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  location       varchar(255) not null,
  description    varchar(255) not null,
  logo           varchar(255) null,
  primary key(id)
);

create table content (
  id             bigint not null auto_increment,
  resourceId     varchar(255) not null,
  primary key(id)
);

create table class (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  startDate      varchar(255) not null,
  endDate        varchar(255) not null,
  settings       varchar(255) not null,
  primary key(id)
);

create table message (
  id             bigint not null auto_increment,
  fromUser       bigint not null,
  toUser         bigint not null,
  messageType    varchar(255) not null,
  content        longtext not null,
  messageDate    varchar(255) not null,
  messageRead    boolean not null default false,
  primary key(id)
);

create table classMembership (
  id             bigint not null auto_increment,
  userId         bigint not null,
  classId        bigint not null,
  teacher        boolean not null,
  primary key(id)
);

create table contentOwnership (
  id             bigint not null auto_increment,
  userId         bigint not null,
  contentId      bigint not null,
  primary key(id)
);

create table directorship (
  id             bigint not null auto_increment,
  userId         bigint not null,
  institutionId  bigint not null,
  primary key(id)
);

create table contentListing (
  id             bigint not null auto_increment,
  classId        bigint not null,
  contentId      bigint not null,
  primary key(id)
);

create table classListing (
  id             bigint not null auto_increment,
  institutionId  bigint not null,
  classId        bigint not null,
  primary key(id)
);

# --- !Downs

drop table if exists institution;
drop table if exists content;
drop table if exists class;
drop table if exists message;
drop table if exists classMembership;
drop table if exists contentOwnership;
drop table if exists directorship;
drop table if exists contentListing;
drop table if exists classListing;
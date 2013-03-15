# --- Data model v2

# --- !Ups

create table content (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  contentType    varchar(255) not null,
  thumbnail      varchar(255) not null,
  resourceId     varchar(255) not null,
  dateAdded      varchar(255) not null,
  primary key(id)
);

create table contentListing (
  id             bigint not null auto_increment,
  courseId       bigint not null,
  contentId      bigint not null,
  primary key(id)
);

create table contentOwnership (
  id             bigint not null auto_increment,
  userId         bigint not null,
  contentId      bigint not null,
  primary key(id)
);

create table course (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  startDate      varchar(255) not null,
  endDate        varchar(255) not null,
  lmsKey         varchar(255) not null,
  primary key(id)
);

create table courseMembership (
  id             bigint not null auto_increment,
  userId         bigint not null,
  courseId       bigint not null,
  teacher        boolean not null,
  primary key(id)
);

create table userAccount (
  id             bigint not null auto_increment,
  authId         varchar(255) not null,
  authScheme     varchar(255) not null,
  username       varchar(255) not null,
  name           varchar(255) null,
  email          varchar(255) null,
  role           int not null,
  primary key(id)
);




# --- !Downs

drop table if exists content;
drop table if exists contentListing;
drop table if exists contentOwnership;
drop table if exists course;
drop table if exists courseMembership;
drop table if exists userAccount;
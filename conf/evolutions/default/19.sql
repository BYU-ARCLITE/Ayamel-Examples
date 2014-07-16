# --- New permissions system

# --- !Ups

create table sitePermissions (
  id                bigint not null auto_increment,
  userId            bigint not null,
  permission        varchar(255) not null,
  primary key(id)
);

create table coursePermissions (
  id                bigint not null auto_increment,
  courseId          bigint not null,
  userId            bigint not null,
  permission        varchar(255) not null,
  primary key(id)
);

create table sitePermissionRequest (
  id             bigint not null auto_increment,
  userId         bigint not null,
  permission     varchar(255) not null,
  reason         varchar(2048) not null,
  primary key(id)
);

drop table if exists teacherRequest;

# --- !Downs

drop table if exists sitePermissions;
drop table if exists coursePermissions;
drop table if exists sitePermissionRequest;

create table teacherRequest (
  id             bigint not null auto_increment,
  userId         bigint not null,
  reason         varchar(2048) not null,
  primary key(id)
);
# --- Teacher requests, notifications, and content settings

# --- !Ups

create table teacherRequest (
  id             bigint not null auto_increment,
  userId         bigint not null,
  reason         varchar(2048) not null,
  primary key(id)
);

create table notification (
  id             bigint not null auto_increment,
  userId         bigint not null,
  message        varchar(512) not null,
  dateSent       varchar(255) not null,
  messageRead    boolean not null,
  primary key(id)
);

alter table content add column settings longtext not null;

# --- !Downs

drop table if exists teacherRequest;
drop table if exists notification;
alter table content drop column settings;
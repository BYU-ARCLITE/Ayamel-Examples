# --- Add picture to user. Create announcements

# --- !Ups

alter table userAccount add column picture varchar(511) null;

create table announcement (
  id             bigint not null auto_increment,
  courseId       bigint not null,
  userId         bigint not null,
  timeMade       varchar(255) not null,
  content        varchar(255) not null,
  primary key(id)
);

# --- !Downs

alter table userAccount drop column picture;
drop table if exists announcement;
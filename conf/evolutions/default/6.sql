# --- AddCourseRequest Model

# --- !Ups

create table addCourseRequest (
  id             bigint not null auto_increment,
  userId         bigint not null,
  courseId       bigint not null,
  message        varchar(255) not null,
  primary key(id)
);



# --- !Downs

drop table if exists addCourseRequest;
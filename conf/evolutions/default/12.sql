# --- Feedback table

# --- !Ups

create table feedback (
  id             bigint not null auto_increment,
  userId         bigint not null,
  category       varchar(255) not null,
  description    longtext not null,
  submitted      varchar(255) not null,
  primary key(id)
);

# --- !Downs

drop table if exists feedback;
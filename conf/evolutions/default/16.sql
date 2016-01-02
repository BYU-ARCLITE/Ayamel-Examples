# --- Adding test scoring

# --- !Ups

create table scoring (
  id             bigint not null auto_increment,
  score          double not null,
  possible       double not null,
  results        text not null,
  userId         bigint not null,
  contentId      bigint not null,
  graded         varchar(255) not null,
  primary key(id)
);

# --- !Downs

drop table if exists scoring;
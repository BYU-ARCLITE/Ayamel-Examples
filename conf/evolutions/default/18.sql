# --- Adding activity streams

# --- !Ups

create table wordList (
  id             bigint not null auto_increment,
  word           text not null,
  `language`     varchar(8) not null,
  userId         bigint not null,
  primary key(id)
);

# --- !Downs

drop table if exists wordList;
# --- Feedback table

# --- !Ups

create table setting (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  settingValue   longtext not null,
  primary key(id)
);

# --- !Downs

drop table if exists setting;
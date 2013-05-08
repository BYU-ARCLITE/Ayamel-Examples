# --- Help pages

# --- !Ups

create table helpPage (
  id             bigint not null auto_increment,
  title          varchar(255) not null,
  contents       longtext not null,
  primary key(id)
);

# --- !Downs

drop table if exists helpPage;
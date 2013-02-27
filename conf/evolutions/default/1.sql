# --- User Database

# --- !Ups

create table userAccount (
  id             bigint not null auto_increment,
  authID         varchar(255) not null,
  authScheme     varchar(255) not null,
  username       varchar(255) not null,
  name           varchar(255) not null,
  email          varchar(255) not null,
  primary key(id)
);


# --- !Downs

drop table if exists userAccount;
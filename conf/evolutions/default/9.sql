# --- Adding activity streams

# --- !Ups

create table homePageContent (
  id            bigint not null auto_increment,
  title         varchar(255) not null,
  text          varchar(255) not null,
  link          varchar(255) not null,
  linkText      varchar(255) not null,
  background    varchar(255) not null,
  active        boolean not null,
  primary key(id)
);

# --- !Downs

drop table if exists homePageContent;
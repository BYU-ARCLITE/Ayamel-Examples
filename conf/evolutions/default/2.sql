# --- User Database

# --- !Ups

create table movie (
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  resourceId     varchar(255) not null,
  captionTracks  longtext not null,
  primary key(id)
);

create table movieGroup(
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  movies         longtext not null,
  primary key(id)
);

create table captionTrack(
  id             bigint not null auto_increment,
  name           varchar(255) not null,
  lang           varchar(255) not null,
  movies         longtext not null,
  primary key(id)
);


# --- !Downs

drop table if exists movie;
drop table if exists movieGroup;
drop table if exists captionTrack;
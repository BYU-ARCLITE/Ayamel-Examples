# --- Account merging

# --- !Ups

create table accountLink (
  id                bigint not null auto_increment,
  userIds           longtext not null,
  primaryAccount    bigint not null,
  primary key(id)
);

alter table userAccount add column accountLinkId bigint not null default -1;

# --- !Downs

drop table if exists accountLink;
alter table userAccount drop column accountLinkId;
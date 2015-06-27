# --- Allow longer announcements

# --- !Ups

alter table announcement modify column content text not null;

# --- !Downs

alter table announcement modify column content varchar(255) not null;
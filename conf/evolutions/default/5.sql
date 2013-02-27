# --- User Database

# --- !Ups

alter table captionTrack drop column movies, add column resourceId varchar(255) not null;


# --- !Downs

alter table captionTrack drop column resourceId, add column movies longtext not null;
# --- User Database

# --- !Ups

alter table captionTrack add column content longtext not null;


# --- !Downs

alter table captionTrack drop column content;
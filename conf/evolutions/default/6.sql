# --- Rename movie to video

# --- !Ups

rename table movie to video, movieGroup to videoGroup;
alter table videoGroup change movies videos longtext not null;


# --- !Downs

alter table videoGroup change videos movies longtext not null;
rename table video to movie, videoGroup to movieGroup;
# --- Rename the table 'class' to 'course' to help remove syntax confusion and ambiguity

# --- !Ups

rename table class to course;
rename table classListing to courseListing;
rename table classMembership to courseMembership;
alter table courseListing change column classId courseId bigint not null;
alter table courseMembership change column classId courseId bigint not null;
alter table contentListing change column classId courseId bigint not null;


# --- !Downs


alter table courseListing change column courseId classId bigint not null;
alter table courseMembership change column courseId classId bigint not null;
alter table contentListing change column courseId classId bigint not null;
rename table courseMembership to classMembership;
rename table courseListing to classListing;
rename table course to class;
# --- Login state tokens

# --- !Ups

create table login_tokens (
  token    varchar(127) not null,
  action   varchar(32) not null,
  redirect text not null,
  primary key(token)
);

# --- !Downs

drop table if exists login_tokens;
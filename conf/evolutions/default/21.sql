# --- Fixing Create Account Issues

# --- !Ups

alter table userAccount alter column role set default '1';

# --- !Downs
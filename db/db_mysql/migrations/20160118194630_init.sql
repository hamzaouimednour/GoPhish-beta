
-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
CREATE TABLE IF NOT EXISTS `users` (id integer primary key auto_increment,username varchar(255) NOT NULL UNIQUE,hash varchar(255),api_key varchar(255) NOT NULL UNIQUE );
CREATE TABLE IF NOT EXISTS `templates` (id integer primary key auto_increment,user_id bigint,name varchar(255),subject varchar(255),text text,html text,modified_date datetime );
CREATE TABLE IF NOT EXISTS `targets` (id integer primary key auto_increment,first_name varchar(255),last_name varchar(255),email varchar(255),position varchar(255),department varchar(255),entity varchar(255),location varchar(255) );
CREATE TABLE IF NOT EXISTS `smtp` (smtp_id integer primary key auto_increment,campaign_id bigint,host varchar(255),username varchar(255),from_address varchar(255) );
CREATE TABLE IF NOT EXISTS `results` (id integer primary key auto_increment,campaign_id bigint,user_id bigint,r_id varchar(255),email varchar(255),first_name varchar(255),last_name varchar(255),status varchar(255) NOT NULL ,ip varchar(255),latitude real,longitude real,department varchar(255),entity varchar(255),location varchar(255) NOT NULL  );
CREATE TABLE IF NOT EXISTS `pages` (id integer primary key auto_increment,user_id bigint,name varchar(255),html text,modified_date datetime );
CREATE TABLE IF NOT EXISTS `redirection_pages` (id integer primary key auto_increment,user_id bigint,name varchar(255),html text, pid VARCHAR(255) DEFAULT NULL, modified_date datetime );
CREATE TABLE IF NOT EXISTS `groups` (id integer primary key auto_increment,user_id bigint,name varchar(255),modified_date datetime );
CREATE TABLE IF NOT EXISTS `group_targets` (group_id bigint,target_id bigint );
CREATE TABLE IF NOT EXISTS `events` (id integer primary key auto_increment,campaign_id bigint,email varchar(255),time datetime,message varchar(255) );
CREATE TABLE IF NOT EXISTS `campaigns` (id integer primary key auto_increment,user_id bigint,campaign_parent_id bigint,name varchar(255) NOT NULL ,created_date datetime,completed_date datetime,template_id bigint,page_id bigint,status varchar(255),url varchar(255) );
CREATE TABLE IF NOT EXISTS `campaign_parents` (id integer primary key auto_increment,user_id bigint,name varchar(255) NOT NULL ,created_date datetime,status varchar(255) );
CREATE TABLE IF NOT EXISTS `campaign_groups` (campaign_id bigint, group_id bigint, total_recipients bigint);
CREATE TABLE IF NOT EXISTS `attachments` (id integer primary key auto_increment,template_id bigint,content text,type varchar(255),name varchar(255) );
CREATE TABLE IF NOT EXISTS `languages` (id integer primary key auto_increment,code varchar(255),name varchar(255) );
CREATE TABLE IF NOT EXISTS `library_settings` (id integer primary key auto_increment,user_id bigint,name varchar(255),type varchar(100) );

CREATE TABLE IF NOT EXISTS `teams` (id integer primary key auto_increment,teamname varchar(255) NOT NULL );
CREATE TABLE IF NOT EXISTS `teamusers` (team_id bigint, user_id bigint);

CREATE TABLE IF NOT EXISTS `departments` (id integer primary key auto_increment, name varchar(255) NOT NULL );
CREATE TABLE IF NOT EXISTS `department_teams` (team_id integer NOT NULL,department_id integer NOT NULL);

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back
DROP TABLE `attachments`;
DROP TABLE `campaigns`;
DROP TABLE `campaign_parents`;
DROP TABLE `events`;
DROP TABLE `group_targets`;
DROP TABLE `groups`;
DROP TABLE `pages`;
DROP TABLE `results`;
DROP TABLE `smtp`;
DROP TABLE `targets`;
DROP TABLE `templates`;
DROP TABLE `users`;
DROP TABLE `teams`;
DROP TABLE `teamusers`;
DROP TABLE `departments`;
DROP TABLE `department_teams`;

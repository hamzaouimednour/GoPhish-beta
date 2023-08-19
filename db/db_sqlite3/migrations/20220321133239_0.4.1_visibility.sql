
-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
ALTER TABLE redirection_pages ADD COLUMN `visibility` tinyint DEFAULT 0;
ALTER TABLE templates ADD COLUMN `visibility` tinyint DEFAULT 0;
ALTER TABLE pages ADD COLUMN `visibility` tinyint DEFAULT 0;

ALTER TABLE templates ADD COLUMN `topic` bigint DEFAULT null;
ALTER TABLE pages ADD COLUMN `topic` bigint DEFAULT null;

ALTER TABLE templates ADD COLUMN `category` bigint DEFAULT null;
ALTER TABLE pages ADD COLUMN `category` bigint DEFAULT null;

ALTER TABLE library_templates ADD COLUMN `redirection_page_id` bigint DEFAULT null;
ALTER TABLE library_templates ADD COLUMN `redirection_url` varchar(255) DEFAULT null;

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back


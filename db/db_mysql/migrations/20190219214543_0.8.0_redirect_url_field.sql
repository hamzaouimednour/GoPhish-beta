
-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
ALTER TABLE `pages` MODIFY redirect_url TEXT;
ALTER TABLE `pages` ADD COLUMN redirection_page bigint DEFAULT NULL;

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back
ALTER TABLE `pages` MODIFY redirect_url VARCHAR(255);
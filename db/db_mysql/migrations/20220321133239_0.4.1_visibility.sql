
-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
ALTER TABLE redirection_pages ADD COLUMN `visibility` tinyint DEFAULT 0;
ALTER TABLE templates ADD COLUMN `visibility` tinyint DEFAULT 0;
ALTER TABLE pages ADD COLUMN `visibility` tinyint DEFAULT 0;

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back



-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
ALTER TABLE users ADD COLUMN is_two_fa_enabled integer default 0;
ALTER TABLE users ADD COLUMN two_fa_secret integer default 0;

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back


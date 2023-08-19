
-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          INTEGER PRIMARY KEY AUTO_INCREMENT,
    `slug`        VARCHAR(255) NOT NULL UNIQUE,
    `name`        VARCHAR(255) NOT NULL UNIQUE,
    `description` VARCHAR(255)
);

ALTER TABLE `users` ADD COLUMN `role_id` INTEGER;
ALTER TABLE `users` ADD COLUMN `teamname` VARCHAR(255);
ALTER TABLE `users` ADD COLUMN `teamid` INTEGER;
CREATE TABLE IF NOT EXISTS `permissions` (
    `id`          INTEGER PRIMARY KEY AUTO_INCREMENT,
    `slug`        VARCHAR(255) NOT NULL UNIQUE,
    `name`        VARCHAR(255) NOT NULL UNIQUE,
    `description` VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id`       INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL
);

INSERT INTO `roles` (`slug`, `name`, `description`)
VALUES
    ("admin", "Admin", "System administrator with full permissions"),
    ("user", "User", "User role with edit access to objects and campaigns"),
    ("engineer", "Engineer", "User role with full permissions to Gophish Email Template, landing Pages and sending Pages"),
    ("reporter", "Reporter", "Admin role with read access to all objects within Gophish"),
    ("teamAdmin", "Team Admin", "Admin role with team based permissions");

INSERT INTO `permissions` (`slug`, `name`, `description`)
VALUES
    ("view_objects", "View Objects", "View objects in Gophish"),
    ("modify_objects", "Modify Objects", "Create and edit objects in Gophish"),
    ("modify_system", "Modify System", "Manage system-wide configuration"),
    ("users.access", "View Users", "View users"),
    ("users.create", "Create Users", "Create users"),
    ("users.update", "Edit Users", "Edit users"),
    ("users.delete", "Delete Users", "Delete users"),
    ("users.team", "Team based Permissions", "Manage users within same team"),
    ("teams.access", "View Teams", "View teams"),
    ("teams.create", "Create Teams", "Create teams"),
    ("teams.update", "Edit Teams", "Edit teams"),
    ("teams.delete", "Delete Teams", "Delete teams"),
    ("campaigns.access", "View Campaigns", "View campaigns"),
    ("domains.access", "View Domains", "View Domains"),

    ("campaigns.create", "Create Campaigns", "Create campaigns"),
    ("campaigns.update", "Edit Campaigns", "Edit campaigns"),
    ("campaigns.delete", "Delete Campaigns", "Delete campaigns"),
    ("campaign_parents.access", "View Campaigns Parents", "View campaigns parents"),
    ("campaign_parents.create", "Create Campaigns Parents", "Create campaigns parents"),
    ("campaign_parents.update", "Edit Campaigns Parents", "Edit campaigns parents"),
    ("campaign_parents.delete", "Delete Campaigns Parents", "Delete campaigns parents"),
    ("groups.access", "View Groups", "View groups"),
    ("groups.create", "Create Groups", "Create groups"),
    ("groups.update", "Edit Groups", "Edit groups"),
    ("groups.delete", "Delete Groups", "Delete groups"),
    ("settings.access", "View Settings", "View settings"),
    ("settings.create", "Create Settings", "Create settings"),
    ("settings.update", "Edit Settings", "Edit settings"),
    ("settings.delete", "Delete Settings", "Delete settings"),
    ("templates.access", "View Templates", "View templates"),
    ("templates.create", "Create Templates", "Create templates"),
    ("templates.update", "Edit Templates", "Edit templates"),
    ("templates.delete", "Delete Templates", "Delete templates"),
    ("landing_pages.access", "View LandingPages", "View landing pages"),
    ("landing_pages.create", "Create LandingPages", "Create landing pages"),
    ("landing_pages.update", "Edit LandingPages", "Edit landing pages"),
    ("landing_pages.delete", "Delete LandingPages", "Delete landing pages"),
    ("redirection_pages.access", "View RedirectionPages", "View redirection pages"),
    ("redirection_pages.create", "Create RedirectionPages", "Create redirection pages"),
    ("redirection_pages.update", "Edit RedirectionPages", "Edit redirection pages"),
    ("redirection_pages.delete", "Delete RedirectionPages", "Delete redirection pages"),
    ("sending_profiles.access", "View SendingProfiles", "View sending profiles"),
    ("sending_profiles.create", "Create SendingProfiles", "Create sending profiles"),
    ("sending_profiles.update", "Edit SendingProfiles", "Edit sending profiles"),
    ("sending_profiles.delete", "Delete SendingProfiles", "Delete sending profiles"),
    ("webhooks.access", "View Webhooks", "View webhooks"),
    ("webhooks.create", "Create Webhooks", "Create webhooks"),
    ("webhooks.update", "Edit Webhooks", "Edit webhooks"),
    ("webhooks.delete", "Delete Webhooks", "Delete webhooks"),
    ("impersonate.access", "View Impersonate", "View impersonate"),
    ("impersonate.create", "Create Impersonate", "Create impersonate"),
    ("impersonate.update", "Edit Impersonate", "Edit impersonate"),
    ("impersonate.delete", "Delete Impersonate", "Delete impersonate"),
    ("smtp.access", "View SMTP", "View smtp"),
    ("smtp.create", "Create SMTP", "Create smtp"),
    ("smtp.update", "Edit SMTP", "Edit smtp"),
    ("smtp.delete", "Delete SMTP", "Delete smtp"),
    ("imap.access", "View IMAP", "View imap"),
    ("imap.create", "Create IMAP", "Create imap"),
    ("imap.update", "Edit IMAP", "Edit imap"),
    ("imap.delete", "Delete IMAP", "Delete imap"),
    ("util.access", "View Utility", "View utility"),
    ("util.create", "Create Utility", "Create utility"),
    ("util.update", "Edit Utility", "Update utility"),
    ("util.delete", "Delete Utility", "Delete utility"),
    ("pages.access", "View Pages", "View pages"),
    ("pages.create", "Create Pages", "Create pages"),
    ("pages.update", "Edit Pages", "Update pages"),
    ("pages.delete", "Delete Pages", "Delete pages"),
    ("import.access", "View Import", "View Import"),
    ("import.create", "Create Import", "Create Import"),
    ("import.update", "Edit Import", "Edit Import"),
    ("import.delete", "Delete Import", "Delete Import"),
    ("departments.access", "View Department", "View Department"),
    ("departments.create", "Create Department", "Create Department"),
    ("departments.update", "Edit Department", "Edit Department"),
    ("departments.delete", "Delete Department", "Delete Department"),
    ("library_templates.access", "View Library Templates", "View Library Templates"),
    ("library_templates.create", "Create Library Templates", "Create Library Templates"),
    ("library_templates.update", "Edit Library Templates", "Edit Library Templates"),
    ("library_templates.delete", "Delete Library Templates", "Delete Library Templates"),
    ("library_settings.access", "View Library Settings", "View Library Settings"),
    ("library_settings.create", "Create Library Settings", "Create Library Settings"),
    ("library_settings.update", "Edit Library Settings", "Edit Library Settings"),
    ("library_settings.delete", "Delete Library Settings", "Delete Library Settings");

-- Our rules for generating the admin user are:
-- * The user with the name `admin`
-- * OR the first user, if no `admin` user exists
-- MySQL apparently makes these queries gross. Thanks MySQL.
UPDATE `users` SET `role_id`=(
    SELECT `id` FROM `roles` WHERE `slug`="admin")
WHERE `id`=(
    SELECT `id` FROM (
        SELECT * FROM `users`
    ) as u WHERE `username`="admin"
    OR `id`=(
        SELECT MIN(`id`) FROM (
            SELECT * FROM `users`
        ) as u
    ) LIMIT 1);

-- Every other user will be considered a standard user account. The admin user
-- will be able to change the role of any other user at any time.
UPDATE `users` SET `role_id`=(
    SELECT `id` FROM `roles` AS role_id WHERE `slug`="user")
WHERE role_id IS NULL;

-- Our default permission set will:
-- * Allow admins the ability to do anything
-- * Allow users to modify objects

-- Grant all permissions to the Admin.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles AS r, `permissions` AS p
WHERE r.id IN (SELECT `id` FROM roles WHERE `slug`="admin")
AND p.id IN (SELECT `id` FROM `permissions` WHERE `slug` NOT LIKE "%.team");

-- Grant Team based permissions to the Team Admin Role.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles AS r, `permissions` AS p
WHERE r.id IN (SELECT `id` FROM roles WHERE `slug`="teamAdmin")
AND p.id IN (SELECT `id` FROM `permissions` WHERE `slug` NOT IN (
    "teams.create",
    "teams.update",
    "teams.delete"
));

-- Grant the permissions below to Reporter Role.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles AS r, `permissions` AS p
WHERE r.id IN (SELECT `id` FROM roles WHERE `slug`="reporter")
AND p.id IN (SELECT `id` FROM `permissions` WHERE `slug` IN (
    "view_objects",
    "campaigns.access",
    "domains.access",
    "campaign_parents.access",
    "templates.access",
    "pages.access",
    "landing_pages.access",
    "smtp.access",
    "sending_profiles.access",
    "imap.access",
    "groups.access",
    "library_templates.access",
    "library_settings.access",
    "settings.access",
    "settings.create",
    "settings.update",
    "settings.delete"
));

-- Grant all permissions to the User & Engineer Rols except those below.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles AS r, `permissions` AS p
WHERE r.id IN (SELECT `id` FROM roles WHERE `slug` IN ("user", "engineer"))
AND p.id IN (SELECT `id` FROM `permissions` WHERE `slug` NOT IN (
    "users.access",
    "users.create",
    "users.update",
    "users.delete",
    "teams.access",
    "teams.create",
    "teams.update",
    "teams.delete",
    "webhooks.access",
    "webhooks.create",
    "webhooks.update",
    "webhooks.delete"
) AND `slug` NOT LIKE "%.team");

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back
DROP TABLE `roles`
DROP TABLE `user_roles`
DROP TABLE `permissions`

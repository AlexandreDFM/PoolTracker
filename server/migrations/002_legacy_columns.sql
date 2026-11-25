-- Columns that older databases received after their tables were created.
-- Already part of 001 for new databases: nothing happens there.
-- MySQL has no ADD COLUMN IF NOT EXISTS: the statement is chosen at run time.

SET @missing := (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USERS' AND COLUMN_NAME = 'sessionVersion');
SET @sql := IF(@missing, 'ALTER TABLE USERS ADD COLUMN sessionVersion INT NOT NULL DEFAULT 0', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @missing := (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DAILY_QUESTS' AND COLUMN_NAME = 'failedAttempts');
SET @sql := IF(@missing, 'ALTER TABLE DAILY_QUESTS ADD COLUMN failedAttempts INT DEFAULT 0', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

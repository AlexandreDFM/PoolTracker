-- Day of the last automatic quest assignment (time zone of the scheduler,
-- Europe/Paris by default): the scheduler assigns once the configured hour
-- has passed and today's assignment is not recorded yet, so a restart at the
-- wrong minute no longer skips a day. Initialized at startup (seed).
ALTER TABLE QUEST_CONFIG ADD COLUMN lastAssignmentDate DATE NULL;

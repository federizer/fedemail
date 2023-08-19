CREATE TRIGGER IF NOT EXISTS "BodyAfterInsert"
    AFTER INSERT
    ON "Body"
    FOR EACH ROW
BEGIN
    UPDATE "BodyTimelineSeq" SET "lastTimelineId" = ("lastTimelineId" + 1) WHERE "userId" = new."userId";
    UPDATE "BodyHistorySeq" SET "lastHistoryId" = ("lastHistoryId" + 1) WHERE "userId" = new."userId";
    UPDATE "Body"
    SET "timelineId" = (SELECT "lastTimelineId" FROM "BodyTimelineSeq" WHERE "userId" = new."userId"),
        "historyId"  = (SELECT "lastHistoryId" FROM "BodyHistorySeq" WHERE "userId" = new."userId"),
        "lastStmt"   = 0
    WHERE "uri" = new."uri";
END;

CREATE TRIGGER IF NOT EXISTS "BodyBeforeUpdate"
    BEFORE UPDATE OF
        "uri",
        "userId",
        -- "hash",
        -- "name",
        -- "snippet",
        "path",
        -- "size",
        "contentType"
    ON "Body"
    FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Update not allowed');
END;

CREATE TRIGGER IF NOT EXISTS "BodyAfterUpdate"
    AFTER UPDATE OF
        "hash",
        "name",
        "snippet",
        "size"
    ON "Body"
    FOR EACH ROW
BEGIN
    UPDATE "BodyTimelineSeq" SET "lastTimelineId" = ("lastTimelineId" + 1) WHERE "userId" = old."userId";
    UPDATE "BodyHistorySeq" SET "lastHistoryId" = ("lastHistoryId" + 1) WHERE "userId" = old."userId";
    UPDATE "Body"
    SET "timelineId" = (SELECT "lastTimelineId" FROM "BodyTimelineSeq" WHERE "userId" = old."userId"),
        "historyId"  = (SELECT "lastHistoryId" FROM "BodyHistorySeq" WHERE "userId" = old."userId"),
        "lastStmt"   = 1,
        "modifiedAt" = CURRENT_TIMESTAMP
    WHERE "uri" = old."uri";
END;

-- Trashed
CREATE TRIGGER IF NOT EXISTS "BodyBeforeTrash"
    BEFORE UPDATE OF
        "lastStmt"
    ON "Body"
    FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Update "lastStmt" not allowed')
    WHERE NOT (new."lastStmt" == 0 OR new."lastStmt" == 1 OR new."lastStmt" == 2)
        OR (old."lastStmt" = 2 AND new."lastStmt" = 1); -- Untrash = trashed (2) -> inserted (0)
  	UPDATE "Body" 
	SET "deviceId" = iif(length(new."deviceId") = 39 AND substr(new."deviceId", 1, 7) = 'device:', substr(new."deviceId", 8, 32), NULL)
	WHERE "uri" = new."uri";
END;

CREATE TRIGGER IF NOT EXISTS "BodyAfterTrash"
    AFTER UPDATE OF
        "lastStmt"
    ON "Body"
    FOR EACH ROW
    WHEN (new."lastStmt" <> old."lastStmt" AND old."lastStmt" = 2) OR
         (new."lastStmt" <> old."lastStmt" AND new."lastStmt" = 2)
BEGIN
    UPDATE "BodyHistorySeq" SET "lastHistoryId" = ("lastHistoryId" + 1) WHERE "userId" = old."userId";
    UPDATE "Body"
    SET "historyId"  = (SELECT "lastHistoryId" FROM "BodyHistorySeq" WHERE "userId" = old."userId"),
        "deviceId" = iif(length(new."deviceId") = 39 AND substr(new."deviceId", 1, 7) = 'device:', substr(new."deviceId", 8, 32), NULL)
    WHERE "uri" = old."uri";
END;

CREATE TRIGGER IF NOT EXISTS "BodyAfterDelete"
AFTER DELETE
ON "Body"
FOR EACH ROW
BEGIN
    UPDATE "BodyHistorySeq" SET "lastHistoryId" = ("lastHistoryId" + 1) WHERE "userId" = old."userId";
    INSERT INTO "BodyDeleted" ("uri", "userId", "historyId")
      VALUES (old."uri",
              old."userId",
              (SELECT "lastHistoryId" FROM "BodyHistorySeq" WHERE "userId" = old."userId"));
END;
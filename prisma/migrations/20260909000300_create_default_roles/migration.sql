ALTER TABLE "roles"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

INSERT INTO "roles" ("name", "updated_at")
VALUES
  ('admin', CURRENT_TIMESTAMP),
  ('user', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

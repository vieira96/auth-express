INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "users"."id", "roles"."id"
FROM "users"
INNER JOIN "roles" ON "roles"."name" = 'user'
ON CONFLICT ("user_id", "role_id") DO NOTHING;

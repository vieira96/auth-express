-- Conta demonstrativa usada somente para testar a rota de usuarios.
INSERT INTO "users" ("id", "email", "password_hash", "updated_at")
VALUES (
  gen_random_uuid(),
  'admin@admin.com',
  '$2b$12$3MowTBhfwHH0rlPBKfComuy/zw2MW/SnV/H36Meew3mjrxQ6vg4D.',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "users"."id", "roles"."id"
FROM "users"
INNER JOIN "roles" ON "roles"."name" = 'admin'
WHERE "users"."email" = 'admin@admin.com'
ON CONFLICT ("user_id", "role_id") DO NOTHING;

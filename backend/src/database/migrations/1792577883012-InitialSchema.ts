import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792577883012 implements MigrationInterface {
    name = 'InitialSchema1792577883012'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'member')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'member', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."project_members_role_enum" AS ENUM('owner', 'member', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "project_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."project_members_role_enum" NOT NULL DEFAULT 'member', "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_project_single_owner" ON "project_members" ("project_id") WHERE "role" = 'owner'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3f491d3a3f986106d281d8eb4" ON "project_members" ("project_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "key" character varying(10) NOT NULL, "description" text, "task_counter" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_63e67599567b2126cfef14e1474" UNIQUE ("key"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'in_review', 'done')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "number" integer NOT NULL, "title" character varying(200) NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "position" double precision NOT NULL DEFAULT '0', "assignee_id" uuid, "reporter_id" uuid, "due_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8d82387ba026be63046895fe37" ON "tasks" ("project_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_10434cf29644a4a93a76858a96" ON "tasks" ("project_id", "number") `);
        await queryRunner.query(`CREATE TYPE "public"."task_activities_action_enum" AS ENUM('created', 'updated')`);
        await queryRunner.query(`CREATE TABLE "task_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" uuid NOT NULL, "actor_id" uuid, "action" "public"."task_activities_action_enum" NOT NULL, "changes" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b7b39b92ce3a5cd42cf81a0dd3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1e30eb5da907d43e386bfb8c55" ON "task_activities" ("task_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" uuid NOT NULL, "author_id" uuid, "body" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "edited_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8657ba08a46e505f8cbbcf9b8a" ON "comments" ("task_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_855d484825b715c545349212c7f" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_87d662c4ff7beec6ad017466fc4" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_activities" ADD CONSTRAINT "FK_6c16dbc1f4693fc90f1a7f87a96" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_activities" ADD CONSTRAINT "FK_41e3b3af30f59234457df463b7d" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_18c2493067c11f44efb35ca0e03" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_e6d38899c31997c45d128a8973b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_e6d38899c31997c45d128a8973b"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_18c2493067c11f44efb35ca0e03"`);
        await queryRunner.query(`ALTER TABLE "task_activities" DROP CONSTRAINT "FK_41e3b3af30f59234457df463b7d"`);
        await queryRunner.query(`ALTER TABLE "task_activities" DROP CONSTRAINT "FK_6c16dbc1f4693fc90f1a7f87a96"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_87d662c4ff7beec6ad017466fc4"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_855d484825b715c545349212c7f"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8657ba08a46e505f8cbbcf9b8a"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1e30eb5da907d43e386bfb8c55"`);
        await queryRunner.query(`DROP TABLE "task_activities"`);
        await queryRunner.query(`DROP TYPE "public"."task_activities_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10434cf29644a4a93a76858a96"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d82387ba026be63046895fe37"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3f491d3a3f986106d281d8eb4"`);
        await queryRunner.query(`DROP INDEX "public"."uq_project_single_owner"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "public"."project_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}

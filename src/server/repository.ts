import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { and, eq, lt, sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Analysis, Feedback, Recipe } from "@/domain/rescue";
import { RescueError } from "./errors";

const rescues = sqliteTable("rescues", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  recipe: text("recipe", { mode: "json" }).$type<Recipe>().notNull(),
  analysis: text("analysis", { mode: "json" }).$type<Analysis>().notNull(),
  history: text("history", { mode: "json" }).$type<Feedback[]>().notNull(),
  mode: text("mode").$type<"demo" | "ai" | "safety">().notNull(),
  createdAt: integer("created_at").notNull(),
});
export type StoredRescue = typeof rescues.$inferSelect;
export interface RescueRepository {
  find(id: string, owner: string): StoredRescue | undefined;
  save(rescue: StoredRescue): void;
}
export function createRepository(
  path: string,
): RescueRepository & { close(): void } {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("secure_delete = ON");
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS rescues (id TEXT PRIMARY KEY, owner TEXT NOT NULL, recipe TEXT NOT NULL, analysis TEXT NOT NULL, history TEXT NOT NULL, mode TEXT NOT NULL, created_at INTEGER NOT NULL)",
  );
  const db = drizzle(sqlite);
  const clean = () =>
    db
      .delete(rescues)
      .where(lt(rescues.createdAt, Date.now() - 86400000))
      .run();
  return {
    find(id, owner) {
      clean();
      return db
        .select()
        .from(rescues)
        .where(and(eq(rescues.id, id), eq(rescues.owner, owner)))
        .get();
    },
    save(rescue) {
      clean();
      if (rescue.history.length === 0) {
        db.insert(rescues).values(rescue).run();
        return;
      }
      // A slow provider response must not overwrite a newer update or safety hold.
      const result = db
        .update(rescues)
        .set({
          analysis: rescue.analysis,
          history: rescue.history,
          mode: rescue.mode,
        })
        .where(
          and(
            eq(rescues.id, rescue.id),
            eq(rescues.owner, rescue.owner),
            eq(
              sql<number>`json_array_length(${rescues.history})`,
              rescue.history.length - 1,
            ),
          ),
        )
        .run();
      if (result.changes !== 1)
        throw new RescueError(
          "This rescue changed or expired while your update was being checked. Submit your update again, or start a new rescue.",
          409,
        );
    },
    close() {
      sqlite.close();
    },
  };
}
let repository: RescueRepository | undefined;
export function getRepository() {
  return (repository ??= createRepository(
    process.env.DATABASE_PATH || "./data/reciperescue.db",
  ));
}

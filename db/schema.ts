import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const taskRecords = sqliteTable("task_records", {
  key: text("key").primaryKey(),
  userId: text("user_id").notNull(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

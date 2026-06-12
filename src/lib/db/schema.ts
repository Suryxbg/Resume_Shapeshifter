import {
  mysqlTable,
  varchar,
  timestamp,
  text,
  int,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const resumeHistory = mysqlTable("resume_history", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  originalResumeText: text("original_resume_text").notNull(),
  jobDescriptionText: text("job_description_text").notNull(),
  generatedResumeText: text("generated_resume_text").notNull(),
  atsScore: int("ats_score"),
  tailoringRunId: varchar("tailoring_run_id", { length: 36 }),
  runData: text("run_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

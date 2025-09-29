import { pgTable, serial, varchar, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";

export const tourPackages = pgTable("tour_packages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  location: varchar("location", { length: 255 }),
  durationDays: integer("duration_days").default(1),
  priceAED: numeric("price_aed", { precision: 10, scale: 2 }).notNull(),
  heroImage: varchar("hero_image", { length: 500 }),
  isFeatured: boolean("is_featured").default(false),
  cardType: varchar("card_type", { length: 20 }).default("vertical"), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

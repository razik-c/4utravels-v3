// src/db/schema.ts
import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  text,
  numeric,
  char,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const productTypeEnum = pgEnum("product_type", ["tour", "transport"]);
export const productTemplateEnum = pgEnum("product_template", ["horizontal", "vertical"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);

export const badgeEnum = pgEnum("visa_badge", ["Popular", "Best Value", "New"]);
export const sectionKindEnum = pgEnum("section_kind", ["list", "text"]);
export const bookingSourceEnum = pgEnum("booking_source", ["web", "whatsapp"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "initiated",
  "paid",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);

/* ------------ PRODUCTS ------------ */
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    type: productTypeEnum("type").notNull(),
    template: productTemplateEnum("template").default("horizontal").notNull(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    currency: text("currency").default("AED").notNull(),

    // Tour-specific
    location: text("location"),
    durationDays: integer("duration_days"),
    priceFrom: numeric("price_from", { precision: 10, scale: 2 }),

    // Transport-specific
    makeAndModel: text("make_and_model"),
    ratePerHour: numeric("rate_per_hour", { precision: 10, scale: 2 }),
    ratePerDay: numeric("rate_per_day", { precision: 10, scale: 2 }),
    passengers: integer("passengers"),
    isActive: boolean("is_active").default(true),

    // Media / meta
    heroKey: text("hero_key"),
    tags: text("tags"),
    status: publishStatusEnum("status").default("draft").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("uq_products_slug").on(t.slug),
    typeIdx: index("idx_products_type").on(t.type),
    statusIdx: index("idx_products_status").on(t.status),
  })
);

/* ------------ PRODUCT IMAGES ------------ */
export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type"),
  position: integer("position").default(0),
  isHero: boolean("is_hero").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ------------ LEGACY / OTHER TABLES (unchanged) ------------ */
export const tourPackages = pgTable("tour_packages", {
  id: integer("id").primaryKey().default(sql`generated always as identity`),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  shortDescription: varchar("short_description", { length: 500 }),
  longDescription: varchar("long_description", { length: 8000 }),
  location: varchar("location", { length: 160 }),
  durationDays: integer("duration_days"),
  priceAED: numeric("price_aed", { precision: 10, scale: 2 }),
  heroImage: varchar("hero_image", { length: 1024 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  cardType: varchar("card_type", { length: 32 }).notNull().default("vertical"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transports = pgTable("vehicles", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  makeAndModel: text("make_and_model").notNull(),
  description: text("description"),
  passengers: integer("passengers").notNull().default(4),
  currency: char("currency", { length: 3 }).notNull().default("AED"),
  ratePerHour: numeric("rate_per_hour", { precision: 12, scale: 2 }).notNull(),
  ratePerDay: numeric("rate_per_day", { precision: 12, scale: 2 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

/* ------------ VISAS (Neon / Drizzle) ------------ */
export const visas = pgTable(
  "visas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    badge: badgeEnum("badge"),
    basePriceAmount: numeric("base_price_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    basePriceCurrency: char("base_price_currency", { length: 3 })
      .notNull()
      .default("AED"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeOrderIdx: index("ix_visas_active_order").on(t.isActive, t.displayOrder),
  })
);

export const visaFeatures = pgTable(
  "visa_features",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    visaId: bigint("visa_id", { mode: "number" })
      .notNull()
      .references(() => visas.id, { onDelete: "cascade", onUpdate: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(100),
    text: varchar("text", { length: 255 }).notNull(),
  },
  (t) => ({
    visaIdx: index("ix_features_visa").on(t.visaId, t.sortOrder),
  })
);

export const visaSections = pgTable(
  "visa_sections",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    visaId: bigint("visa_id", { mode: "number" })
      .notNull()
      .references(() => visas.id, { onDelete: "cascade", onUpdate: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(100),
    kind: sectionKindEnum("kind").notNull().default("text"),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body"),
  },
  (t) => ({
    visaIdx: index("ix_sections_visa").on(t.visaId, t.sortOrder),
  })
);

export const visaSectionItems = pgTable(
  "visa_section_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sectionId: bigint("section_id", { mode: "number" })
      .notNull()
      .references(() => visaSections.id, { onDelete: "cascade", onUpdate: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(100),
    text: varchar("text", { length: 300 }).notNull(),
  },
  (t) => ({
    sectionIdx: index("ix_items_section").on(t.sectionId, t.sortOrder),
  })
);

export const bookings = pgTable(
  "bookings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    visaId: bigint("visa_id", { mode: "number" })
      .notNull()
      .references(() => visas.id, { onDelete: "restrict", onUpdate: "cascade" }),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerEmail: varchar("customer_email", { length: 160 }),
    customerPhone: varchar("customer_phone", { length: 40 }),
    source: bookingSourceEnum("source").notNull().default("web"),
    status: bookingStatusEnum("status").notNull().default("initiated"),
    quotedAmount: numeric("quoted_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    currency: char("currency", { length: 3 }).notNull().default("AED"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    visaStatusIdx: index("ix_bookings_visa_status").on(t.visaId, t.status, t.createdAt),
  })
);

export const bookingDocuments = pgTable(
  "booking_documents",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bookingId: bigint("booking_id", { mode: "number" })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade", onUpdate: "cascade" }),
    kind: varchar("kind", { length: 60 }).notNull(),
    fileUrl: varchar("file_url", { length: 600 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookingIdx: index("ix_docs_booking").on(t.bookingId, t.kind),
  })
);


export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  heroKey: text("hero_key"),
  tags: text("tags"),
  status: varchar("status", { length: 16 }).default("draft").notNull(), // 'draft' | 'published'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const serviceImages = pgTable("service_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  position: integer("position"),
  isHero: boolean("is_hero").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const visasRelations = relations(visas, ({ many }) => ({
  features: many(visaFeatures),
  sections: many(visaSections),
  bookings: many(bookings),
}));

export const sectionsRelations = relations(visaSections, ({ many }) => ({
  items: many(visaSectionItems),
}));

// Schema bazei de date OLIZAN — clienti, administratori, comenzi, meniu, imagini.
// Cele doua sisteme de autentificare sunt separate la nivel de tabele:
// clientii traiesc in `customers`, administratorii in `admins`, iar sesiunile
// din `sessions` sunt legate de exact una dintre ele.
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------------------------------------- CLIENTI */
export const customers = pgTable("customers", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text().notNull(),
  phone: text().notNull().default(""),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------------------------- ADMINISTRATORI */
export const admins = pgTable("admins", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Cat timp ramane null, parola contului este inca cea din ADMIN_PASSWORD, deci
  // variabilele de mediu pot readuce contul la zi. Dupa o schimbare de parola din
  // panou campul se completeaza si mediul nu mai are voie sa suprascrie nimic.
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------ SESIUNI */
export const sessions = pgTable(
  "sessions",
  {
    id: serial().primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    // "customer" sau "admin" — o sesiune nu poate traversa cele doua zone
    kind: text().notNull(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    adminId: integer("admin_id").references(() => admins.id, { onDelete: "cascade" }),
    userAgent: text("user_agent").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_expires_idx").on(t.expiresAt)],
);

/* ----------------------------------------------- RESETAREA PAROLEI CLIENT */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial().primaryKey(),
    customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_customer_idx").on(t.customerId), index("password_reset_expires_idx").on(t.expiresAt)],
);

/* ------------------------------------------------- ADRESE SALVATE */
export const addresses = pgTable(
  "addresses",
  {
    id: serial().primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text().notNull().default("Acasă"),
    street: text().notNull(),
    city: text().notNull().default(""),
    details: text().notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_customer_idx").on(t.customerId)],
);

/* ------------------------------------------------------------ COMENZI */
export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text().notNull(),
    phone: text().notNull(),
    email: text().notNull().default(""),
    fulfilment: text().notNull().default("ridicare"), // ridicare | livrare
    address: text().notNull().default(""),
    notes: text().notNull().default(""),
    // Taxa de ambalaj pe toata comanda, tinuta separat de pretul produselor
    // ca sa poata fi aratata ca linie distincta clientului si in panou.
    // `total` include si aceasta suma.
    packaging: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
    status: text().notNull().default("noua"), // noua | confirmata | livrata | anulata
    // Coloana de pe tabla de comenzi din panou (kanban), tinuta separat de
    // `status` ca cele doua liste sa nu se influenteze: noua | pregatire |
    // gata | finalizata. `boardMovedAt` este momentul ultimei mutari, adica
    // exact ceasul de la care se numara cele 10 minute de asteptare, iar
    // `boardHidden` marcheaza comenzile scoase de administrator din istoric.
    boardStatus: text("board_status").notNull().default("noua"),
    boardMovedAt: timestamp("board_moved_at", { withTimezone: true }).notNull().defaultNow(),
    boardHidden: boolean("board_hidden").notNull().default(false),
    // Ziua de lucru (ora Romaniei) pentru care s-a alocat numarul comenzii si
    // numarul propriu-zis: 1, 2, 3... reluat de la 1 la fiecare zi noua.
    // Raman null pentru comenzile inregistrate inainte de introducerea numerotarii.
    orderDay: date("order_day"),
    dailyNumber: integer("daily_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId),
    index("orders_created_idx").on(t.createdAt),
    index("orders_board_idx").on(t.boardStatus, t.boardMovedAt),
    uniqueIndex("orders_day_number_idx").on(t.orderDay, t.dailyNumber),
  ],
);

/* Contorul zilnic al comenzilor. Un rand pe zi, incrementat atomic in
   Postgres (INSERT ... ON CONFLICT DO UPDATE), deci doua comenzi simultane
   nu pot primi niciodata acelasi numar. „Resetarea de la miezul noptii"
   se intampla de la sine: ziua urmatoare este pur si simplu un rand nou. */
export const orderCounters = pgTable("order_counters", {
  day: date().primaryKey(), // ziua de lucru, ex. "2026-08-11"
  lastNumber: integer("last_number").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().default(""),
    productName: text("product_name").notNull(),
    size: text().notNull().default(""),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
    // Ambalajul pentru o bucata din produs; 0 pentru produsele care nu se ambaleaza.
    packagingUnit: numeric("packaging_unit", { precision: 10, scale: 2 }).notNull().default("0"),
    quantity: integer().notNull().default(1),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* --------------------------- COSUL LEGAT DE CONTUL CLIENTULUI */
export const carts = pgTable("carts", {
  customerId: integer("customer_id")
    .primaryKey()
    .references(() => customers.id, { onDelete: "cascade" }),
  items: jsonb().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------ SETARILE SITE-ULUI
   Perechi cheie-valoare pentru optiunile administrate din panou. Prima
   dintre ele este `stare_comenzi`: deschis | pauza | concediu. Cat timp
   randul lipseste, site-ul functioneaza ca „deschis". */
export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: text().notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------- MENIU */
export const menuCategories = pgTable("menu_categories", {
  id: text().primaryKey(), // ex. "pizza"
  tab: text().notNull(),
  title: text().notNull(),
  note: text().notNull().default(""),
  image: text().notNull().default(""),
  position: integer().notNull().default(0),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: text().primaryKey(), // ex. "pizza-tonno"
    categoryId: text("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "cascade" }),
    groupTitle: text("group_title").notNull().default(""),
    groupPrefix: text("group_prefix").notNull().default(""),
    withSizes: boolean("with_sizes").notNull().default(false),
    name: text().notNull(),
    ingredients: text().notNull().default(""),
    weight: text().notNull().default(""),
    price: numeric({ precision: 10, scale: 2 }),
    priceLarge: numeric("price_large", { precision: 10, scale: 2 }),
    image: text().notNull().default(""),
    position: integer().notNull().default(0),
    active: boolean().notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("menu_items_category_idx").on(t.categoryId)],
);

/* --------------------------------------------- INCHIRIEREA SALII
   Zilele in care sala este deja ocupata. Un rand inseamna „ocupat": ziua
   libera pur si simplu nu are rand, deci calendarul public arata implicit
   toate zilele ca disponibile. Nota este doar pentru administrator (numele
   clientului, tipul evenimentului) si nu ajunge niciodata pe site. */
export const hallDates = pgTable("hall_dates", {
  day: date().primaryKey(), // ziua ocupata, ex. "2026-09-14"
  note: text().notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------- IMAGINI INCARCATE
   Fisierul propriu-zis sta in Netlify Blobs; aici tinem doar evidenta lui. */
export const siteImages = pgTable(
  "site_images",
  {
    id: serial().primaryKey(),
    slot: text().notNull(), // hero | galerie | produs
    slotKey: text("slot_key").notNull(), // "hero", id-ul produsului sau un id unic de galerie
    blobKey: text("blob_key").notNull(),
    contentType: text("content_type").notNull().default("image/jpeg"),
    alt: text().notNull().default(""),
    caption: text().notNull().default(""),
    position: integer().notNull().default(0),
    version: integer().notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("site_images_slot_key_idx").on(t.slot, t.slotKey)],
);

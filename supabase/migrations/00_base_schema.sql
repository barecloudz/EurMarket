-- ============================================================
-- European Market — Base Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'admin', 'supplier')),
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  payment_info  TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage categories"
  ON categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default European Market categories
INSERT INTO categories (name, slug, display_order) VALUES
  ('Meats & Deli',   'meats',       1),
  ('Dairy & Cheese', 'dairy',       2),
  ('Fresh Bakery',   'bakery',      3),
  ('Beverages',      'beverages',   4),
  ('Sweets & Candy', 'sweets',      5),
  ('Pantry & Jars',  'pantry',      6),
  ('Frozen Foods',   'frozen',      7),
  ('Snacks',         'snacks',      8)
ON CONFLICT (slug) DO NOTHING;

-- ── Products ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL,
  cost_price       NUMERIC(10,2),
  wholesale_cost   NUMERIC(10,2),
  compare_at_price NUMERIC(10,2),
  sku              TEXT UNIQUE,
  stock_quantity   INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  track_inventory  BOOLEAN NOT NULL DEFAULT true,
  continue_selling_when_out_of_stock BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  display_order    INT NOT NULL DEFAULT 0,
  print_time_hours NUMERIC(5,2),
  weight_oz        NUMERIC(8,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage all products"
  ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;

-- ── Product Images ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  alt_text     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images"
  ON product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── Product Variants ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  sku              TEXT,
  price_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity   INT NOT NULL DEFAULT 0,
  display_order    INT NOT NULL DEFAULT 0,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage variants"
  ON product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Saved Addresses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_line_1  TEXT NOT NULL,
  address_line_2  TEXT,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  postal_code     TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'US',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses"
  ON saved_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number              SERIAL UNIQUE,
  user_id                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_email               TEXT,
  guest_name                TEXT,
  guest_phone               TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','processing','shipped','partially_shipped','delivered','cancelled')),
  subtotal                  NUMERIC(10,2) NOT NULL,
  shipping_cost             NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax                       NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                     NUMERIC(10,2) NOT NULL,
  promo_code_id             UUID,
  shipping_address          JSONB NOT NULL,
  billing_address           JSONB,
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  tracking_number           TEXT,
  notes                     TEXT,
  shipping_label_pdf        TEXT,
  shipping_label_generated_at TIMESTAMPTZ,
  shippo_transaction_id     TEXT,
  shipping_label_refunded_at TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders"
  ON orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all orders"
  ON orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ── Order Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id          UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  supplier_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_name        TEXT NOT NULL,
  variant_name        TEXT,
  quantity            INT NOT NULL,
  unit_price          NUMERIC(10,2) NOT NULL,
  total_price         NUMERIC(10,2) NOT NULL,
  fulfillment_status  TEXT NOT NULL DEFAULT 'pending'
                        CHECK (fulfillment_status IN ('pending','processing','shipped','delivered')),
  tracking_number     TEXT,
  shipped_at          TIMESTAMPTZ,
  payout_status       TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payout_status IN ('pending','paid')),
  paid_out_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Admins manage all order items"
  ON order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── Promo Codes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT NOT NULL UNIQUE,
  description       TEXT,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value    NUMERIC(10,2) NOT NULL,
  min_order_amount  NUMERIC(10,2),
  max_uses          INT,
  uses_count        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  show_on_checkout  BOOLEAN NOT NULL DEFAULT false,
  starts_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage promo codes"
  ON promo_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Email Subscribers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_subscribers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT NOT NULL UNIQUE,
  first_name       TEXT,
  last_name        TEXT,
  source           TEXT CHECK (source IN ('checkout','register','footer','popup')),
  is_subscribed    BOOLEAN NOT NULL DEFAULT true,
  subscribed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe"
  ON email_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own subscription"
  ON email_subscribers FOR UPDATE USING (true);
CREATE POLICY "Admins view all subscribers"
  ON email_subscribers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Product Reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_name        TEXT NOT NULL,
  reviewer_email       TEXT NOT NULL,
  rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                TEXT,
  content              TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_approved          BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Authenticated users can submit reviews"
  ON product_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage reviews"
  ON product_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Wishlists ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist"
  ON wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ── Banner Slides ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banner_slides (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  subtitle      TEXT NOT NULL,
  badge         TEXT,
  cta_text      TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link      TEXT NOT NULL DEFAULT '/products',
  image_url     TEXT,
  gradient      TEXT NOT NULL DEFAULT 'from-[#8B0000] to-[#4A0000]',
  text_color    TEXT NOT NULL DEFAULT 'light' CHECK (text_color IN ('light','dark')),
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE banner_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active banners"
  ON banner_slides FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage banners"
  ON banner_slides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Store Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_settings (
  id                    INT PRIMARY KEY DEFAULT 1,
  store_name            TEXT NOT NULL DEFAULT 'European Market',
  logo_url              TEXT,
  hero_image_url        TEXT,
  contact_email         TEXT,
  default_shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  low_stock_threshold   INT NOT NULL DEFAULT 5,
  theme_settings        JSONB DEFAULT '{
    "primary_color":    "#D97706",
    "secondary_color":  "#B45309",
    "accent_color":     "#FACC15",
    "background_color": "#FAF9F7",
    "surface_color":    "#FFFFFF",
    "text_color":       "#1A1A1A",
    "border_color":     "#E8E2DB"
  }'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read store settings"
  ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admins update store settings"
  ON store_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert default settings row
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Inventory Adjustments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  previous_quantity INT NOT NULL,
  new_quantity      INT NOT NULL,
  adjustment        INT NOT NULL,
  reason            TEXT NOT NULL CHECK (reason IN ('sale','restock','damage','manual','return')),
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  admin_user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory"
  ON inventory_adjustments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Quote Requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  description      TEXT NOT NULL,
  reference_images TEXT[] DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','quoted','accepted','declined')),
  quoted_price     NUMERIC(10,2),
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit quote requests"
  ON quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage quote requests"
  ON quote_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- DONE — Run 20260401_supplier_system.sql next
-- ============================================================

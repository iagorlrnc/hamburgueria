-- Fix RLS policies to use auth.uid() instead of current_setting

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Anyone can view active menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can view all menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can insert menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Users can view items from their orders" ON order_items;
DROP POLICY IF EXISTS "Users can create items for their orders" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Recreate policies with auth.uid()
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Anyone can view active menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can view all menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Users can view items from their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY "Users can create items for their orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);
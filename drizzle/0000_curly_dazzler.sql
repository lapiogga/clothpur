CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`level` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_categories_parent_id` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`note` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_delivery_zones_store_id` ON `delivery_zones` (`store_id`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`spec_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_id`) REFERENCES `product_specs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_store_id` ON `inventory` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_product_spec` ON `inventory` (`product_id`,`spec_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_inventory_store_product_spec` ON `inventory` (`store_id`,`product_id`,`spec_id`);--> statement-breakpoint
CREATE TABLE `inventory_log` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`change_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text,
	`reference_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_log_inventory_id` ON `inventory_log` (`inventory_id`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`roles` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_menus_parent_id` ON `menus` (`parent_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`spec_id` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`item_type` text NOT NULL,
	`status` text DEFAULT 'ordered' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_id`) REFERENCES `product_specs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_product_id` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text,
	`order_type` text NOT NULL,
	`product_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_amount` integer NOT NULL,
	`delivery_method` text,
	`delivery_zone_id` text,
	`delivery_address` text,
	`cancel_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `idx_orders_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_store_id` ON `orders` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_order_type` ON `orders` (`order_type`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `point_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`point_type` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer,
	`description` text,
	`reference_type` text,
	`reference_id` text,
	`fiscal_year` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_point_ledger_user_id` ON `point_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_point_ledger_fiscal_year` ON `point_ledger` (`fiscal_year`);--> statement-breakpoint
CREATE INDEX `idx_point_ledger_created_at` ON `point_ledger` (`created_at`);--> statement-breakpoint
CREATE TABLE `point_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`used_points` integer DEFAULT 0 NOT NULL,
	`reserved_points` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `point_summary_user_id_unique` ON `point_summary` (`user_id`);--> statement-breakpoint
CREATE TABLE `product_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`spec_name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_product_specs_product_id` ON `product_specs` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text NOT NULL,
	`product_type` text NOT NULL,
	`price` integer NOT NULL,
	`image_url` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_products_category_id` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_products_product_type` ON `products` (`product_type`);--> statement-breakpoint
CREATE INDEX `idx_products_is_active` ON `products` (`is_active`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`manager_name` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stores_is_active` ON `stores` (`is_active`);--> statement-breakpoint
CREATE TABLE `tailor_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`tailor_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`ticket_count` integer DEFAULT 0 NOT NULL,
	`total_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tailor_id`) REFERENCES `tailors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tailor_settlements_tailor_id` ON `tailor_settlements` (`tailor_id`);--> statement-breakpoint
CREATE TABLE `tailoring_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` text NOT NULL,
	`order_item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`tailor_id` text,
	`registered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tailor_id`) REFERENCES `tailors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tailoring_tickets_ticket_number_unique` ON `tailoring_tickets` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `idx_tailoring_tickets_user_id` ON `tailoring_tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tailoring_tickets_tailor_id` ON `tailoring_tickets` (`tailor_id`);--> statement-breakpoint
CREATE INDEX `idx_tailoring_tickets_status` ON `tailoring_tickets` (`status`);--> statement-breakpoint
CREATE TABLE `tailors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`business_number` text,
	`representative` text,
	`address` text,
	`phone` text,
	`bank_name` text,
	`account_number` text,
	`account_holder` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tailors_is_active` ON `tailors` (`is_active`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`rank` text,
	`military_number` text,
	`unit` text,
	`enlist_date` text,
	`promotion_date` text,
	`retirement_date` text,
	`store_id` text,
	`tailor_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tailor_id`) REFERENCES `tailors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_store_id` ON `users` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_users_tailor_id` ON `users` (`tailor_id`);--> statement-breakpoint
CREATE INDEX `idx_users_is_active` ON `users` (`is_active`);
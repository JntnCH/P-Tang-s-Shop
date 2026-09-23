CREATE TABLE `purchaseOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantityOrdered` int NOT NULL DEFAULT 0,
	`unit` varchar(32) NOT NULL,
	`quantityReceived` int NOT NULL DEFAULT 0,
	`receivedAt` timestamp,
	CONSTRAINT `purchaseOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('draft','sent','partially_received','received') NOT NULL DEFAULT 'draft',
	`orderedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_orderId_purchaseOrders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `purchaseOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `purchase_order_items_order_idx` ON `purchaseOrderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_product_idx` ON `purchaseOrderItems` (`productId`);--> statement-breakpoint
CREATE INDEX `purchase_orders_status_idx` ON `purchaseOrders` (`status`);--> statement-breakpoint
CREATE INDEX `purchase_orders_ordered_at_idx` ON `purchaseOrders` (`orderedAt`);
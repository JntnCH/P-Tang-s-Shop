CREATE TABLE `stockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`type` enum('receive','issue','adjustment','opening') NOT NULL,
	`quantity` int NOT NULL,
	`quantityBefore` int NOT NULL,
	`quantityAfter` int NOT NULL,
	`referenceType` varchar(64),
	`referenceId` int,
	`note` varchar(500),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stockMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stockMovements` (`productId`);--> statement-breakpoint
CREATE INDEX `stock_movements_type_idx` ON `stockMovements` (`type`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stockMovements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `stock_movements_reference_idx` ON `stockMovements` (`referenceType`,`referenceId`);
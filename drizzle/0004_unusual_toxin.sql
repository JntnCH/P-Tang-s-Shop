CREATE TABLE `lineUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lineUserId` varchar(64) NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`displayName` varchar(255),
	`pictureUrl` varchar(1000),
	`canWrite` int NOT NULL DEFAULT 0,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lineUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `lineUsers_lineUserId_unique` UNIQUE(`lineUserId`)
);
--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `lineUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `lineOperationKey` varchar(128);--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stock_movements_line_operation_idx` UNIQUE(`lineUserId`,`lineOperationKey`);--> statement-breakpoint
CREATE INDEX `line_users_channel_idx` ON `lineUsers` (`channelId`);
CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`provider` varchar(40) NOT NULL,
	`providerMessageId` varchar(180),
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationTokens` (
	`provider` varchar(40) NOT NULL,
	`accountEmail` varchar(320) NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationTokens_provider` PRIMARY KEY(`provider`)
);
--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD `priority` enum('low','normal','high','urgent') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD `assignedAdminEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD `adminNotes` text;
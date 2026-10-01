CREATE TABLE `partnershipRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(180) NOT NULL,
	`contactName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`needs` text NOT NULL,
	`status` enum('Reçu','En qualification','Partenariat actif','Clôturé') NOT NULL DEFAULT 'Reçu',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnershipRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceKey` varchar(80) NOT NULL,
	`need` varchar(180) NOT NULL,
	`step` varchar(40) NOT NULL DEFAULT 'detail',
	`answers` text,
	`status` enum('in_progress','submitted','abandoned') NOT NULL DEFAULT 'in_progress',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowProgress_id` PRIMARY KEY(`id`)
);

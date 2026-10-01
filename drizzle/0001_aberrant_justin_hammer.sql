CREATE TABLE `applicationCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` int NOT NULL,
	`status` enum('Dossier ouvert','Pièces en vérification','Soumis à l’université','Décision attendue','Clôturé') NOT NULL DEFAULT 'Dossier ouvert',
	`progress` int NOT NULL DEFAULT 20,
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applicationCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(160) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`universityId` int NOT NULL,
	`level` enum('Bachelor','Master','Doctorat') NOT NULL,
	`field` varchar(180) NOT NULL,
	`intake` varchar(120) NOT NULL,
	`estimatedCost` varchar(120),
	`prerequisites` text,
	`requiredDocuments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceKey` varchar(80) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`country` varchar(80),
	`message` text,
	`attachmentCount` int NOT NULL DEFAULT 0,
	`status` enum('Reçu','En cours d’analyse','Documents complémentaires requis','Accepté','Refusé','Clôturé') NOT NULL DEFAULT 'Reçu',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `universities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country` varchar(80) NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(120) NOT NULL,
	`website` varchar(500),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `universities_id` PRIMARY KEY(`id`)
);

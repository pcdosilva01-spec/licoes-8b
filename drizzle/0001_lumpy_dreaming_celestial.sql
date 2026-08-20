CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` bigint NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `attachments_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int,
	`actorUserId` int,
	`eventType` varchar(80) NOT NULL,
	`objectId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`classId` int NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `classMembers_user_class_unique` UNIQUE(`userId`,`classId`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`maxUses` int NOT NULL DEFAULT 100,
	`usedCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`subject` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`lessonDate` timestamp NOT NULL,
	`dueDate` timestamp,
	`teacherName` varchar(120),
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `attachments_lesson_idx` ON `attachments` (`lessonId`);--> statement-breakpoint
CREATE INDEX `auditEvents_class_idx` ON `auditEvents` (`classId`);--> statement-breakpoint
CREATE INDEX `auditEvents_created_idx` ON `auditEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `classMembers_user_idx` ON `classMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `classMembers_class_idx` ON `classMembers` (`classId`);--> statement-breakpoint
CREATE INDEX `inviteTokens_class_idx` ON `inviteTokens` (`classId`);--> statement-breakpoint
CREATE INDEX `inviteTokens_expires_idx` ON `inviteTokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `lessons_class_idx` ON `lessons` (`classId`);--> statement-breakpoint
CREATE INDEX `lessons_expires_idx` ON `lessons` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `lessons_date_idx` ON `lessons` (`lessonDate`);--> statement-breakpoint
CREATE INDEX `lessons_subject_idx` ON `lessons` (`subject`);
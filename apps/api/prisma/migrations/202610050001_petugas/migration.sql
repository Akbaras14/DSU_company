ALTER TABLE `Batch` ADD COLUMN `assignedTo` VARCHAR(36) NULL, ADD COLUMN `plantedAt` DATE NULL;
CREATE INDEX `Batch_assignedTo_idx` ON `Batch`(`assignedTo`);
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE `Observation` (
  `id` VARCHAR(36) NOT NULL,
  `batchId` VARCHAR(100) NOT NULL,
  `observedBy` VARCHAR(36) NOT NULL,
  `observedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `method` VARCHAR(100) NOT NULL,
  `sampleCount` INTEGER NOT NULL,
  `measurements` JSON NOT NULL,
  `condition` VARCHAR(100) NOT NULL,
  `notes` VARCHAR(1000) NOT NULL,
  INDEX `Observation_batchId_observedAt_idx` (`batchId`, `observedAt`),
  INDEX `Observation_observedBy_idx` (`observedBy`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Observation_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Observation_observedBy_fkey` FOREIGN KEY (`observedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

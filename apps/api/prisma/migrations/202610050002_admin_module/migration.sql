-- AlterTable
ALTER TABLE `batch` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `damaged` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `dead` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `enteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `initialQuantity` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `notes` VARCHAR(1000) NOT NULL DEFAULT '',
    ADD COLUMN `publishedStock` INTEGER NULL,
    ADD COLUMN `sold` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('DRAFT', 'MONITORING', 'READY_REVIEW', 'READY_FOR_SALE', 'PARTIALLY_SOLD', 'SOLD_OUT', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'MONITORING',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `inventorytransaction` ADD COLUMN `afterQuantity` INTEGER NULL,
    ADD COLUMN `beforeQuantity` INTEGER NULL;

-- AlterTable
ALTER TABLE `observation` ADD COLUMN `correctionOf` VARCHAR(36) NULL,
    ADD COLUMN `health` ENUM('HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL') NOT NULL DEFAULT 'HEALTHY',
    ADD COLUMN `photoUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `shippingCost` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'PAID', 'READY_TO_SHIP', 'PAYMENT_REJECTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE `orderevent` MODIFY `status` ENUM('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'PAID', 'READY_TO_SHIP', 'PAYMENT_REJECTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'EXPIRED') NOT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `catalogStatus` ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SOLD_OUT') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `discountPrice` INTEGER NULL,
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `minimumStock` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `parameters` JSON NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL,
    ADD COLUMN `unit` VARCHAR(30) NOT NULL DEFAULT 'tanaman',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `variety` VARCHAR(100) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NurseryLocation` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(1000) NOT NULL DEFAULT '',
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `NurseryLocation_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReadinessApproval` (
    `id` VARCHAR(36) NOT NULL,
    `batchId` VARCHAR(100) NOT NULL,
    `observationId` VARCHAR(36) NOT NULL,
    `requestedBy` VARCHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(1000) NOT NULL DEFAULT '',
    `reviewedBy` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `ReadinessApproval_batchId_status_idx`(`batchId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(36) NOT NULL,
    `orderId` VARCHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `method` VARCHAR(100) NOT NULL,
    `proofUrl` VARCHAR(500) NOT NULL,
    `status` ENUM('WAITING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'WAITING',
    `reason` VARCHAR(1000) NOT NULL DEFAULT '',
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedBy` VARCHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Payment_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NOT NULL,
    `role` ENUM('ADMIN', 'PETUGAS', 'PELANGGAN') NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `description` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationRead` (
    `userId` VARCHAR(36) NOT NULL,
    `notificationKey` VARCHAR(150) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `notificationKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `companyName` VARCHAR(150) NOT NULL DEFAULT 'CV. Delta Sinergi Utama',
    `logoUrl` VARCHAR(500) NOT NULL DEFAULT '/images/logo/dsu_logo.svg',
    `address` VARCHAR(500) NOT NULL DEFAULT '',
    `phone` VARCHAR(30) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `minimumStock` INTEGER NOT NULL DEFAULT 5,
    `paymentTimeoutHours` INTEGER NOT NULL DEFAULT 24,
    `monitoringIntervalDays` INTEGER NOT NULL DEFAULT 7,
    `allowCustomerCancellation` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReadinessApproval` ADD CONSTRAINT `ReadinessApproval_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReadinessApproval` ADD CONSTRAINT `ReadinessApproval_observationId_fkey` FOREIGN KEY (`observationId`) REFERENCES `Observation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE Batch SET initialQuantity = physical + sold + damaged + dead, status = CASE WHEN approved > 0 THEN 'READY_FOR_SALE' ELSE 'MONITORING' END, publishedStock = approved, updatedAt = CURRENT_TIMESTAMP(3);
UPDATE Product SET catalogStatus = IF(published, 'PUBLISHED', 'DRAFT'), publishedAt = IF(published, CURRENT_TIMESTAMP(3), NULL), updatedAt = CURRENT_TIMESTAMP(3);
INSERT INTO Category (id, name) SELECT UUID(), category FROM Product GROUP BY category;
INSERT INTO NurseryLocation (id, name) SELECT CONCAT('legacy-', ROW_NUMBER() OVER (ORDER BY location)), location FROM Batch GROUP BY location;
INSERT INTO SystemSettings (id) VALUES (1);

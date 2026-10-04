CREATE TABLE `Province` (
  `id` CHAR(2) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  INDEX `Province_name_idx` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Regency` (
  `id` CHAR(4) NOT NULL,
  `provinceId` CHAR(2) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  INDEX `Regency_provinceId_name_idx` (`provinceId`, `name`),
  INDEX `Regency_name_idx` (`name`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Regency_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `Province` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `District` (
  `id` CHAR(7) NOT NULL,
  `regencyId` CHAR(4) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  INDEX `District_regencyId_name_idx` (`regencyId`, `name`),
  INDEX `District_name_idx` (`name`),
  PRIMARY KEY (`id`),
  CONSTRAINT `District_regencyId_fkey` FOREIGN KEY (`regencyId`) REFERENCES `Regency` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Village` (
  `id` CHAR(10) NOT NULL,
  `districtId` CHAR(7) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  INDEX `Village_districtId_name_idx` (`districtId`, `name`),
  INDEX `Village_name_idx` (`name`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Village_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `District` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

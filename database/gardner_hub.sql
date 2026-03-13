-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for gardner_hub
DROP DATABASE IF EXISTS `gardner_hub`;
CREATE DATABASE IF NOT EXISTS `gardner_hub` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `gardner_hub`;

-- Dumping structure for table gardner_hub.audit_logs
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `meta` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table gardner_hub.audit_logs: ~0 rows (approximately)

-- Dumping structure for view gardner_hub.category_latest_activity
DROP VIEW IF EXISTS `category_latest_activity`;
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `category_latest_activity` 
) ENGINE=MyISAM;

-- Dumping structure for table gardner_hub.comment_likes
DROP TABLE IF EXISTS `comment_likes`;
CREATE TABLE IF NOT EXISTS `comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_comment_like` (`comment_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.comment_likes: ~0 rows (approximately)

-- Dumping structure for table gardner_hub.document_requests
DROP TABLE IF EXISTS `document_requests`;
CREATE TABLE IF NOT EXISTS `document_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `document_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Cumulative Grade Report',
  `id_proof_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','under_review','resolved','rejected') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `grade_file_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `issued_document_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `idx_grade_inquiries_created_at` (`created_at` DESC),
  KEY `idx_grade_inquiries_updated_at` (`updated_at` DESC),
  KEY `idx_student_updated` (`student_id`,`updated_at` DESC),
  KEY `idx_grade_inquiries_status` (`status`,`created_at` DESC),
  CONSTRAINT `document_requests_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table gardner_hub.document_requests: ~0 rows (approximately)

-- Dumping structure for table gardner_hub.forum_posts
DROP TABLE IF EXISTS `forum_posts`;
CREATE TABLE IF NOT EXISTS `forum_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL,
  `author_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thread_id` (`thread_id`),
  KEY `author_id` (`author_id`),
  KEY `idx_forum_posts_created_at` (`created_at` DESC),
  CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`thread_id`) REFERENCES `forum_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.forum_posts: ~0 rows (approximately)

-- Dumping structure for table gardner_hub.forum_threads
DROP TABLE IF EXISTS `forum_threads`;
CREATE TABLE IF NOT EXISTS `forum_threads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('announcements','academic','materials','grades') NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `tag` varchar(50) DEFAULT NULL,
  `material_type` enum('Handout','Syllabus','Reference') DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `thumbnail_path` varchar(500) DEFAULT NULL,
  `is_downloadable` tinyint(1) NOT NULL DEFAULT '1',
  `image_url` varchar(255) DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `like_count` int DEFAULT '0',
  `author_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `academic_level` varchar(50) DEFAULT NULL,
  `course_strand` varchar(100) DEFAULT NULL,
  `year_grade` varchar(50) DEFAULT NULL,
  `semester` varchar(50) DEFAULT NULL,
  `subject_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_recent_activities_created_at` (`created_at` DESC),
  KEY `idx_recent_activities_category` (`category`,`created_at` DESC),
  KEY `idx_category_created` (`category`,`created_at` DESC),
  CONSTRAINT `forum_threads_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.forum_threads: ~3 rows (approximately)
INSERT INTO `forum_threads` (`id`, `category`, `title`, `content`, `tag`, `material_type`, `file_path`, `thumbnail_path`, `is_downloadable`, `image_url`, `link_url`, `like_count`, `author_id`, `created_at`, `updated_at`, `academic_level`, `course_strand`, `year_grade`, `semester`, `subject_name`) VALUES
	(5, 'announcements', '📢 𝐆𝐀𝐑𝐃𝐍𝐄𝐑 𝐁𝐀𝐋𝐈𝐓𝐀 𝐖𝐀𝐋𝐀𝐍𝐆 𝐏𝐀𝐒𝐎𝐊 | 𝐀𝐋𝐋 𝐋𝐄𝐕𝐄𝐋𝐒 | 𝐒𝐄𝐏𝐓𝐄𝐌𝐁𝐄𝐑 𝟐𝟐, 𝟐𝟎𝟐𝟓 (𝐌𝐎𝐍𝐃𝐀𝐘)', 'Based on Memorandum Circular No. 97, s. 2025 from Malacañang, all classes in Metro Manila are suspended tomorrow, September 22, 2025 (Monday), due to the expected bad weather caused by Bagyong Nando.', 'Class Suspension', NULL, NULL, NULL, 1, '1772718976474-864103673.jpg', NULL, 0, 2, '2026-03-05 13:56:16', '2026-03-05 13:56:16', NULL, NULL, NULL, NULL, NULL),
	(6, 'announcements', 'ANNOUNCEMENT!', 'This is the class schedule for 1st Year BSIT 1C Term 2', 'Class Schedule', NULL, NULL, NULL, 1, '1772719247100-19177664.jpg', NULL, 0, 2, '2026-03-05 14:00:47', '2026-03-05 14:00:47', NULL, NULL, NULL, NULL, NULL);

-- Dumping structure for table gardner_hub.notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `category` enum('announcement','academic','materials','document_request') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`),
  KEY `idx_notifications_category` (`user_id`,`category`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.notifications: ~0 rows (approximately)
INSERT INTO `notifications` (`id`, `user_id`, `category`, `message`, `is_read`, `created_at`) VALUES
	(1, 1, 'academic', 'Test notification', 1, '2026-03-13 12:22:33'),
	(2, 1, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:25:14'),
	(3, 2, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:25:14'),
	(4, 5, 'academic', 'Blady started a new discussion: Class', 1, '2026-03-13 12:33:38'),
	(5, 3, 'academic', 'Blady started a new discussion: Class', 1, '2026-03-13 12:33:38'),
	(6, 2, 'academic', 'Blady started a new discussion: Class', 1, '2026-03-13 12:33:38'),
	(7, 1, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:34:23'),
	(8, 5, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:34:23'),
	(9, 5, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:39:23'),
	(10, 3, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:39:23'),
	(11, 1, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:39:23'),
	(12, 5, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:56:42'),
	(13, 3, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:56:42'),
	(14, 1, 'announcement', 'New announcement: ANNOUNCEMENT!', 1, '2026-03-13 12:56:42'),
	(15, 5, 'academic', 'Blady started a new discussion: fddfd', 1, '2026-03-13 12:57:45'),
	(16, 3, 'academic', 'Blady started a new discussion: fddfd', 0, '2026-03-13 12:57:45'),
	(17, 2, 'academic', 'Blady started a new discussion: fddfd', 1, '2026-03-13 12:57:45'),
	(18, 1, 'academic', 'New comment on your thread: fddfd', 1, '2026-03-13 12:59:02'),
	(19, 5, 'document_request', 'New document request: Cumulative Grade Report', 1, '2026-03-13 13:00:44'),
	(20, 1, 'document_request', 'Your document request is now: Pending', 1, '2026-03-13 13:01:25'),
	(21, 1, 'document_request', 'Your document request is now: Pending', 1, '2026-03-13 13:01:36'),
	(22, 5, 'document_request', 'New document request: Cumulative Grade Report', 1, '2026-03-13 13:07:07'),
	(23, 5, 'document_request', 'New document request: Form 137 (Permanent Record)', 1, '2026-03-13 13:29:44'),
	(24, 1, 'document_request', 'Your document request is now: Pending', 1, '2026-03-13 13:33:29'),
	(25, 1, 'document_request', 'Your request for Form 137 (Permanent Record) has been resolved. You can now view or download it.', 1, '2026-03-13 13:33:47'),
	(26, 5, 'document_request', 'New document request: Certificate of Enrollment (COE)', 1, '2026-03-13 13:43:48'),
	(27, 1, 'document_request', 'Your document request is now: Under Review', 1, '2026-03-13 13:45:14'),
	(28, 1, 'document_request', 'Your request for Certificate of Enrollment (COE) has been resolved. You can now view or download it.', 1, '2026-03-13 13:45:39');

-- Dumping structure for table gardner_hub.post_comments
DROP TABLE IF EXISTS `post_comments`;
CREATE TABLE IF NOT EXISTS `post_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `content` text NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_post_id_covering` (`post_id`,`id`),
  KEY `idx_post_comments_created_at` (`created_at` DESC),
  KEY `idx_parent_id` (`parent_id`),
  CONSTRAINT `fk_comment_parent` FOREIGN KEY (`parent_id`) REFERENCES `post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.post_comments: ~3 rows (approximately)

-- Dumping structure for table gardner_hub.post_likes
DROP TABLE IF EXISTS `post_likes`;
CREATE TABLE IF NOT EXISTS `post_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table gardner_hub.post_likes: ~1 rows (approximately)

-- Dumping structure for view gardner_hub.recent_activities_view
DROP VIEW IF EXISTS `recent_activities_view`;
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `recent_activities_view` 
) ENGINE=MyISAM;

-- Dumping structure for table gardner_hub.users
DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `school_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('student','faculty','admin') COLLATE utf8mb4_general_ci NOT NULL,
  `department_course` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('active','pending','approved') COLLATE utf8mb4_general_ci DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_photo` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `show_school_id` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_id` (`school_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_created_at` (`created_at` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table gardner_hub.users: ~4 rows (approximately)
INSERT INTO `users` (`id`, `full_name`, `school_id`, `role`, `department_course`, `email`, `password`, `status`, `created_at`, `profile_photo`, `show_school_id`) VALUES
	(1, 'Blady', 'GCD 2023 T111434', 'student', 'BSCS', 'blady@gmail.com', '$2b$10$UA2l5fGpW3BU5Sd30rLUVuCSfmOqSl/BjIFCovj2yfs2NVDUSxoxe', 'approved', '2026-02-24 10:13:40', NULL, 1),
	(2, 'Charles', 'GCD 2022 T1136543', 'faculty', 'ADM', 'charles@gmail.com', '$2b$10$fBmhBh6oTI4DDshv5ZgJteEQbbyI0J2vcp9tOTNmWcc32.DDh9RpC', 'approved', '2026-02-25 04:22:02', NULL, 1),
	(3, 'System Administrator', 'ADMIN-001', 'admin', 'Administration', 'admin@gmail.com', '$2b$10$Fd09OFM31XjX5mYbszxj3.PwZxfYMzSoepw77nV.WpCwNbe1ut7Vy', 'approved', '2026-02-25 05:17:26', NULL, 1),
	(5, 'Juan Dela Cruz', 'GCD 2022 T1141332', 'faculty', 'Registrar Office', 'juan@gmail.com', '$2b$10$28LrQ0KiqAlJo6IGiBYhYuM0sfLjoZM2IKshYCQhR3Bg06mLjcsDm', 'approved', '2026-03-11 12:38:46', NULL, 1);

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `category_latest_activity`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `category_latest_activity` AS select `recent_activities_view`.`category` AS `category`,`recent_activities_view`.`activity_type` AS `activity_type`,`recent_activities_view`.`title` AS `title`,`recent_activities_view`.`author_name` AS `author_name`,`recent_activities_view`.`author_role` AS `author_role`,`recent_activities_view`.`created_at` AS `created_at`,row_number() OVER (PARTITION BY `recent_activities_view`.`category` ORDER BY `recent_activities_view`.`created_at` desc )  AS `rn` from `recent_activities_view` where (`recent_activities_view`.`category` is not null);

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `recent_activities_view`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `recent_activities_view` AS select ('thread' collate utf8mb4_0900_ai_ci) AS `activity_type`,`ft`.`id` AS `item_id`,(`ft`.`category` collate utf8mb4_0900_ai_ci) AS `category`,(`ft`.`title` collate utf8mb4_0900_ai_ci) AS `title`,(`ft`.`content` collate utf8mb4_0900_ai_ci) AS `content`,`ft`.`author_id` AS `author_id`,(`u`.`full_name` collate utf8mb4_0900_ai_ci) AS `author_name`,(`u`.`role` collate utf8mb4_0900_ai_ci) AS `author_role`,`ft`.`created_at` AS `created_at`,`ft`.`updated_at` AS `updated_at` from (`forum_threads` `ft` join `users` `u` on((`ft`.`author_id` = `u`.`id`))) union all select ('post' collate utf8mb4_0900_ai_ci) AS `activity_type`,`fp`.`id` AS `item_id`,(`ft`.`category` collate utf8mb4_0900_ai_ci) AS `category`,(concat('Reply to: ',`ft`.`title`) collate utf8mb4_0900_ai_ci) AS `title`,(`fp`.`content` collate utf8mb4_0900_ai_ci) AS `content`,`fp`.`author_id` AS `author_id`,(`u`.`full_name` collate utf8mb4_0900_ai_ci) AS `author_name`,(`u`.`role` collate utf8mb4_0900_ai_ci) AS `author_role`,`fp`.`created_at` AS `created_at`,`fp`.`created_at` AS `updated_at` from ((`forum_posts` `fp` join `forum_threads` `ft` on((`fp`.`thread_id` = `ft`.`id`))) join `users` `u` on((`fp`.`author_id` = `u`.`id`))) union all select ('comment' collate utf8mb4_0900_ai_ci) AS `activity_type`,`pc`.`id` AS `item_id`,(`ft`.`category` collate utf8mb4_0900_ai_ci) AS `category`,(concat('Comment on: ',`ft`.`title`) collate utf8mb4_0900_ai_ci) AS `title`,(`pc`.`content` collate utf8mb4_0900_ai_ci) AS `content`,`pc`.`user_id` AS `author_id`,(`u`.`full_name` collate utf8mb4_0900_ai_ci) AS `author_name`,(`u`.`role` collate utf8mb4_0900_ai_ci) AS `author_role`,`pc`.`created_at` AS `created_at`,`pc`.`created_at` AS `updated_at` from ((`post_comments` `pc` join `forum_threads` `ft` on((`pc`.`post_id` = `ft`.`id`))) join `users` `u` on((`pc`.`user_id` = `u`.`id`))) union all select ('inquiry' collate utf8mb4_0900_ai_ci) AS `activity_type`,`gi`.`id` AS `item_id`,('grades' collate utf8mb4_0900_ai_ci) AS `category`,(concat('Grade inquiry is now ',upper(`gi`.`status`)) collate utf8mb4_0900_ai_ci) AS `title`,(concat('Status: ',`gi`.`status`) collate utf8mb4_0900_ai_ci) AS `content`,`gi`.`student_id` AS `author_id`,(`u`.`full_name` collate utf8mb4_0900_ai_ci) AS `author_name`,(`u`.`role` collate utf8mb4_0900_ai_ci) AS `author_role`,`gi`.`created_at` AS `created_at`,`gi`.`updated_at` AS `updated_at` from (`grade_inquiries` `gi` join `users` `u` on((`gi`.`student_id` = `u`.`id`)));

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

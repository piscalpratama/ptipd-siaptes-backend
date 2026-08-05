-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 08, 2026 at 06:34 AM
-- Server version: 8.0.46-0ubuntu0.24.04.3
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `prod_siaptes`
--

-- --------------------------------------------------------

--
-- Table structure for table `ci_jwt`
--

CREATE TABLE `ci_jwt` (
  `id_jwt` int NOT NULL,
  `headers` mediumtext,
  `ip_address` varchar(255) NOT NULL,
  `token` longtext NOT NULL,
  `expire_at` varchar(50) NOT NULL,
  `expired` enum('YA','TIDAK') NOT NULL,
  `keterangan` enum('LOGIN','LOGOUT','EXPIRED BY SYSTEM') NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ci_responses`
--

CREATE TABLE `ci_responses` (
  `id` int NOT NULL,
  `tipe` varchar(100) DEFAULT NULL,
  `headers` longtext,
  `request` longtext,
  `response` longtext,
  `date_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ci_session`
--

CREATE TABLE `ci_session` (
  `id` varchar(128) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `timestamp` int UNSIGNED NOT NULL DEFAULT '0',
  `data` blob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbh_jawaban`
--

CREATE TABLE `tbh_jawaban` (
  `idh_jawaban` int NOT NULL,
  `idh_tes` int NOT NULL,
  `idm_pilihan` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `idm_soal` int DEFAULT NULL,
  `jawaban_essai` text,
  `nilai` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbh_tes`
--

CREATE TABLE `tbh_tes` (
  `idh_tes` int NOT NULL,
  `idm_tes` int NOT NULL,
  `percobaan` int DEFAULT '0',
  `data_soal` longtext,
  `nilai` int DEFAULT '0',
  `detail_nilai` text,
  `waktu_mulai` datetime NOT NULL,
  `waktu_akhir` datetime DEFAULT NULL,
  `status` int NOT NULL DEFAULT '0' COMMENT '0=belum selesai, 1=mulai, 2=selesai',
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_grup`
--

CREATE TABLE `tbm_grup` (
  `idm_grup` int NOT NULL,
  `nama_grup` varchar(255) NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_modul`
--

CREATE TABLE `tbm_modul` (
  `idm_modul` int NOT NULL,
  `modul` varchar(250) NOT NULL,
  `is_visible` int NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_pilihan`
--

CREATE TABLE `tbm_pilihan` (
  `idm_pilihan` int NOT NULL,
  `idm_soal` int NOT NULL,
  `pilihan` text NOT NULL,
  `media` varchar(255) DEFAULT NULL,
  `jawaban` int DEFAULT '0',
  `is_visible` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_soal`
--

CREATE TABLE `tbm_soal` (
  `idm_soal` int NOT NULL,
  `idm_topik` int NOT NULL,
  `soal` text NOT NULL,
  `media` varchar(250) DEFAULT NULL,
  `tipe_soal` enum('PILIHAN GANDA','JAWABAN SINGKAT','ESSAI','SKALA') NOT NULL,
  `jawaban` text COMMENT 'jika tipe soal jawaban singkat',
  `tingkat_kesulitan` int NOT NULL DEFAULT '1',
  `is_visible` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_tes`
--

CREATE TABLE `tbm_tes` (
  `idm_tes` int NOT NULL,
  `nama_tes` varchar(255) NOT NULL,
  `keterangan` text NOT NULL,
  `tgl_mulai` datetime NOT NULL,
  `tgl_akhir` datetime NOT NULL,
  `durasi` int NOT NULL,
  `status_hasil` int NOT NULL,
  `status_detail_tes` int NOT NULL,
  `skor_maksimal` double NOT NULL,
  `status_token` int NOT NULL,
  `is_deleted` int NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_token`
--

CREATE TABLE `tbm_token` (
  `idm_token` int NOT NULL,
  `idr_tes_grup` int NOT NULL,
  `token` varchar(10) NOT NULL,
  `expired` datetime DEFAULT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tbm_topik`
--

CREATE TABLE `tbm_topik` (
  `idm_topik` int NOT NULL,
  `idm_modul` int DEFAULT NULL,
  `topik` varchar(255) DEFAULT NULL,
  `deskripsi` text,
  `is_visible` int DEFAULT NULL COMMENT '0 (False), 1 (True)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbr_tes_grup`
--

CREATE TABLE `tbr_tes_grup` (
  `idr_tes_grup` int NOT NULL,
  `idm_tes` int NOT NULL,
  `idm_grup` int NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbr_tes_topik`
--

CREATE TABLE `tbr_tes_topik` (
  `idr_tes_topik` int NOT NULL,
  `idm_topik` int NOT NULL,
  `idm_tes` int NOT NULL,
  `tipe_soal` enum('PILIHAN GANDA','SKALA','JAWABAN SINGKAT','ESSAI') NOT NULL,
  `tingkat_kesulitan` int NOT NULL,
  `jumlah_soal` int NOT NULL,
  `jumlah_pilihan` int NOT NULL,
  `acak_soal` int NOT NULL,
  `acak_pilihan` int NOT NULL,
  `skor_benar` int NOT NULL,
  `skor_salah` int NOT NULL,
  `skor_tidak_jawab` int NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbs_sistem`
--

CREATE TABLE `tbs_sistem` (
  `ids_sistem` int NOT NULL,
  `nama_setting` varchar(255) DEFAULT NULL,
  `setting` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int NOT NULL,
  `updated_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbs_user`
--

CREATE TABLE `tbs_user` (
  `ids_user` int NOT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `level` enum('SUPERADMIN','ADMIN - SOAL','ADMIN - TES','PESERTA') DEFAULT NULL,
  `detail` text,
  `idm_grup` text,
  `login` datetime DEFAULT NULL,
  `ip_login` varchar(255) DEFAULT NULL,
  `logout` datetime DEFAULT NULL,
  `ip_logout` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewh_jawaban`
-- (See below for the actual view)
--
CREATE TABLE `viewh_jawaban` (
`idh_jawaban` int
,`idh_tes` int
,`idm_tes` int
,`nama` varchar(255)
,`username` varchar(255)
,`nama_tes` varchar(255)
,`keterangan` text
,`tgl_mulai` datetime
,`tgl_akhir` datetime
,`durasi` int
,`waktu_mulai` datetime
,`waktu_akhir` datetime
,`idm_pilihan` int
,`soal` text
,`idm_topik` int
,`topik` varchar(255)
,`tipe_soal` enum('PILIHAN GANDA','JAWABAN SINGKAT','ESSAI','SKALA')
,`jawaban` int
,`pilihan` text
,`nilai` int
,`jawaban_essai` text
,`idm_soal` int
,`created_by` int
,`updated_by` int
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewh_tes`
-- (See below for the actual view)
--
CREATE TABLE `viewh_tes` (
`idh_tes` int
,`idm_tes` int
,`data_soal` longtext
,`percobaan` int
,`nama` varchar(255)
,`username` varchar(255)
,`level` enum('SUPERADMIN','ADMIN - SOAL','ADMIN - TES','PESERTA')
,`detail` text
,`idm_grup` text
,`nama_tes` varchar(255)
,`keterangan` text
,`tgl_mulai` datetime
,`tgl_akhir` datetime
,`durasi` int
,`is_deleted` int
,`nilai` int
,`detail_nilai` text
,`waktu_mulai` datetime
,`waktu_akhir` datetime
,`status` int
,`created_by` int
,`updated_by` int
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewm_pilihan`
-- (See below for the actual view)
--
CREATE TABLE `viewm_pilihan` (
`idm_pilihan` int
,`idm_soal` int
,`idm_topik` int
,`idm_modul` int
,`modul` varchar(250)
,`topik` varchar(255)
,`deskripsi` text
,`soal` text
,`tipe_soal` enum('PILIHAN GANDA','JAWABAN SINGKAT','ESSAI','SKALA')
,`tingkat_kesulitan` int
,`pilihan` text
,`jawaban` int
,`is_visible` int
,`created_by` int
,`created_at` timestamp
,`updated_at` timestamp
,`updated_by` int
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewm_soal`
-- (See below for the actual view)
--
CREATE TABLE `viewm_soal` (
`idm_soal` int
,`idm_topik` int
,`idm_modul` int
,`modul` varchar(250)
,`topik` varchar(255)
,`deskripsi` text
,`soal` text
,`media` varchar(250)
,`tipe_soal` enum('PILIHAN GANDA','JAWABAN SINGKAT','ESSAI','SKALA')
,`jawaban` text
,`tingkat_kesulitan` int
,`is_visible` int
,`created_by` int
,`created_at` timestamp
,`updated_by` int
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewm_token`
-- (See below for the actual view)
--
CREATE TABLE `viewm_token` (
`idm_token` int
,`idr_tes_grup` int
,`idm_tes` int
,`nama_tes` varchar(255)
,`idm_grup` int
,`nama_grup` varchar(255)
,`token` varchar(10)
,`expired` datetime
,`created_by` int
,`updated_by` int
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewm_topik`
-- (See below for the actual view)
--
CREATE TABLE `viewm_topik` (
`idm_topik` int
,`idm_modul` int
,`modul` varchar(250)
,`topik` varchar(255)
,`deskripsi` text
,`is_visible` int
,`created_at` timestamp
,`updated_at` timestamp
,`created_by` int
,`updated_by` int
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewr_tes_grup`
-- (See below for the actual view)
--
CREATE TABLE `viewr_tes_grup` (
`idr_tes_grup` int
,`idm_tes` int
,`nama_tes` varchar(255)
,`keterangan` text
,`tgl_mulai` datetime
,`tgl_akhir` datetime
,`durasi` int
,`status_hasil` int
,`status_detail_tes` int
,`skor_maksimal` double
,`status_token` int
,`idm_grup` int
,`nama_grup` varchar(255)
,`created_by` int
,`updated_by` int
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `viewr_tes_topik`
-- (See below for the actual view)
--
CREATE TABLE `viewr_tes_topik` (
`idr_tes_topik` int
,`idm_topik` int
,`idm_modul` int
,`modul` varchar(250)
,`topik` varchar(255)
,`deskripsi` text
,`is_visible` int
,`idm_tes` int
,`nama_tes` varchar(255)
,`keterangan` text
,`tgl_mulai` datetime
,`tgl_akhir` datetime
,`durasi` int
,`status_hasil` int
,`status_detail_tes` int
,`skor_benar` int
,`skor_salah` int
,`skor_tidak_jawab` int
,`skor_maksimal` double
,`status_token` int
,`is_deleted` int
,`tipe_soal` enum('PILIHAN GANDA','SKALA','JAWABAN SINGKAT','ESSAI')
,`tingkat_kesulitan` int
,`jumlah_soal` int
,`jumlah_pilihan` int
,`acak_soal` int
,`acak_pilihan` int
,`created_by` int
,`updated_by` int
,`created_at` timestamp
,`updated_at` timestamp
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ci_jwt`
--
ALTER TABLE `ci_jwt`
  ADD PRIMARY KEY (`id_jwt`),
  ADD KEY `id_jwt` (`id_jwt`);

--
-- Indexes for table `ci_responses`
--
ALTER TABLE `ci_responses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ci_session`
--
ALTER TABLE `ci_session`
  ADD PRIMARY KEY (`id`,`ip_address`),
  ADD KEY `ci_sessions_timestamp` (`timestamp`);

--
-- Indexes for table `tbh_jawaban`
--
ALTER TABLE `tbh_jawaban`
  ADD PRIMARY KEY (`idh_jawaban`);

--
-- Indexes for table `tbh_tes`
--
ALTER TABLE `tbh_tes`
  ADD PRIMARY KEY (`idh_tes`);

--
-- Indexes for table `tbm_grup`
--
ALTER TABLE `tbm_grup`
  ADD PRIMARY KEY (`idm_grup`);

--
-- Indexes for table `tbm_modul`
--
ALTER TABLE `tbm_modul`
  ADD PRIMARY KEY (`idm_modul`);

--
-- Indexes for table `tbm_pilihan`
--
ALTER TABLE `tbm_pilihan`
  ADD PRIMARY KEY (`idm_pilihan`);

--
-- Indexes for table `tbm_soal`
--
ALTER TABLE `tbm_soal`
  ADD PRIMARY KEY (`idm_soal`);

--
-- Indexes for table `tbm_tes`
--
ALTER TABLE `tbm_tes`
  ADD PRIMARY KEY (`idm_tes`);

--
-- Indexes for table `tbm_token`
--
ALTER TABLE `tbm_token`
  ADD PRIMARY KEY (`idm_token`);

--
-- Indexes for table `tbm_topik`
--
ALTER TABLE `tbm_topik`
  ADD PRIMARY KEY (`idm_topik`);

--
-- Indexes for table `tbr_tes_grup`
--
ALTER TABLE `tbr_tes_grup`
  ADD PRIMARY KEY (`idr_tes_grup`);

--
-- Indexes for table `tbr_tes_topik`
--
ALTER TABLE `tbr_tes_topik`
  ADD PRIMARY KEY (`idr_tes_topik`);

--
-- Indexes for table `tbs_sistem`
--
ALTER TABLE `tbs_sistem`
  ADD PRIMARY KEY (`ids_sistem`);

--
-- Indexes for table `tbs_user`
--
ALTER TABLE `tbs_user`
  ADD PRIMARY KEY (`ids_user`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ci_jwt`
--
ALTER TABLE `ci_jwt`
  MODIFY `id_jwt` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ci_responses`
--
ALTER TABLE `ci_responses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbh_jawaban`
--
ALTER TABLE `tbh_jawaban`
  MODIFY `idh_jawaban` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbh_tes`
--
ALTER TABLE `tbh_tes`
  MODIFY `idh_tes` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_grup`
--
ALTER TABLE `tbm_grup`
  MODIFY `idm_grup` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_modul`
--
ALTER TABLE `tbm_modul`
  MODIFY `idm_modul` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_pilihan`
--
ALTER TABLE `tbm_pilihan`
  MODIFY `idm_pilihan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_soal`
--
ALTER TABLE `tbm_soal`
  MODIFY `idm_soal` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_tes`
--
ALTER TABLE `tbm_tes`
  MODIFY `idm_tes` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_token`
--
ALTER TABLE `tbm_token`
  MODIFY `idm_token` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbm_topik`
--
ALTER TABLE `tbm_topik`
  MODIFY `idm_topik` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbr_tes_grup`
--
ALTER TABLE `tbr_tes_grup`
  MODIFY `idr_tes_grup` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbr_tes_topik`
--
ALTER TABLE `tbr_tes_topik`
  MODIFY `idr_tes_topik` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbs_sistem`
--
ALTER TABLE `tbs_sistem`
  MODIFY `ids_sistem` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbs_user`
--
ALTER TABLE `tbs_user`
  MODIFY `ids_user` int NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `viewh_jawaban`
--
DROP TABLE IF EXISTS `viewh_jawaban`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewh_jawaban`  AS SELECT `a`.`idh_jawaban` AS `idh_jawaban`, `a`.`idh_tes` AS `idh_tes`, `b`.`idm_tes` AS `idm_tes`, `b`.`nama` AS `nama`, `b`.`username` AS `username`, `b`.`nama_tes` AS `nama_tes`, `b`.`keterangan` AS `keterangan`, `b`.`tgl_mulai` AS `tgl_mulai`, `b`.`tgl_akhir` AS `tgl_akhir`, `b`.`durasi` AS `durasi`, `b`.`waktu_mulai` AS `waktu_mulai`, `b`.`waktu_akhir` AS `waktu_akhir`, `a`.`idm_pilihan` AS `idm_pilihan`, `c`.`soal` AS `soal`, `c`.`idm_topik` AS `idm_topik`, `c`.`topik` AS `topik`, `c`.`tipe_soal` AS `tipe_soal`, `d`.`jawaban` AS `jawaban`, `d`.`pilihan` AS `pilihan`, `a`.`nilai` AS `nilai`, `a`.`jawaban_essai` AS `jawaban_essai`, `a`.`idm_soal` AS `idm_soal`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM (((`tbh_jawaban` `a` join `viewh_tes` `b` on((`a`.`idh_tes` = `b`.`idh_tes`))) left join `viewm_soal` `c` on((`a`.`idm_soal` = `c`.`idm_soal`))) left join `viewm_pilihan` `d` on(((`a`.`idm_pilihan` = `d`.`idm_pilihan`) and (`d`.`idm_soal` = `a`.`idm_soal`)))) ;

-- --------------------------------------------------------

--
-- Structure for view `viewh_tes`
--
DROP TABLE IF EXISTS `viewh_tes`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewh_tes`  AS SELECT `a`.`idh_tes` AS `idh_tes`, `a`.`idm_tes` AS `idm_tes`, `a`.`data_soal` AS `data_soal`, `a`.`percobaan` AS `percobaan`, `c`.`nama` AS `nama`, `c`.`username` AS `username`, `c`.`level` AS `level`, `c`.`detail` AS `detail`, `c`.`idm_grup` AS `idm_grup`, `b`.`nama_tes` AS `nama_tes`, `b`.`keterangan` AS `keterangan`, `b`.`tgl_mulai` AS `tgl_mulai`, `b`.`tgl_akhir` AS `tgl_akhir`, `b`.`durasi` AS `durasi`, `b`.`is_deleted` AS `is_deleted`, `a`.`nilai` AS `nilai`, `a`.`detail_nilai` AS `detail_nilai`, `a`.`waktu_mulai` AS `waktu_mulai`, `a`.`waktu_akhir` AS `waktu_akhir`, `a`.`status` AS `status`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM ((`tbh_tes` `a` join `tbm_tes` `b`) join `tbs_user` `c`) WHERE ((`a`.`idm_tes` = `b`.`idm_tes`) AND (`a`.`created_by` = `c`.`ids_user`)) ;

-- --------------------------------------------------------

--
-- Structure for view `viewm_pilihan`
--
DROP TABLE IF EXISTS `viewm_pilihan`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewm_pilihan`  AS SELECT `a`.`idm_pilihan` AS `idm_pilihan`, `a`.`idm_soal` AS `idm_soal`, `b`.`idm_topik` AS `idm_topik`, `b`.`idm_modul` AS `idm_modul`, `b`.`modul` AS `modul`, `b`.`topik` AS `topik`, `b`.`deskripsi` AS `deskripsi`, `b`.`soal` AS `soal`, `b`.`tipe_soal` AS `tipe_soal`, `b`.`tingkat_kesulitan` AS `tingkat_kesulitan`, `a`.`pilihan` AS `pilihan`, `a`.`jawaban` AS `jawaban`, `a`.`is_visible` AS `is_visible`, `a`.`created_by` AS `created_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at`, `a`.`updated_by` AS `updated_by` FROM (`tbm_pilihan` `a` join `viewm_soal` `b`) WHERE (`a`.`idm_soal` = `b`.`idm_soal`) ;

-- --------------------------------------------------------

--
-- Structure for view `viewm_soal`
--
DROP TABLE IF EXISTS `viewm_soal`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewm_soal`  AS SELECT `a`.`idm_soal` AS `idm_soal`, `a`.`idm_topik` AS `idm_topik`, `b`.`idm_modul` AS `idm_modul`, `b`.`modul` AS `modul`, `b`.`topik` AS `topik`, `b`.`deskripsi` AS `deskripsi`, `a`.`soal` AS `soal`, `a`.`media` AS `media`, `a`.`tipe_soal` AS `tipe_soal`, `a`.`jawaban` AS `jawaban`, `a`.`tingkat_kesulitan` AS `tingkat_kesulitan`, `a`.`is_visible` AS `is_visible`, `a`.`created_by` AS `created_by`, `a`.`created_at` AS `created_at`, `a`.`updated_by` AS `updated_by`, `a`.`updated_at` AS `updated_at` FROM (`tbm_soal` `a` join `viewm_topik` `b`) WHERE (`a`.`idm_topik` = `b`.`idm_topik`) ;

-- --------------------------------------------------------

--
-- Structure for view `viewm_token`
--
DROP TABLE IF EXISTS `viewm_token`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewm_token`  AS SELECT `a`.`idm_token` AS `idm_token`, `a`.`idr_tes_grup` AS `idr_tes_grup`, `b`.`idm_tes` AS `idm_tes`, `b`.`nama_tes` AS `nama_tes`, `b`.`idm_grup` AS `idm_grup`, `b`.`nama_grup` AS `nama_grup`, `a`.`token` AS `token`, `a`.`expired` AS `expired`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM (`tbm_token` `a` join `viewr_tes_grup` `b`) WHERE (`a`.`idr_tes_grup` = `b`.`idr_tes_grup`) ;

-- --------------------------------------------------------

--
-- Structure for view `viewm_topik`
--
DROP TABLE IF EXISTS `viewm_topik`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewm_topik`  AS SELECT `a`.`idm_topik` AS `idm_topik`, `a`.`idm_modul` AS `idm_modul`, `b`.`modul` AS `modul`, `a`.`topik` AS `topik`, `a`.`deskripsi` AS `deskripsi`, `a`.`is_visible` AS `is_visible`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by` FROM (`tbm_topik` `a` join `tbm_modul` `b`) WHERE (`a`.`idm_modul` = `b`.`idm_modul`) ;

-- --------------------------------------------------------

--
-- Structure for view `viewr_tes_grup`
--
DROP TABLE IF EXISTS `viewr_tes_grup`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewr_tes_grup`  AS SELECT `a`.`idr_tes_grup` AS `idr_tes_grup`, `a`.`idm_tes` AS `idm_tes`, `b`.`nama_tes` AS `nama_tes`, `b`.`keterangan` AS `keterangan`, `b`.`tgl_mulai` AS `tgl_mulai`, `b`.`tgl_akhir` AS `tgl_akhir`, `b`.`durasi` AS `durasi`, `b`.`status_hasil` AS `status_hasil`, `b`.`status_detail_tes` AS `status_detail_tes`, `b`.`skor_maksimal` AS `skor_maksimal`, `b`.`status_token` AS `status_token`, `a`.`idm_grup` AS `idm_grup`, `c`.`nama_grup` AS `nama_grup`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM ((`tbr_tes_grup` `a` join `tbm_tes` `b`) join `tbm_grup` `c`) WHERE ((`a`.`idm_tes` = `b`.`idm_tes`) AND (`a`.`idm_grup` = `c`.`idm_grup`)) ;

-- --------------------------------------------------------

--
-- Structure for view `viewr_tes_topik`
--
DROP TABLE IF EXISTS `viewr_tes_topik`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `viewr_tes_topik`  AS SELECT `a`.`idr_tes_topik` AS `idr_tes_topik`, `a`.`idm_topik` AS `idm_topik`, `c`.`idm_modul` AS `idm_modul`, `c`.`modul` AS `modul`, `c`.`topik` AS `topik`, `c`.`deskripsi` AS `deskripsi`, `c`.`is_visible` AS `is_visible`, `a`.`idm_tes` AS `idm_tes`, `b`.`nama_tes` AS `nama_tes`, `b`.`keterangan` AS `keterangan`, `b`.`tgl_mulai` AS `tgl_mulai`, `b`.`tgl_akhir` AS `tgl_akhir`, `b`.`durasi` AS `durasi`, `b`.`status_hasil` AS `status_hasil`, `b`.`status_detail_tes` AS `status_detail_tes`, `a`.`skor_benar` AS `skor_benar`, `a`.`skor_salah` AS `skor_salah`, `a`.`skor_tidak_jawab` AS `skor_tidak_jawab`, `b`.`skor_maksimal` AS `skor_maksimal`, `b`.`status_token` AS `status_token`, `b`.`is_deleted` AS `is_deleted`, `a`.`tipe_soal` AS `tipe_soal`, `a`.`tingkat_kesulitan` AS `tingkat_kesulitan`, `a`.`jumlah_soal` AS `jumlah_soal`, `a`.`jumlah_pilihan` AS `jumlah_pilihan`, `a`.`acak_soal` AS `acak_soal`, `a`.`acak_pilihan` AS `acak_pilihan`, `a`.`created_by` AS `created_by`, `a`.`updated_by` AS `updated_by`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM ((`tbr_tes_topik` `a` join `tbm_tes` `b`) join `viewm_topik` `c`) WHERE ((`a`.`idm_tes` = `b`.`idm_tes`) AND (`a`.`idm_topik` = `c`.`idm_topik`)) ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

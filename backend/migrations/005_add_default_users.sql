-- ========================================
-- Migration 005: 添加預設帳號
-- ========================================
-- 創建日期: 2025-12-04
-- 說明:
--   - admin / 123
--   - 學生帳號 01~12，密碼也是 01~12

-- ========================================
-- 1. 管理員帳號
-- ========================================
INSERT INTO users (username, password_hash, role, display_name)
VALUES ('admin', '$2b$10$wD74VgOffFAa6jzm9qMfbOSf/T7sJrTtGVABo9bAQw7DSvXjJQhRK', 'admin', '系統管理員')
ON DUPLICATE KEY UPDATE
    password_hash = '$2b$10$wD74VgOffFAa6jzm9qMfbOSf/T7sJrTtGVABo9bAQw7DSvXjJQhRK',
    display_name = '系統管理員';

-- ========================================
-- 2. 學生帳號 01~12
-- ========================================
INSERT INTO users (username, password_hash, role, display_name) VALUES
('01', '$2b$10$xoxcmLTUP469EqcEfsKSQOC9XN/4N0nqsvv903fROaNKzh3bjRxHW', 'team', '第 01 組'),
('02', '$2b$10$nEERd0N9E4lxth/MZyaBvOr9zDmtqM1Bf2lN3ssS6UkWKGfK18oZS', 'team', '第 02 組'),
('03', '$2b$10$YezMvS01I1h.KB6ANqqUz.wRoSL/kkxYi5OKkIHAi84Mv/AvX5/ze', 'team', '第 03 組'),
('04', '$2b$10$Q0J.gyFOAQypCgN8J1vGle1/RJRANvHN0E2cD7NN7hpVl/qnEUq4C', 'team', '第 04 組'),
('05', '$2b$10$g/eAOhMxqXZJBa/b6s8UTepECxPGVD68gV3ji5Ku3QsDBzyRDrxke', 'team', '第 05 組'),
('06', '$2b$10$AO7YIxIm0jvLqxXSux.0wuDX1imBLDGW02SDFqwwzhULggkeQqxe6', 'team', '第 06 組'),
('07', '$2b$10$UgyQ1J08k1X8t8xLuSXd9OSabsUHhl7GtMikvlUbRN0SOZS/AYXue', 'team', '第 07 組'),
('08', '$2b$10$1KRlBGZ5XsB.7aRnipf2GOAKu1q6.hxvTpGVCidSs3nVVh4uHeNli', 'team', '第 08 組'),
('09', '$2b$10$DIbEEiboRzxDQACUICJIXOvVw7/VES0K9Ijl4Ynlu65XUfCu/IAJi', 'team', '第 09 組'),
('10', '$2b$10$tuzaWxuL/uGUsmveL1bMRusU6KMzCxHxRUMBtMbpZ0Do.ayfliyhq', 'team', '第 10 組'),
('11', '$2b$10$46Q7FG.RtmBiINxwZeUEveTdnJBeBYoWyB56r06.o4Zq3IQ0CAaZi', 'team', '第 11 組'),
('12', '$2b$10$/6pFonCMIe7d4xWIOj/IYesdtcrSYyYEA83BctxgVmA9wUg.zjKae', 'team', '第 12 組')
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    display_name = VALUES(display_name);

-- ========================================
-- 完成
-- ========================================
SELECT '✅ 預設帳號創建完成！' AS message;
SELECT 'admin / 123' AS '管理員帳號';
SELECT '01~12 / 01~12' AS '學生帳號';

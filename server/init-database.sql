-- Notedown数据库初始化脚本
-- 在Navicat中执行此脚本创建数据库和表

-- 创建数据库
CREATE DATABASE IF NOT EXISTS notedown CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE notedown;

-- 创建笔记表
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建文件表
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    path VARCHAR(255) NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入示例数据（可选）
INSERT INTO notes (title, category, content) VALUES 
('欢迎使用Notedown', '其他', '这是一个示例笔记，欢迎使用Notedown笔记管理系统！'),
('工作计划', '工作', '本周工作计划：\n1. 完成项目需求分析\n2. 编写技术文档\n3. 团队会议'),
('学习笔记', '学习', '今天学习了JavaScript的异步编程和Promise的使用方法。');

-- 显示表结构
DESCRIBE notes;
DESCRIBE files;

-- 显示示例数据
SELECT * FROM notes;
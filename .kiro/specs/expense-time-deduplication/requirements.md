# Requirements Document

## Introduction

本功能为 AI 智能记账系统添加时间精度和去重匹配能力。当用户上传流水截图时，AI 会识别多条消费记录，但这些记录可能跨越多天。为了避免重复录入，系统需要将 AI 返回的数据与数据库中已有的记录进行匹配，通过时间（精确到小时和分钟）和金额进行去重判断。

## Glossary

- **Expense_System**: 消费记录管理系统
- **AI_Analyzer**: AI 图片识别分析模块
- **Deduplication_Engine**: 去重匹配引擎
- **Expense_Record**: 单条消费记录
- **Transaction_Time**: 交易时间，精确到小时和分钟

## Requirements

### Requirement 1: 数据库时间精度扩展

**User Story:** As a developer, I want to store expense transaction time with hour and minute precision, so that I can accurately identify duplicate records.

#### Acceptance Criteria

1. THE Expense_System SHALL store transaction time with precision to hours and minutes (TIMESTAMP or separate time field)
2. WHEN a new expense is created, THE Expense_System SHALL record both date and time information
3. THE Expense_System SHALL maintain backward compatibility with existing DATE-only records by defaulting time to 00:00. But there is no existing data, this app is still in development stage, hence no previous data.

### Requirement 2: AI 识别时间提取

**User Story:** As a user, I want the AI to extract transaction time from receipt images, so that duplicate detection can work accurately.

#### Acceptance Criteria

1. WHEN analyzing a receipt image, THE AI_Analyzer SHALL extract transaction time (hour and minute) if visible in the image
2. IF the transaction time is not visible in the image, THEN THE AI_Analyzer SHALL return 00:00 for the hour and minute field
3. WHEN the AI returns expense data, THE AI_Analyzer SHALL include a `time` field in format "HH:mm" or null

### Requirement 3: 去重匹配逻辑

**User Story:** As a user, I want the system to automatically detect duplicate expenses, so that I don't accidentally record the same transaction twice.

#### Acceptance Criteria

1. WHEN AI returns expense records, THE Deduplication_Engine SHALL compare each record against existing database records for the current month
2. THE Deduplication_Engine SHALL consider two records as duplicates WHEN both the transaction time (hour and minute) AND amount are exactly identical
3. WHEN a duplicate is detected, THE Expense_System SHALL mark the record with a "duplicated" status
4. WHEN a duplicate is detected, THE Expense_System SHALL NOT pre-select (uncheck) the checkbox for that record
5. WHEN no duplicate is detected, THE Expense_System SHALL pre-select (check) the checkbox for that record

### Requirement 4: 结果展示界面

**User Story:** As a user, I want to clearly see which records are duplicates, so that I can make informed decisions about which records to save.

#### Acceptance Criteria

1. THE Expense_System SHALL display a "Duplicated" indicator column in the results table
2. WHEN a record is marked as duplicated, THE Expense_System SHALL display "Duplicated" text or badge in the indicator column
3. WHEN a record is not duplicated, THE Expense_System SHALL leave the indicator column empty or show a "New" badge
4. THE Expense_System SHALL display the date as day-only (e.g., "15") since the page is already filtered by month
5. THE Expense_System SHALL display the time (HH:mm) alongside the date when available

### Requirement 5: 用户交互

**User Story:** As a user, I want to be able to override duplicate detection and still save records if needed, so that I have full control over my expense data.

#### Acceptance Criteria

1. WHEN a record is marked as duplicated, THE Expense_System SHALL still allow the user to manually check the checkbox
2. WHEN the user confirms save, THE Expense_System SHALL save all checked records regardless of duplicate status
3. THE Expense_System SHALL display a warning message when user attempts to save records marked as duplicated

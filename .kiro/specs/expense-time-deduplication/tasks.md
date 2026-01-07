# Implementation Plan: Expense Time Deduplication

## Overview

本实现计划将分阶段完成时间精度扩展和去重匹配功能。由于项目处于开发阶段无数据，可以直接修改数据库结构。

## Tasks

- [x] 1. 更新数据库 Schema
  - 修改 `supabase-schema.sql`，将 `date DATE` 改为 `transaction_datetime TIMESTAMP WITH TIME ZONE`
  - 更新索引从 `idx_expenses_date` 到 `idx_expenses_datetime`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 更新 Gemini Service
  - [x] 2.1 修改 `createAnalysisPrompt` 函数，添加时间提取指令
    - 在 prompt 中要求 AI 返回 `time` 字段（格式 "HH:mm" 或 null）
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.2 更新 `parseGeminiResponse` 函数，处理 time 字段
    - 验证时间格式 "HH:mm"
    - 无效时间默认为 null
    - _Requirements: 2.3_
  
  - [x] 2.3 更新 `transformExpensesForEditor` 函数，保留 time 字段
    - _Requirements: 2.3_

- [x] 3. 创建去重匹配服务
  - [x] 3.1 创建 `src/lib/deduplicationService.js`
    - 实现 `isDuplicate(newExpense, existingExpenses)` 函数
    - 实现 `markDuplicates(newExpenses, existingExpenses)` 函数
    - 实现 `formatDateTimeForComparison(timestamp)` 辅助函数
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 3.2 编写去重逻辑的属性测试
    - **Property 2: Duplicate Detection Accuracy**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. 更新 Service Layer
  - [x] 4.1 修改 `ExpenseService.getExpensesByMonth`
    - 使用 `transaction_datetime` 字段进行日期范围查询
    - _Requirements: 1.1_
  
  - [x] 4.2 修改 `ExpenseService.createExpense`
    - 组合 date 和 time 为 `transaction_datetime`
    - _Requirements: 1.2_
  
  - [x] 4.3 更新其他使用 date 字段的方法
    - `getExpensesPaginated`
    - _Requirements: 1.1_

- [x] 5. Checkpoint - 确保后端逻辑正确
  - 确保所有服务层代码编译通过
  - 如有问题请询问用户

- [x] 6. 更新 AIExpenseModal 组件
  - [x] 6.1 在 `handleStartAnalysis` 中集成去重逻辑
    - 获取当月现有记录
    - 调用 `DeduplicationService.markDuplicates`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 6.2 更新 `ResultsEditor` 组件
    - 添加 "Status" 列显示 "Duplicated" 或 "New"
    - 修改日期显示为日+时间格式
    - 重复记录行样式变淡
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 6.3 添加保存重复记录的警告提示
    - 当用户勾选了重复记录时显示警告
    - _Requirements: 5.1, 5.3_

- [x] 7. 更新 ExpenseTable 组件
  - [x] 7.1 修改日期显示格式
    - 只显示日（因为页面已按月筛选）
    - 显示时间（如果有）
    - _Requirements: 4.4, 4.5_

- [x] 8. 更新 App.jsx
  - [x] 8.1 修改 `handleAIConfirm` 函数
    - 传递 time 字段到 createExpense
    - _Requirements: 5.2_
  
  - [x] 8.2 更新 chartData 计算逻辑
    - 使用 `transaction_datetime` 提取日期
    - _Requirements: 1.1_

- [x] 9. Checkpoint - 功能集成测试
  - 确保所有组件正常工作
  - 如有问题请询问用户

- [ ]* 10. 编写属性测试
  - [ ]* 10.1 编写选择状态一致性测试
    - **Property 3: Selection State Consistency**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  
  - [ ]* 10.2 编写日期格式化测试
    - **Property 4: Date Display Format**
    - **Validates: Requirements 4.4, 4.5**

- [x] 11. Final Checkpoint
  - 确保所有测试通过
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 由于项目处于开发阶段无数据，数据库修改可以直接执行
- 去重匹配只在有时间信息时生效，无时间的记录默认为新记录
- 用户可以手动覆盖去重判断，勾选重复记录进行保存

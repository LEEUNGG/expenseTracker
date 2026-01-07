# Requirements Document

## Introduction

This feature enhances the expense tracking application with three improvements:
1. Amount column sorting in the ExpenseTable (ascending/descending)
2. A refresh data button in the page header
3. Custom confirmation modal component to replace browser's native confirm dialog

## Glossary

- **ExpenseTable**: The table component displaying daily expense records
- **Amount_Sorter**: The sorting control for the amount column
- **Refresh_Button**: The button in the page header that triggers data refresh
- **Confirmation_Modal**: A custom modal component for delete confirmations
- **Skeleton_Loader**: The existing loading animation component used during data fetching

## Requirements

### Requirement 1: Amount Column Sorting

**User Story:** As a user, I want to sort expenses by amount in ascending or descending order, so that I can quickly identify which expenses are the largest or smallest in the current month.

#### Acceptance Criteria

1. WHEN a user clicks the amount column header, THE Amount_Sorter SHALL toggle between ascending, descending, and no sort states
2. WHEN sorting is active, THE ExpenseTable SHALL display a visual indicator showing the current sort direction (up/down arrow)
3. WHEN ascending sort is active, THE ExpenseTable SHALL display expenses from smallest to largest amount
4. WHEN descending sort is active, THE ExpenseTable SHALL display expenses from largest to smallest amount
5. WHEN no sort is active, THE ExpenseTable SHALL display expenses in their default order (by date)
6. WHEN the month changes, THE Amount_Sorter SHALL reset to no sort state

### Requirement 2: Refresh Data Button

**User Story:** As a user, I want a refresh button in the page header, so that I can manually fetch the latest expense data without refreshing the entire page.

#### Acceptance Criteria

1. THE Refresh_Button SHALL be displayed in the top-right corner of the page header
2. WHEN a user clicks the Refresh_Button, THE System SHALL fetch the latest expense data from the database
3. WHILE data is being fetched, THE System SHALL display the existing Skeleton_Loader animation
4. WHILE data is being fetched, THE Refresh_Button SHALL display a spinning animation to indicate loading state
5. WHEN data fetch completes successfully, THE System SHALL update the expense list with the new data
6. IF data fetch fails, THEN THE System SHALL display an error toast notification

### Requirement 3: Custom Confirmation Modal

**User Story:** As a user, I want a visually consistent confirmation dialog for delete actions, so that the confirmation experience matches the overall application design (similar to the AI add modal).

#### Acceptance Criteria

1. THE Confirmation_Modal SHALL replace the browser's native window.confirm dialog for all delete operations
2. THE Confirmation_Modal SHALL display a title, message, and two action buttons (confirm and cancel)
3. THE Confirmation_Modal SHALL use the same visual design language as the AIExpenseModal (backdrop blur, rounded corners, gradient buttons)
4. WHEN a user clicks the confirm button, THE Confirmation_Modal SHALL execute the delete action and close
5. WHEN a user clicks the cancel button, THE Confirmation_Modal SHALL close without executing any action
6. WHEN a user clicks outside the modal, THE Confirmation_Modal SHALL close without executing any action
7. THE Confirmation_Modal SHALL support customizable title, message, and button text
8. WHILE a delete operation is in progress, THE Confirmation_Modal SHALL display a loading state on the confirm button

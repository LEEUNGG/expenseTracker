# Implementation Plan: Expense Table Enhancements

## Overview

This implementation plan covers three enhancements: amount column sorting, refresh data button, and custom confirmation modal. Tasks are ordered to build incrementally with testing integrated throughout.

## Tasks

- [x] 1. Implement Amount Column Sorting in ExpenseTable
  - [x] 1.1 Add sort state and toggle logic to ExpenseTable
    - Add `amountSortDirection` state with type `'none' | 'asc' | 'desc'`
    - Implement `toggleAmountSort` function to cycle through states
    - Add `useEffect` to reset sort state when `currentMonth` prop changes
    - _Requirements: 1.1, 1.6_

  - [x] 1.2 Implement sorted expenses computation
    - Add `useMemo` hook to compute sorted expenses based on sort direction
    - Handle edge cases: empty arrays, single items
    - Use `parseFloat` for amount comparison
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.3 Update Amount column header UI
    - Make Amount header clickable with hover state
    - Add sort direction icon (ArrowUp, ArrowDown, or ArrowUpDown for none)
    - Apply sorted expenses to table rendering
    - _Requirements: 1.2_

  - [ ]* 1.4 Write property tests for sorting
    - **Property 2: Ascending Sort Order**
    - **Property 3: Descending Sort Order**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Implement Refresh Data Button
  - [x] 2.1 Create RefreshButton inline in App.jsx header
    - Add refresh button with RefreshCw icon in header right section
    - Add spinning animation class when `isLoading` is true
    - Style to match existing header buttons
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Implement refresh data handler
    - Create `handleRefreshData` async function
    - Set `isLoading` to true before fetch
    - Call existing data fetch logic
    - Handle errors with toast notification
    - _Requirements: 2.2, 2.3, 2.5, 2.6_

  - [ ]* 2.3 Write unit tests for refresh functionality
    - Test loading state toggle
    - Test error handling
    - _Requirements: 2.2, 2.6_

- [x] 3. Implement Custom Confirmation Modal
  - [x] 3.1 Create ConfirmModal component
    - Create new file `src/components/ConfirmModal.jsx`
    - Implement modal structure with backdrop, container, title, message, buttons
    - Match AIExpenseModal visual design (backdrop blur, rounded corners, gradients)
    - Support props: isOpen, onClose, onConfirm, title, message, confirmText, cancelText
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [x] 3.2 Implement modal interactions
    - Handle confirm button click with loading state
    - Handle cancel button click (close without action)
    - Handle backdrop click (close without action)
    - Prevent event propagation on modal content
    - _Requirements: 3.4, 3.5, 3.6, 3.8_

  - [ ]* 3.3 Write property tests for ConfirmModal
    - **Property 5: Modal Renders Custom Content**
    - **Property 6: Confirm Executes Action**
    - **Property 7: Cancel Does Not Execute Action**
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6, 3.7**

- [x] 4. Integrate ConfirmModal with Delete Operations
  - [x] 4.1 Add confirm modal state to App.jsx
    - Add state for modal visibility and configuration
    - Create helper function to show confirmation modal
    - _Requirements: 3.1_

  - [x] 4.2 Replace window.confirm in delete handlers
    - Update `handleDeleteExpense` to use ConfirmModal
    - Update `handleBatchDelete` to use ConfirmModal
    - Remove all `window.confirm` calls
    - _Requirements: 3.1_

  - [ ]* 4.3 Write integration tests
    - Test delete single expense flow with modal
    - Test batch delete flow with modal
    - _Requirements: 3.1, 3.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

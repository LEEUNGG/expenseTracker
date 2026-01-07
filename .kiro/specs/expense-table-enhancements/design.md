# Design Document: Expense Table Enhancements

## Overview

This design document outlines the implementation of three enhancements to the expense tracking application:
1. Amount column sorting functionality in ExpenseTable
2. Refresh data button in the page header
3. Custom confirmation modal component

The implementation follows React best practices and maintains consistency with the existing codebase design patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Header                                              │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  RefreshButton (new)                        │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ExpenseTable                                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  Amount Column Header with Sort Controls    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ConfirmModal (new component)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Amount Sorting in ExpenseTable

#### State Management
```javascript
// Sort state type
type SortDirection = 'none' | 'asc' | 'desc';

// State in ExpenseTable
const [amountSortDirection, setAmountSortDirection] = useState('none');
```

#### Sort Toggle Logic
```javascript
// Cycle: none -> desc -> asc -> none
const toggleAmountSort = () => {
  setAmountSortDirection(prev => {
    if (prev === 'none') return 'desc';
    if (prev === 'desc') return 'asc';
    return 'none';
  });
};
```

#### Sorted Expenses Computation
```javascript
const sortedExpenses = useMemo(() => {
  if (amountSortDirection === 'none') return expenses;
  
  return [...expenses].sort((a, b) => {
    const amountA = parseFloat(a.amount);
    const amountB = parseFloat(b.amount);
    return amountSortDirection === 'asc' 
      ? amountA - amountB 
      : amountB - amountA;
  });
}, [expenses, amountSortDirection]);
```

#### UI Component
```jsx
<th 
  scope="col" 
  className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
  onClick={toggleAmountSort}
>
  <div className="flex items-center justify-end gap-1">
    Amount
    <SortIcon direction={amountSortDirection} />
  </div>
</th>
```

### 2. Refresh Button Component

#### Props Interface
```typescript
interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}
```

#### Component Structure
```jsx
function RefreshButton({ onRefresh, isLoading }) {
  return (
    <button
      onClick={onRefresh}
      disabled={isLoading}
      className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300"
    >
      <RefreshCw className={cn(
        "w-5 h-5 text-gray-700 dark:text-gray-200",
        isLoading && "animate-spin"
      )} />
    </button>
  );
}
```

#### Integration in App.jsx
```jsx
// In header section
<div className="flex items-center gap-2">
  <RefreshButton 
    onRefresh={handleRefreshData} 
    isLoading={isLoading} 
  />
</div>
```

### 3. ConfirmModal Component

#### Props Interface
```typescript
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;  // default: "Confirm"
  cancelText?: string;   // default: "Cancel"
  confirmVariant?: 'danger' | 'primary';  // default: 'danger'
}
```

#### Component Structure
```jsx
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger'
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-gray-700/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal content */}
      </div>
    </div>
  );
}
```

#### Visual Design (matching AIExpenseModal)
- Backdrop: `bg-black/40 backdrop-blur-md`
- Container: `bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl`
- Border: `border border-white/20 dark:border-gray-700/50`
- Shadow: `shadow-2xl`
- Danger button: `bg-gradient-to-r from-red-500 to-rose-600`
- Cancel button: `bg-gray-100 dark:bg-gray-700/50`

## Data Models

### Sort State
```typescript
type SortDirection = 'none' | 'asc' | 'desc';
```

### Confirm Modal State
```typescript
interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sort State Cycling
*For any* current sort state, clicking the sort toggle should transition to the next state in the cycle: none → desc → asc → none.
**Validates: Requirements 1.1**

### Property 2: Ascending Sort Order
*For any* list of expenses with numeric amounts, when sorted in ascending order, each expense amount should be less than or equal to the next expense amount in the list.
**Validates: Requirements 1.3**

### Property 3: Descending Sort Order
*For any* list of expenses with numeric amounts, when sorted in descending order, each expense amount should be greater than or equal to the next expense amount in the list.
**Validates: Requirements 1.4**

### Property 4: Sort Reset on Month Change
*For any* sort state, when the month prop changes, the sort state should reset to 'none'.
**Validates: Requirements 1.6**

### Property 5: Modal Renders Custom Content
*For any* ConfirmModal with custom title, message, confirmText, and cancelText props, the rendered modal should display all provided custom text values.
**Validates: Requirements 3.2, 3.7**

### Property 6: Confirm Executes Action
*For any* ConfirmModal, when the confirm button is clicked, the onConfirm callback should be invoked exactly once.
**Validates: Requirements 3.4**

### Property 7: Cancel Does Not Execute Action
*For any* ConfirmModal, when the cancel button is clicked or backdrop is clicked, the onConfirm callback should not be invoked.
**Validates: Requirements 3.5, 3.6**

## Error Handling

### Refresh Button
- Display error toast when data fetch fails
- Keep previous data visible during error state
- Allow retry by clicking refresh again

### ConfirmModal
- Handle async onConfirm errors gracefully
- Show loading state during async operations
- Prevent double-clicks during loading

### Amount Sorting
- Handle edge cases: empty arrays, single item arrays
- Handle non-numeric amounts gracefully (parseFloat)

## Testing Strategy

### Unit Tests
- Test sort toggle state transitions
- Test sorting algorithm correctness
- Test ConfirmModal callback invocations
- Test loading state rendering

### Property-Based Tests
Using a property-based testing library (e.g., fast-check):

1. **Sort Order Property**: For any array of expenses, sorted array should satisfy ordering invariant
2. **Sort Cycle Property**: For any sequence of toggle clicks, state should follow the cycle
3. **Modal Callback Property**: Confirm/cancel actions should invoke correct callbacks

### Integration Tests
- Test refresh button triggers data fetch
- Test ConfirmModal integration with delete operations
- Test sort state reset on month change

### Test Configuration
- Minimum 100 iterations per property test
- Tag format: **Feature: expense-table-enhancements, Property {number}: {property_text}**

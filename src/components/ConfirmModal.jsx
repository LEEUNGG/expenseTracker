import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Custom confirmation modal component
 * Replaces browser's native window.confirm dialog with a styled modal
 * Matches AIExpenseModal visual design (backdrop blur, rounded corners, gradients)
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed without action
 * @param {Function} props.onConfirm - Async callback when confirm button is clicked
 * @param {string} props.title - Modal title text
 * @param {string} props.message - Modal message/description text
 * @param {string} [props.confirmText='Confirm'] - Text for confirm button
 * @param {string} [props.cancelText='Cancel'] - Text for cancel button
 * @param {'danger' | 'primary'} [props.confirmVariant='danger'] - Visual style for confirm button
 */
export function ConfirmModal({
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

  /**
   * Handles confirm button click with loading state
   * Requirements: 3.4, 3.8
   */
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

  /**
   * Handles cancel button click - closes without action
   * Requirements: 3.5
   */
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  /**
   * Handles backdrop click - closes without action
   * Requirements: 3.6
   */
  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Determine confirm button styles based on variant
  const confirmButtonStyles = confirmVariant === 'danger'
    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${
              confirmVariant === 'danger' 
                ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                : 'bg-gradient-to-br from-violet-500 to-purple-600'
            }`}>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 ${confirmButtonStyles}`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

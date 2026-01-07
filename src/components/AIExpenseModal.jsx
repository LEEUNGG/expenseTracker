import { X, Sparkles, Upload, Trash2, RefreshCw, AlertCircle, ImageOff, Check, Square, CheckSquare, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  isValidImageType, 
  isValidFileSize, 
  ACCEPTED_IMAGE_TYPES,
  analyzeReceiptImage,
  transformExpensesForEditor
} from '../lib/geminiService';
import { AIAnalyzingLoader, AnalysisProgress } from './AIAnalyzingLoader';
import { DeduplicationService } from '../lib/deduplicationService';
import { ExpenseService } from '../lib/services';

/**
 * Animation classes for state transitions
 * Provides smooth fade and slide animations between modal states
 */
const TRANSITION_CLASSES = {
  enter: 'animate-in fade-in slide-in-from-bottom-4 duration-300',
  exit: 'animate-out fade-out slide-out-to-top-4 duration-200'
};

/**
 * Modal states for the AI expense recognition flow
 * @type {'upload' | 'preview' | 'analyzing' | 'results' | 'error' | 'no-results'}
 */
const MODAL_STATES = {
  UPLOAD: 'upload',
  PREVIEW: 'preview',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
  ERROR: 'error',
  NO_RESULTS: 'no-results'
};

/**
 * Initial state for the modal
 * Extended to support multi-image upload (up to 5 images)
 */
const getInitialState = () => ({
  modalState: MODAL_STATES.UPLOAD,
  previousState: null, // Track previous state for transition direction
  // Multi-image support: arrays instead of single values
  selectedImages: [],    // Array<File> - selected image files
  imagePreviews: [],     // Array<string> - preview URLs for selected images
  // Analysis progress tracking for batch processing
  analysisProgress: {
    current: 0,          // Current image being analyzed (1-indexed for display)
    total: 0             // Total number of images to analyze
  },
  parsedExpenses: [],
  error: null,
  isSaving: false,
  isTransitioning: false // Track if currently transitioning between states
});

export function AIExpenseModal({ isOpen, onClose, onConfirm, categories = [], currentMonth }) {
  // State management following the state machine design
  const [state, setState] = useState(getInitialState);
  const fileInputRef = useRef(null);
  // Ref to track the current preview URLs for cleanup on unmount (array for multi-image)
  const imagePreviewsRef = useRef([]);

  // Destructure state for easier access
  // Note: analysisProgress will be used in task 5 for batch analysis progress display
  const { modalState, selectedImages, imagePreviews, parsedExpenses, error, isSaving, isTransitioning, analysisProgress: _analysisProgress } = state;

  // Keep ref in sync with state for cleanup purposes
  useEffect(() => {
    imagePreviewsRef.current = imagePreviews;
  }, [imagePreviews]);

  /**
   * Transition to a new state with animation
   * Tracks previous state for transition direction
   */
  const transitionToState = useCallback((newState, additionalUpdates = {}) => {
    setState(prev => ({
      ...prev,
      previousState: prev.modalState,
      modalState: newState,
      isTransitioning: true,
      ...additionalUpdates
    }));
    
    // Reset transitioning flag after animation completes
    setTimeout(() => {
      setState(prev => ({ ...prev, isTransitioning: false }));
    }, 300);
  }, []);

  /**
   * Get animation class for state content based on transition
   * Returns appropriate enter animation class
   */
  const getStateAnimationClass = useMemo(() => {
    if (isTransitioning) {
      return TRANSITION_CLASSES.enter;
    }
    return '';
  }, [isTransitioning]);

  // Reset state when modal closes - ensures cleanup from any state
  useEffect(() => {
    if (!isOpen) {
      // Clean up all image preview URLs to prevent memory leaks
      if (imagePreviewsRef.current && imagePreviewsRef.current.length > 0) {
        imagePreviewsRef.current.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
        imagePreviewsRef.current = [];
      }
      // Use callback form to avoid direct setState in effect
      setState(() => getInitialState());
    }
  }, [isOpen]);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      // Use ref to get the current preview URLs value
      if (imagePreviewsRef.current && imagePreviewsRef.current.length > 0) {
        imagePreviewsRef.current.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
        imagePreviewsRef.current = [];
      }
    };
  }, []);

  /**
   * Updates state partially
   */
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Maximum number of images allowed
   */
  const MAX_IMAGE_COUNT = 5;

  /**
   * Validates a single file and returns validation result
   * @param {File} file - The file to validate
   * @returns {{ valid: boolean, error?: string }} - Validation result
   */
  const validateFile = useCallback((file) => {
    if (!isValidImageType(file.type)) {
      return { 
        valid: false, 
        error: `File ${file.name} format not supported, skipped` 
      };
    }
    if (!isValidFileSize(file.size)) {
      return { 
        valid: false, 
        error: `File ${file.name} exceeds 10MB limit, skipped` 
      };
    }
    return { valid: true };
  }, []);

  /**
   * Handles multiple file selection from input or drop
   * Validates each file for type and size, filters invalid files
   * Limits total to MAX_IMAGE_COUNT (5) images
   * @param {FileList|File[]} files - Selected files
   * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
   */
  const handleFilesSelect = useCallback((files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    // Validate each file
    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error);
      }
    });

    // If no valid files, show errors and return
    if (validFiles.length === 0) {
      updateState({
        error: errors.join('\n')
      });
      return;
    }

    // Apply image count limit (max 5)
    let filesToAdd = validFiles;
    let limitWarning = null;
    
    if (validFiles.length > MAX_IMAGE_COUNT) {
      filesToAdd = validFiles.slice(0, MAX_IMAGE_COUNT);
      limitWarning = `Maximum ${MAX_IMAGE_COUNT} images allowed, only the first ${MAX_IMAGE_COUNT} were selected`;
    }

    // Clean up previous preview URLs
    if (imagePreviews.length > 0) {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    }

    // Create preview URLs for valid files
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));

    // Combine errors and limit warning for display
    const allMessages = [...errors];
    if (limitWarning) {
      allMessages.push(limitWarning);
    }

    // Transition to preview state with all valid images
    transitionToState(MODAL_STATES.PREVIEW, {
      selectedImages: filesToAdd,
      imagePreviews: newPreviews,
      error: allMessages.length > 0 ? allMessages.join('\n') : null
    });
  }, [imagePreviews, transitionToState, updateState, validateFile]);

  /**
   * Adds more images to the existing selection
   * Merges new files with existing array, respecting the MAX_IMAGE_COUNT limit
   * Reuses validation logic from handleFilesSelect
   * Requirements: 2.5
   * @param {FileList|File[]} files - New files to add
   */
  const handleAddMoreImages = useCallback((files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    // Validate each file
    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error);
      }
    });

    // If no valid files, show errors and return
    if (validFiles.length === 0) {
      updateState({
        error: errors.join('\n')
      });
      return;
    }

    // Calculate how many more images can be added
    const currentCount = selectedImages.length;
    const remainingSlots = MAX_IMAGE_COUNT - currentCount;
    
    // Apply limit
    let filesToAdd = validFiles;
    let limitWarning = null;
    
    if (validFiles.length > remainingSlots) {
      filesToAdd = validFiles.slice(0, remainingSlots);
      limitWarning = `Maximum ${MAX_IMAGE_COUNT} images allowed, only ${remainingSlots} more can be added`;
    }

    // Create preview URLs for new valid files
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));

    // Combine errors and limit warning for display
    const allMessages = [...errors];
    if (limitWarning) {
      allMessages.push(limitWarning);
    }

    // Merge with existing images
    updateState({
      selectedImages: [...selectedImages, ...filesToAdd],
      imagePreviews: [...imagePreviews, ...newPreviews],
      error: allMessages.length > 0 ? allMessages.join('\n') : null
    });
  }, [selectedImages, imagePreviews, validateFile, updateState]);

  /**
   * Handles file input change - supports multiple files
   * Delegates to handleFilesSelect for initial selection or handleAddMoreImages for adding
   * Requirements: 1.1, 2.5
   */
  const handleInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // If already in PREVIEW state with images, add more; otherwise start fresh
      if (modalState === MODAL_STATES.PREVIEW && selectedImages.length > 0) {
        handleAddMoreImages(files);
      } else {
        handleFilesSelect(files);
      }
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFilesSelect, handleAddMoreImages, modalState, selectedImages.length]);

  /**
   * Handles drag over event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handles file drop - supports multiple files
   * Requirements: 1.4
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  }, [handleFilesSelect]);

  /**
   * Opens file picker
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Removes image at specified index from the selection
   * Cleans up the preview URL for the removed image
   * Returns to UPLOAD state if all images are removed
   * Requirements: 2.3, 2.4
   * @param {number} index - Index of the image to remove
   */
  const handleRemoveImage = useCallback((index) => {
    // If index is not provided (legacy call), remove all images
    if (typeof index !== 'number') {
      // Clean up all preview URLs
      if (imagePreviews.length > 0) {
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
      }
      transitionToState(MODAL_STATES.UPLOAD, {
        selectedImages: [],
        imagePreviews: [],
        error: null
      });
      return;
    }

    // Clean up the preview URL for the removed image
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }

    // Create new arrays without the removed image
    const newSelectedImages = selectedImages.filter((_, i) => i !== index);
    const newImagePreviews = imagePreviews.filter((_, i) => i !== index);

    // If no images left, return to UPLOAD state (Requirements 2.4)
    if (newSelectedImages.length === 0) {
      transitionToState(MODAL_STATES.UPLOAD, {
        selectedImages: [],
        imagePreviews: [],
        error: null
      });
    } else {
      // Update state with remaining images
      updateState({
        selectedImages: newSelectedImages,
        imagePreviews: newImagePreviews
      });
    }
  }, [imagePreviews, selectedImages, transitionToState, updateState]);

  /**
   * Opens file picker for adding more images
   */
  const handleAddMoreClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Starts the AI analysis process - batch analysis for multiple images
   * Sequentially analyzes each image to avoid API rate limiting
   * Collects all successful results and handles partial failures
   * Integrates deduplication logic to mark duplicate records
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  const handleStartAnalysis = useCallback(async () => {
    if (!selectedImages || selectedImages.length === 0) {
      updateState({ error: 'Please select an image first' });
      return;
    }

    const totalImages = selectedImages.length;
    
    // Transition to analyzing state with animation
    transitionToState(MODAL_STATES.ANALYZING, {
      error: null,
      analysisProgress: { current: 1, total: totalImages }
    });

    // Track results and failures for batch processing
    const allExpenses = [];
    const failedImages = [];

    // Sequential analysis to avoid API rate limiting (Requirements 3.1)
    for (let i = 0; i < totalImages; i++) {
      const imageFile = selectedImages[i];
      
      // Update progress state (Requirements 3.2)
      updateState({
        analysisProgress: { current: i + 1, total: totalImages }
      });

      try {
        const result = await analyzeReceiptImage(imageFile);
        
        // Collect expenses from this image with sourceImageIndex (Requirements 3.3, 3.6)
        if (result.expenses && result.expenses.length > 0) {
          const expensesWithSource = result.expenses.map(expense => ({
            ...expense,
            sourceImageIndex: i
          }));
          allExpenses.push(...expensesWithSource);
        }
      } catch (err) {
        // Record failed image but continue processing (Requirements 3.4)
        console.error(`AI analysis error for image ${i + 1}:`, err);
        failedImages.push({
          index: i,
          error: err.message || 'AI analysis failed'
        });
      }
    }

    // Handle results based on success/failure counts
    const successCount = totalImages - failedImages.length;
    
    // All images failed (Requirements 3.5)
    if (successCount === 0) {
      transitionToState(MODAL_STATES.ERROR, {
        error: `All ${totalImages} images failed to analyze, please try again`
      });
      return;
    }

    // No expenses recognized from any image
    if (allExpenses.length === 0) {
      transitionToState(MODAL_STATES.NO_RESULTS, {
        error: 'Unable to recognize expenses, please try uploading clearer images'
      });
      return;
    }

    // Transform expenses and map category names to category IDs
    const transformedExpenses = transformExpensesForEditor(allExpenses, categories);

    // Fetch existing expenses for the current month for deduplication
    // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
    let expensesWithDuplicateStatus = transformedExpenses;
    try {
      const year = currentMonth ? currentMonth.getFullYear() : new Date().getFullYear();
      const month = currentMonth ? currentMonth.getMonth() + 1 : new Date().getMonth() + 1;
      const existingExpenses = await ExpenseService.getExpensesByMonth(year, month);
      
      // Mark duplicates using the DeduplicationService
      expensesWithDuplicateStatus = DeduplicationService.markDuplicates(
        transformedExpenses,
        existingExpenses || []
      );
    } catch (err) {
      // If fetching existing expenses fails, continue without deduplication
      console.error('Failed to fetch existing expenses for deduplication:', err);
      // Mark all as new (not duplicated) and selected
      expensesWithDuplicateStatus = transformedExpenses.map(expense => ({
        ...expense,
        isDuplicated: false,
        selected: true
      }));
    }

    // Build partial failure message if some images failed (Requirements 3.4)
    let partialFailureMessage = null;
    if (failedImages.length > 0) {
      partialFailureMessage = `${failedImages.length} image(s) failed to analyze, showing results from the remaining ${successCount} image(s)`;
    }

    // Transition to results state with parsed expenses including duplicate status
    transitionToState(MODAL_STATES.RESULTS, {
      parsedExpenses: expensesWithDuplicateStatus,
      error: partialFailureMessage
    });
  }, [selectedImages, categories, currentMonth, transitionToState, updateState]);

  /**
   * Handles modal close with cleanup
   * Resets all internal state and cleans up resources from any state
   * Implements Requirements 4.5 - proper cleanup on close
   */
  const handleClose = useCallback(() => {
    // Clean up all image preview URLs to prevent memory leaks
    if (imagePreviewsRef.current && imagePreviewsRef.current.length > 0) {
      imagePreviewsRef.current.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      imagePreviewsRef.current = [];
    }
    // Reset all state to initial values
    setState(getInitialState());
    // Call the onClose callback
    onClose();
  }, [onClose]);

  /**
   * Handles retry from error state - returns to preview state
   */
  const handleRetry = useCallback(() => {
    transitionToState(MODAL_STATES.PREVIEW, {
      error: null
    });
  }, [transitionToState]);

  /**
   * Handles re-upload from no-results state - returns to upload state
   */
  const handleReupload = useCallback(() => {
    // Clean up all preview URLs
    if (imagePreviews.length > 0) {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    }
    transitionToState(MODAL_STATES.UPLOAD, {
      selectedImages: [],
      imagePreviews: [],
      error: null
    });
  }, [imagePreviews, transitionToState]);

  /**
   * Handles confirm button click - saves selected expenses to database
   * Implements batch save logic per Requirements 3.5
   */
  const handleConfirmSave = useCallback(async () => {
    // Collect all selected expenses
    const selectedExpenses = parsedExpenses.filter(expense => expense.selected);
    
    if (selectedExpenses.length === 0) {
      updateState({ error: 'Please select at least one record' });
      return;
    }

    // Set saving state
    updateState({ isSaving: true, error: null });

    try {
      // Prepare expenses for saving - map to database format
      // Note: time field is needed by ExpenseService.createExpense to build transaction_datetime
      const expensesToSave = selectedExpenses.map(expense => ({
        date: expense.date,
        time: expense.time || null,  // Include time for transaction_datetime
        amount: parseFloat(expense.amount),
        category_id: expense.category_id,
        note: expense.description || '',
        is_essential: expense.is_essential
      }));

      // Call onConfirm callback which handles batch creation and data refresh
      await onConfirm(expensesToSave);

      // Clean up all preview URLs and close modal on success
      if (imagePreviews.length > 0) {
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
      }
      setState(getInitialState());
      onClose();
    } catch (err) {
      console.error('Failed to save expenses:', err);
      updateState({
        isSaving: false,
        error: err.message || 'Failed to save, please try again'
      });
    }
  }, [parsedExpenses, onConfirm, onClose, imagePreviews, updateState]);

  if (!isOpen) return null;

  // Format accepted types for file input
  const acceptedTypes = ACCEPTED_IMAGE_TYPES.join(',');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className={`w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 dark:border-gray-700/50 ${
          modalState === MODAL_STATES.RESULTS ? 'max-w-4xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Smart Expense</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Upload State */}
          {modalState === MODAL_STATES.UPLOAD && (
            <div className={getStateAnimationClass}>
              <UploadArea
                onUploadClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            </div>
          )}

          {/* Preview State - Use ImagePreviewGrid for multi-image support */}
          {modalState === MODAL_STATES.PREVIEW && imagePreviews.length > 0 && (
            <div className={getStateAnimationClass}>
              {imagePreviews.length === 1 ? (
                /* Single image - use original PreviewArea for backward compatibility */
                <PreviewArea
                  imagePreview={imagePreviews[0]}
                  onRemove={handleRemoveImage}
                  onAnalyze={handleStartAnalysis}
                  onUploadClick={handleUploadClick}
                />
              ) : (
                /* Multiple images - use ImagePreviewGrid */
                <ImagePreviewGrid
                  imagePreviews={imagePreviews}
                  onRemove={handleRemoveImage}
                  onAddMore={handleAddMoreClick}
                  canAddMore={selectedImages.length < MAX_IMAGE_COUNT}
                  onAnalyze={handleStartAnalysis}
                />
              )}
            </div>
          )}

          {/* Analyzing State - AI Analysis Loading Animation */}
          {modalState === MODAL_STATES.ANALYZING && (
            <div className={getStateAnimationClass}>
              {/* Use AnalysisProgress for multiple images, AIAnalyzingLoader for single image */}
              {selectedImages.length > 1 ? (
                <AnalysisProgress
                  current={state.analysisProgress.current}
                  total={state.analysisProgress.total}
                  imagePreviews={imagePreviews}
                />
              ) : (
                <AIAnalyzingLoader imagePreview={imagePreviews[0]} />
              )}
            </div>
          )}

          {/* Error State - API failure with retry option */}
          {modalState === MODAL_STATES.ERROR && (
            <div className={getStateAnimationClass}>
              <ErrorState
                error={error}
                imagePreview={imagePreviews[0]}
                onRetry={handleRetry}
                onReupload={handleReupload}
              />
            </div>
          )}

          {/* No Results State - No expenses recognized */}
          {modalState === MODAL_STATES.NO_RESULTS && (
            <div className={getStateAnimationClass}>
              <NoResultsState
                error={error}
                onReupload={handleReupload}
              />
            </div>
          )}

          {/* Results State - Display parsed expenses in editable list */}
          {modalState === MODAL_STATES.RESULTS && parsedExpenses.length > 0 && (
            <div className={getStateAnimationClass}>
              <ResultsEditor
                expenses={parsedExpenses}
                categories={categories}
                onExpensesChange={(updated) => updateState({ parsedExpenses: updated })}
                onConfirm={handleConfirmSave}
                isSaving={isSaving}
              />
            </div>
          )}

          {/* Hidden file input - supports multiple file selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Footer with Cancel button - hide when in results state (has its own confirm button) */}
          {modalState !== MODAL_STATES.RESULTS && (
            <div className="flex justify-end mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Upload area component with drag & drop support
 */
function UploadArea({ onUploadClick, onDragOver, onDrop }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-300 text-sm">
        Upload receipt or bill images, AI will automatically recognize expenses
      </p>
      
      <div
        onClick={onUploadClick}
        onDragOver={onDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center 
          w-full h-48 
          border-2 border-dashed rounded-2xl 
          cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
          }
        `}
      >
        <div className={`
          p-4 rounded-full mb-3 transition-colors
          ${isDragging 
            ? 'bg-purple-100 dark:bg-purple-800/30' 
            : 'bg-gray-100 dark:bg-gray-700'
          }
        `}>
          <Upload className={`w-8 h-8 ${isDragging ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          {isDragging ? 'Release to upload' : 'Click or drag to upload images'}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Supports JPEG, PNG, WebP, HEIC (max 10MB)
        </p>
      </div>
    </div>
  );
}

/**
 * Image preview component with action buttons
 */
function PreviewArea({ imagePreview, onRemove, onAnalyze, onUploadClick }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-300 text-sm">
        Confirm images then click "Start Analysis"
      </p>
      
      {/* Image Preview */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={imagePreview}
          alt="Receipt preview"
          className="w-full h-64 object-contain"
        />
        
        {/* Action buttons overlay */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={onUploadClick}
            className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            title="Change image"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title="Remove image"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="w-5 h-5" />
        Start Analysis
      </button>
    </div>
  );
}


/**
 * Image preview grid component - displays multiple image thumbnails in a grid layout
 * Shows image count and allows individual image removal
 * Requirements: 2.1, 2.2
 * @param {Object} props
 * @param {string[]} props.imagePreviews - Array of preview URLs
 * @param {Function} props.onRemove - Callback to remove image at index (index) => void
 * @param {Function} props.onAddMore - Callback to add more images
 * @param {boolean} props.canAddMore - Whether more images can be added (< 5)
 * @param {Function} props.onAnalyze - Callback to start analysis
 */
function ImagePreviewGrid({ imagePreviews, onRemove, onAddMore, canAddMore, onAnalyze }) {
  const imageCount = imagePreviews.length;
  const MAX_IMAGES = 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Confirm images then click "Start Analysis"
        </p>
        {/* Image count display - Requirements 2.2 */}
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          {imageCount}/{MAX_IMAGES} images
        </span>
      </div>
      
      {/* Grid layout for thumbnails - Requirements 2.1 */}
      <div className="grid grid-cols-3 gap-3">
        {imagePreviews.map((preview, index) => (
          <div
            key={`preview-${index}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 group"
          >
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Delete button overlay - Requirements 2.3 */}
            <button
              onClick={() => onRemove(index)}
              className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            {/* Image index indicator */}
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white font-medium">
              {index + 1}
            </div>
          </div>
        ))}
        
        {/* Add more button - Requirements 2.5, 2.6 */}
        {canAddMore && (
          <button
            onClick={onAddMore}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex flex-col items-center justify-center gap-1 transition-all duration-200"
          >
            <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Add</span>
          </button>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="w-5 h-5" />
        Start Analysis ({imageCount} images)
      </button>
    </div>
  );
}

/**
 * Error state component - shown when API call fails
 */
function ErrorState({ error, imagePreview, onRetry, onReupload }) {
  return (
    <div className="space-y-4">
      {/* Error Icon and Message */}
      <div className="flex flex-col items-center py-6">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Analysis Failed
        </h4>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
          {error || 'An error occurred during AI analysis, please try again'}
        </p>
      </div>

      {/* Image thumbnail (if available) */}
      {imagePreview && (
        <div className="flex justify-center">
          <img
            src={imagePreview}
            alt="Receipt"
            className="w-24 h-24 object-cover rounded-xl opacity-50"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onReupload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Re-upload
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * No results state component - shown when no expenses are recognized
 */
function NoResultsState({ error, onReupload }) {
  return (
    <div className="space-y-4">
      {/* No Results Icon and Message */}
      <div className="flex flex-col items-center py-6">
        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
          <ImageOff className="w-10 h-10 text-amber-500" />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Expenses Recognized
        </h4>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
          {error || 'Unable to recognize expenses from the image, please try uploading a clearer receipt or bill'}
        </p>
      </div>

      {/* Tips */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tips:
        </p>
        <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li>• Ensure the image is clear and text is readable</li>
          <li>• Try to capture the complete receipt or bill</li>
          <li>• Avoid images that are too dark or overexposed</li>
        </ul>
      </div>

      {/* Re-upload Button */}
      <button
        onClick={onReupload}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Upload className="w-5 h-5" />
        Re-upload Images
      </button>
    </div>
  );
}

/**
 * Results editor component - displays parsed expenses in an editable table
 * Reuses ExpenseTable styling for visual consistency
 * Includes checkbox selection for each item and select all/deselect all functionality
 * Shows duplicate status and displays date with time
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
function ResultsEditor({ expenses, categories, onExpensesChange, onConfirm, isSaving }) {
  /**
   * Updates a specific expense field
   */
  const handleExpenseUpdate = useCallback((expenseId, field, value) => {
    const updatedExpenses = expenses.map(expense => {
      if (expense.id === expenseId) {
        return { ...expense, [field]: value };
      }
      return expense;
    });
    onExpensesChange(updatedExpenses);
  }, [expenses, onExpensesChange]);

  /**
   * Toggles selection state for a specific expense
   */
  const handleToggleSelect = useCallback((expenseId) => {
    const updatedExpenses = expenses.map(expense => {
      if (expense.id === expenseId) {
        return { ...expense, selected: !expense.selected };
      }
      return expense;
    });
    onExpensesChange(updatedExpenses);
  }, [expenses, onExpensesChange]);

  /**
   * Selects or deselects all expenses
   */
  const handleSelectAll = useCallback((selectAll) => {
    const updatedExpenses = expenses.map(expense => ({
      ...expense,
      selected: selectAll
    }));
    onExpensesChange(updatedExpenses);
  }, [expenses, onExpensesChange]);

  // Calculate selection stats
  const selectedCount = expenses.filter(e => e.selected).length;
  const allSelected = expenses.length > 0 && selectedCount === expenses.length;
  const noneSelected = selectedCount === 0;
  const selectedTotal = expenses
    .filter(e => e.selected)
    .reduce((sum, e) => sum + e.amount, 0);

  // Count duplicates for warning display (Requirements 5.1, 5.3)
  const selectedDuplicatesCount = expenses.filter(e => e.selected && e.isDuplicated).length;
  const hasDuplicatesSelected = selectedDuplicatesCount > 0;

  /**
   * Format date to display only day number (Requirements 4.4)
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {string} - Day number (1-31)
   */
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return String(date.getDate());
  };

  return (
    <div className="space-y-4">
      {/* Header with count and select all */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Recognized <span className="font-semibold text-purple-600 dark:text-purple-400">{expenses.length}</span> expense records
        </p>
        
        {/* Select all / Deselect all button */}
        <button
          onClick={() => handleSelectAll(!allSelected)}
          className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-4 h-4" />
              Deselect All
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              Select All
            </>
          )}
        </button>
      </div>

      {/* Table container */}
      <div 
        className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-10">
            <tr>
              <th scope="col" className="p-3 w-10">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={allSelected}
                />
              </th>
              {/* Status column - Requirements 4.1 */}
              <th scope="col" className="px-2 py-3 text-center">Status</th>
              {/* Date/Time column - Requirements 4.4, 4.5 */}
              <th scope="col" className="px-3 py-3 text-center">Date/Time</th>
              <th scope="col" className="px-3 py-3 text-center">Category</th>
              <th scope="col" className="px-3 py-3">Description</th>
              <th scope="col" className="px-3 py-3 text-center">Essential</th>
              <th scope="col" className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className={`border-b dark:border-gray-700 transition-colors ${
                  expense.isDuplicated
                    ? 'opacity-60 bg-amber-50/30 dark:bg-amber-900/10'
                    : expense.selected 
                      ? 'bg-violet-50/50 dark:bg-violet-900/20' 
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Checkbox */}
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    checked={expense.selected}
                    onChange={() => handleToggleSelect(expense.id)}
                  />
                </td>
                
                {/* Status - Requirements 4.1, 4.2, 4.3 */}
                <td className="px-2 py-2 text-center">
                  {expense.isDuplicated ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Duplicated
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      New
                    </span>
                  )}
                </td>
                
                {/* Date/Time - Requirements 4.4, 4.5 */}
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateDisplay(expense.date)}日
                    </span>
                    {expense.time && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {expense.time}
                      </span>
                    )}
                  </div>
                </td>
                
                {/* Category */}
                <td className="px-3 py-2 text-center">
                  <select
                    value={expense.category_id}
                    onChange={(e) => handleExpenseUpdate(expense.id, 'category_id', e.target.value)}
                    className="bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-1.5 transition-all outline-none appearance-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                
                {/* Description */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={expense.description || ''}
                    onChange={(e) => handleExpenseUpdate(expense.id, 'description', e.target.value)}
                    className="w-full bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/30 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block p-1.5 transition-all outline-none"
                  />
                </td>
                
                {/* Essential toggle */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center">
                    <div 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => handleExpenseUpdate(expense.id, 'is_essential', !expense.is_essential)}
                    >
                      <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
                        expense.is_essential ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm ${
                          expense.is_essential ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Amount */}
                <td className="px-3 py-2 text-right">
                  <div className="relative inline-block w-full max-w-[120px]">
                    <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                      <span className="text-violet-500 font-bold text-sm">¥</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={expense.amount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                          handleExpenseUpdate(expense.id, 'amount', value === '' ? 0 : parseFloat(value));
                        }
                      }}
                      className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-sm font-bold rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full pl-6 pr-2 py-1.5 transition-all text-right outline-none"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warning for selected duplicates - Requirements 5.1, 5.3 */}
      {hasDuplicatesSelected && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-medium">Warning:</span> You have selected {selectedDuplicatesCount} duplicate record(s). These may already exist in your expense history.
          </div>
        </div>
      )}

      {/* Summary footer with selection count */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-500 dark:text-gray-400">
            Selected <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedCount}</span> / {expenses.length} records
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            Selected Total: ¥{selectedTotal.toFixed(2)}
          </span>
        </div>

        {/* Confirm button */}
        <button
          onClick={onConfirm}
          disabled={noneSelected || isSaving}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all ${
            noneSelected || isSaving
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 hover:shadow-xl'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Confirm ({selectedCount} items)
            </>
          )}
        </button>
      </div>
    </div>
  );
}



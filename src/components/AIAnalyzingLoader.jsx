import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * AI Analyzing Loader Component
 * A visually appealing loading animation for AI image analysis
 * Features: pulse effect, scan line animation, progress text
 * Supports dark/light mode
 */
export function AIAnalyzingLoader({ imagePreview }) {
  const [progressText, setProgressText] = useState('Uploading image...');

  // Cycle through progress messages
  useEffect(() => {
    const progressMessages = [
      'Uploading image...',
      'AI is recognizing content...',
      'Extracting expense information...',
      'Organizing data...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % progressMessages.length;
      setProgressText(progressMessages[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Image with scanning effect */}
      <div className="relative w-full max-w-xs">
        {/* Image container with rounded corners */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-lg">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Analyzing"
              className="w-full h-48 object-contain opacity-60"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700" />
          )}
          
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
          </div>
          
          {/* Pulse overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 animate-pulse-slow" />
          
          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-purple-500 rounded-tl-lg animate-pulse" />
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-purple-500 rounded-tr-lg animate-pulse" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-purple-500 rounded-bl-lg animate-pulse" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-purple-500 rounded-br-lg animate-pulse" />
        </div>
      </div>

      {/* AI Icon with glow effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 animate-pulse-slow" />
        <div className="relative p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg">
          <Sparkles className="w-8 h-8 text-white animate-sparkle" />
        </div>
      </div>

      {/* Progress text */}
      <div className="text-center space-y-2">
        <p className="text-gray-700 dark:text-gray-200 font-medium text-lg animate-fade-text">
          {progressText}
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center gap-1.5">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full animate-progress-indeterminate" />
        </div>
      </div>
    </div>
  );
}

/**
 * Analysis Progress Component for batch image analysis
 * Displays progress indicator showing current image being analyzed
 * Requirements: 3.2
 * @param {Object} props
 * @param {number} props.current - Current image being analyzed (1-indexed)
 * @param {number} props.total - Total number of images to analyze
 * @param {string[]} props.imagePreviews - Array of preview URLs for thumbnails
 */
export function AnalysisProgress({ current, total, imagePreviews }) {
  const [progressText, setProgressText] = useState('Preparing analysis...');

  // Cycle through progress messages for current image
  useEffect(() => {
    const progressMessages = [
      'Uploading image...',
      'AI is recognizing content...',
      'Extracting expense information...',
      'Organizing data...'
    ];
    
    let index = 0;
    
    // Use setTimeout to avoid synchronous setState in effect
    const resetTimeout = setTimeout(() => {
      setProgressText(progressMessages[0]);
    }, 0);
    
    const interval = setInterval(() => {
      index = (index + 1) % progressMessages.length;
      setProgressText(progressMessages[index]);
    }, 2000);

    return () => {
      clearTimeout(resetTimeout);
      clearInterval(interval);
    };
  }, [current]);

  // Calculate progress percentage
  const progressPercent = total > 0 ? ((current - 1) / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Progress indicator - "Analyzing n/m images" */}
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Analyzing <span className="text-purple-600 dark:text-purple-400">{current}</span>/<span className="text-purple-600 dark:text-purple-400">{total}</span> images
        </p>
      </div>

      {/* Current image thumbnail with scanning effect */}
      <div className="relative w-full max-w-xs">
        <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-lg">
          {imagePreviews && imagePreviews[current - 1] ? (
            <img
              src={imagePreviews[current - 1]}
              alt={`Analyzing image ${current}`}
              className="w-full h-48 object-contain opacity-60"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700" />
          )}
          
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
          </div>
          
          {/* Pulse overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 animate-pulse-slow" />
          
          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-purple-500 rounded-tl-lg animate-pulse" />
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-purple-500 rounded-tr-lg animate-pulse" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-purple-500 rounded-bl-lg animate-pulse" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-purple-500 rounded-br-lg animate-pulse" />

          {/* Image index badge */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-sm font-medium">
            {current} / {total}
          </div>
        </div>
      </div>

      {/* Thumbnail strip showing all images */}
      {imagePreviews && imagePreviews.length > 1 && (
        <div className="flex gap-2 justify-center">
          {imagePreviews.map((preview, index) => (
            <div
              key={`thumb-${index}`}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                index === current - 1
                  ? 'border-purple-500 ring-2 ring-purple-500/30'
                  : index < current - 1
                  ? 'border-green-500 opacity-60'
                  : 'border-gray-300 dark:border-gray-600 opacity-40'
              }`}
            >
              <img
                src={preview}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Completed checkmark */}
              {index < current - 1 && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Icon with glow effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 animate-pulse-slow" />
        <div className="relative p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg">
          <Sparkles className="w-8 h-8 text-white animate-sparkle" />
        </div>
      </div>

      {/* Progress text */}
      <div className="text-center space-y-2">
        <p className="text-gray-700 dark:text-gray-200 font-medium text-lg animate-fade-text">
          {progressText}
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center gap-1.5">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Progress bar - shows overall batch progress */}
      <div className="w-full max-w-xs space-y-1">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Total progress: {Math.round(progressPercent)}%
        </p>
      </div>
    </div>
  );
}

export default AIAnalyzingLoader;

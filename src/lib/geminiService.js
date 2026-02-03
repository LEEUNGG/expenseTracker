/**
 * Gemini API Service for Receipt Image Analysis
 * 
 * This module provides functions to analyze receipt/bill images using
 * Google Gemini 2.5 Flash Lite API and extract expense information.
 */

// API Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Supported image formats
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic'
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validates if a file type is accepted
 * @param {string} mimeType - The MIME type to validate
 * @returns {boolean} - True if the file type is accepted
 */
export function isValidImageType(mimeType) {
  return ACCEPTED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Validates if a file size is within limits
 * @param {number} size - The file size in bytes
 * @returns {boolean} - True if the file size is valid
 */
export function isValidFileSize(size) {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Converts an image file to Base64 string
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} - Base64 encoded string (without data URL prefix)
 */
export function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Creates the structured prompt for Gemini API
 * @param {string} today - Today's date in YYYY-MM-DD format
 * @param {Array} categories - Available categories from backend
 * @returns {string} - The prompt text
 */
function createAnalysisPrompt(today, categories = []) {
  // Build category list string from dynamic categories
  const categoryNames = categories.length > 0
    ? categories.map(c => c.name).join(', ')
    : 'Dining, Transport, Shopping, Entertainment, Medical, Education, Housing, Other';

  return `你是一个专业的收据/账单识别助手。请分析这几张图片，都是支付宝或者微信的截图，根据里面的内容提取所有消费记录。

今天的日期是：${today}

请以 JSON 格式返回结果，格式如下：
{
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:mm" 或 null,
      "amount": 数字（不带货币符号）,
      "category": "分类名称（从以下选择：${categoryNames}）",
      "description": "消费描述",
      "is_essential": true/false（是否为必要消费）
    }
  ]
}

注意事项：
1. 如果图片中没有可识别的消费记录，返回 {"expenses": []}
2. 金额请转换为数字，去掉货币符号
3. 日期格式必须为 YYYY-MM-DD，如果无法确定日期，或显示为今天，使用今天 (${today}) 的日期，显示为昨天，就是用前一日的日期
4. 时间格式必须为 HH:mm（24小时制），如果图片中显示了具体的交易时间（小时:分钟），请提取到 time 字段；如果没有显示时间，time 字段返回 null
5. 分类，请从那个消费去判断，然后在我提供给你的选项列表内，选出最接近的一个。
6. is_essential 判断标准：食物、交通、医疗、住房等为必要消费(true)，娱乐、购物等为非必要消费(false)
7. 只返回 JSON，不要包含其他文字或 markdown 代码块标记`;
}

/**
 * Parses the Gemini API response and extracts expense data
 * @param {object} response - The raw API response
 * @returns {object} - Parsed expense data with expenses array
 * @throws {Error} - If parsing fails
 */
export function parseGeminiResponse(response) {
  if (!response) {
    throw new Error('Empty response from API');
  }

  // Extract text content from Gemini response structure
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates in API response');
  }

  const content = candidates[0].content;
  if (!content || !content.parts || content.parts.length === 0) {
    throw new Error('No content parts in API response');
  }

  const textPart = content.parts.find(part => part.text);
  if (!textPart) {
    throw new Error('No text content in API response');
  }

  let jsonText = textPart.text.trim();

  // Remove markdown code block markers if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Failed to parse JSON response: ' + e.message);
  }

  // Validate structure
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid response structure');
  }

  // Ensure expenses array exists
  if (!Array.isArray(parsed.expenses)) {
    parsed.expenses = [];
  }

  // Validate and normalize each expense item
  parsed.expenses = parsed.expenses.map((expense, index) => {
    // Validate required fields
    if (typeof expense.amount !== 'number' || isNaN(expense.amount)) {
      // Try to parse amount if it's a string
      const parsedAmount = parseFloat(expense.amount);
      if (isNaN(parsedAmount)) {
        throw new Error(`Invalid amount for expense at index ${index}`);
      }
      expense.amount = parsedAmount;
    }

    // Ensure date is valid, default to today if not
    if (!expense.date || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
      const now = new Date();
      expense.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Validate and normalize time field (HH:mm format or null)
    if (expense.time !== null && expense.time !== undefined) {
      // Validate time format: HH:mm (24-hour format)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (typeof expense.time !== 'string' || !timeRegex.test(expense.time)) {
        // Invalid time format, set to null
        expense.time = null;
      }
    } else {
      expense.time = null;
    }

    // Ensure category is a string
    if (typeof expense.category !== 'string') {
      expense.category = 'Other';
    }

    // Ensure description is a string
    if (typeof expense.description !== 'string') {
      expense.description = '';
    }

    // Ensure is_essential is a boolean
    if (typeof expense.is_essential !== 'boolean') {
      expense.is_essential = false;
    }

    return expense;
  });

  return parsed;
}

/**
 * Maps a category name to a category ID from the categories list
 * @param {string} categoryName - The category name from AI response
 * @param {Array} categories - The list of available categories
 * @returns {string} - The matched category ID
 */
export function mapCategoryToId(categoryName, categories) {
  if (!categories || categories.length === 0) {
    return null;
  }

  const normalized = (categoryName || '').toLowerCase().trim();

  // Try exact match first
  const exactMatch = categories.find(c =>
    c.name.toLowerCase() === normalized
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  // Try partial match
  const partialMatch = categories.find(c =>
    c.name.toLowerCase().includes(normalized) ||
    normalized.includes(c.name.toLowerCase())
  );
  if (partialMatch) {
    return partialMatch.id;
  }

  // Fallback to "Other" category or first category
  const otherCategory = categories.find(c => c.name === 'Other');
  return otherCategory?.id || categories[0]?.id;
}

/**
 * Analyzes a receipt image using Gemini API
 * @param {File} imageFile - The image file to analyze
 * @param {Array} categories - Available categories from backend
 * @returns {Promise<object>} - The parsed expense data
 * @throws {Error} - If analysis fails
 */
export async function analyzeReceiptImage(imageFile, categories = []) {
  // Validate file
  if (!imageFile) {
    throw new Error('No image file provided');
  }

  if (!isValidImageType(imageFile.type)) {
    throw new Error('Invalid file type. Please select a valid image file (JPEG, PNG, WebP, HEIC)');
  }

  if (!isValidFileSize(imageFile.size)) {
    throw new Error('File too large. Please select an image smaller than 10MB');
  }

  // Check API key
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
  }

  // Convert image to base64
  const base64Image = await imageToBase64(imageFile);

  // Get today's date in YYYY-MM-DD format (local time)
  const now = new Date();
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Prepare request body
  const requestBody = {
    contents: [{
      parts: [
        { text: createAnalysisPrompt(todayDate, categories) },
        {
          inline_data: {
            mime_type: imageFile.type,
            data: base64Image
          }
        }
      ]
    }]
  };

  // Make API request
  let response;
  try {
    response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  } catch {
    // Network connection failed, likely unable to reach Google services
    throw new Error('Network error: Unable to connect to Google AI. Please check your network or proxy settings.');
  }

  // Handle HTTP errors
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Ignore JSON parse errors for error response
    }
    throw new Error(errorMessage);
  }

  // Parse response
  const data = await response.json();

  // Parse and return expense data
  return parseGeminiResponse(data);
}

/**
 * Generates a unique ID for parsed expense items
 * @returns {string} - A unique ID string
 */
export function generateExpenseId() {
  return `expense_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Transforms parsed expenses into the format needed for the editor
 * @param {Array} expenses - Raw expenses from API
 * @param {Array} categories - Available categories
 * @returns {Array} - Transformed expense items with IDs and category_id
 */
export function transformExpensesForEditor(expenses, categories) {
  return expenses.map(expense => ({
    id: generateExpenseId(),
    date: expense.date,
    time: expense.time || null, // Preserve time field for deduplication
    amount: expense.amount,
    category_id: mapCategoryToId(expense.category, categories),
    description: expense.description,
    originalDescription: expense.description || '', // Store AI's original description for comparison
    descriptionModified: false, // Track if user has meaningfully modified the description
    is_essential: expense.is_essential,
    selected: true, // Default to selected
    // Preserve sourceImageIndex if present (for batch analysis)
    ...(typeof expense.sourceImageIndex === 'number' && { sourceImageIndex: expense.sourceImageIndex })
  }));
}

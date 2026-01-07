/**
 * 去重匹配引擎
 * 通过时间（精确到分钟）和金额匹配重复记录
 */

/**
 * 从数据库时间戳中提取日期和时间（直接解析 ISO 字符串，不做时区转换）
 * @param {string} timestamp - ISO 格式的时间戳，如 "2026-01-05T18:51:00+00:00"
 * @returns {{ date: string, time: string | null }} - 日期 "YYYY-MM-DD" 和时间 "HH:mm"
 */
export function extractDateTimeFromTimestamp(timestamp) {
  // 直接从 ISO 字符串中提取日期和时间，避免时区转换问题
  // 格式: "2026-01-05T18:51:00+00:00" 或 "2026-01-05T18:51:00"
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  
  if (!match) {
    // 如果格式不匹配，回退到 Date 解析（本地时区）
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time = (hours === '00' && minutes === '00') ? null : `${hours}:${minutes}`;
    return { date: `${year}-${month}-${day}`, time };
  }
  
  const [, dateStr, hours, minutes] = match;
  const time = (hours === '00' && minutes === '00') ? null : `${hours}:${minutes}`;
  
  return {
    date: dateStr,
    time
  };
}

/**
 * 格式化数据库时间戳为比较格式 "YYYY-MM-DD HH:mm"
 * @param {string} timestamp - ISO 格式的时间戳
 * @returns {string} - 格式化后的日期时间字符串
 * @deprecated 使用 extractDateTimeFromTimestamp 代替
 */
export function formatDateTimeForComparison(timestamp) {
  const { date, time } = extractDateTimeFromTimestamp(timestamp);
  return `${date} ${time || '00:00'}`;
}

export class DeduplicationService {
  /**
   * 检查单条记录是否与现有记录重复
   * 匹配规则：金额相同 + 时间相同（精确到分钟）
   * @param {Object} newExpense - AI 返回的新记录 { date, time, amount }
   * @param {Array} existingExpenses - 数据库中的现有记录
   * @returns {boolean} - 是否重复
   */
  static isDuplicate(newExpense, existingExpenses) {
    const newAmount = parseFloat(newExpense.amount);
    
    // 如果新记录没有时间信息，只比较日期和金额
    if (!newExpense.time) {
      return existingExpenses.some(existing => {
        const { date: existingDate, time: existingTime } = extractDateTimeFromTimestamp(existing.transaction_datetime);
        const existingAmount = parseFloat(existing.amount);
        
        // 如果数据库记录也没有时间（00:00），则只比较日期和金额
        if (!existingTime) {
          return existingDate === newExpense.date && existingAmount === newAmount;
        }
        return false;
      });
    }
    
    // 有时间信息，精确匹配日期+时间+金额
    return existingExpenses.some(existing => {
      const { date: existingDate, time: existingTime } = extractDateTimeFromTimestamp(existing.transaction_datetime);
      const existingAmount = parseFloat(existing.amount);
      
      return existingDate === newExpense.date && 
             existingTime === newExpense.time && 
             existingAmount === newAmount;
    });
  }

  /**
   * 批量标记重复状态
   * @param {Array} newExpenses - AI 返回的记录列表
   * @param {Array} existingExpenses - 数据库中的现有记录
   * @returns {Array} - 带有 isDuplicated 和 selected 状态的记录列表
   */
  static markDuplicates(newExpenses, existingExpenses) {
    return newExpenses.map(expense => {
      const isDuplicated = this.isDuplicate(expense, existingExpenses);
      return {
        ...expense,
        isDuplicated,
        selected: !isDuplicated // 重复的不勾选，新的默认勾选
      };
    });
  }
}

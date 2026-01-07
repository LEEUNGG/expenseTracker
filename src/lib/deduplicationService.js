/**
 * 去重匹配引擎
 * 通过时间（精确到分钟）和金额匹配重复记录
 */

/**
 * 格式化数据库时间戳为比较格式 "YYYY-MM-DD HH:mm"
 * @param {string} timestamp - ISO 格式的时间戳
 * @returns {string} - 格式化后的日期时间字符串
 */
export function formatDateTimeForComparison(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export class DeduplicationService {
  /**
   * 检查单条记录是否与现有记录重复
   * @param {Object} newExpense - AI 返回的新记录 { date, time, amount }
   * @param {Array} existingExpenses - 数据库中的现有记录
   * @returns {boolean} - 是否重复
   */
  static isDuplicate(newExpense, existingExpenses) {
    // 没有时间信息无法精确匹配，返回 false（视为新记录）
    if (!newExpense.time) {
      return false;
    }
    
    const newDateTime = `${newExpense.date} ${newExpense.time}`;
    const newAmount = parseFloat(newExpense.amount);
    
    return existingExpenses.some(existing => {
      const existingDateTime = formatDateTimeForComparison(existing.transaction_datetime);
      const existingAmount = parseFloat(existing.amount);
      
      return existingDateTime === newDateTime && existingAmount === newAmount;
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

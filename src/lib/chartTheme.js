export const MORANDI_THEME = {
  // Main Series Colors (Muted, Earthy, High-end)
  colors: [
    '#93B5C6', // Muted Blue
    '#C9CCD5', // Soft Grey
    '#E4D8B4', // Sand/Beige
    '#EFAAC4', // Dusty Pink
    '#92A89A', // Sage Green
    '#B5EAD7', // Mint
    '#C7CEEA', // Periwinkle
    '#FF9AA2', // Salmon
  ],
  // Functional Colors (replacing standard semantic colors with Morandi versions)
  semantic: {
    primary: '#93B5C6', // Muted Blue
    success: '#92A89A', // Sage Green (replacing bright green)
    danger: '#D08383',  // Dusty Red (replacing bright red)
    warning: '#E4D8B4', // Sand (replacing bright yellow)
    info: '#C7CEEA',    // Periwinkle
    
    // Specific functional mappings
    budget: '#92A89A',  // Sage Green for budget/positive
    spending: '#D08383', // Dusty Red for spending/negative
    remaining: '#C9CCD5', // Grey for remaining/neutral
  },
  // Specific configurations for different chart types
  charts: {
    budgetLine: {
      budget: '#92A89A', // Sage
      spending: '#D08383', // Dusty Red
    },
    monthlyTrend: {
      line: '#93B5C6', // Muted Blue
      areaTop: 'rgba(147, 181, 198, 0.4)',
      areaBottom: 'rgba(147, 181, 198, 0.05)',
    },
    summaryBar: {
      underBudget: {
        start: '#93B5C6', // Muted Blue
        end: '#7A9E9F'    // Deep Sage
      },
      overBudget: {
        start: '#EFAAC4', // Dusty Pink
        end: '#D08383'    // Dusty Red
      }
    },
    debt: {
      current: '#93B5C6',   // Muted Blue
      remaining: '#C9CCD5', // Soft Grey
      cashFlow: '#92A89A',  // Sage Green
    }
  }
};

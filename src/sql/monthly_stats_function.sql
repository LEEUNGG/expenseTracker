-- Function to get monthly statistics for a given year
-- Usage: SELECT * FROM get_monthly_stats(2026);

CREATE OR REPLACE FUNCTION get_monthly_stats(year_input INT)
RETURNS TABLE (
    month INT,
    total_spending DECIMAL(10, 2),
    total_budget DECIMAL(10, 2),
    days_over_budget INT,
    days_under_budget INT
) AS $$
BEGIN
    RETURN QUERY
    WITH DateSeries AS (
        SELECT generate_series(
            (year_input || '-01-01')::DATE,
            (year_input || '-12-31')::DATE,
            '1 day'::INTERVAL
        )::DATE AS date
    ),
    DailyData AS (
        SELECT
            ds.date,
            EXTRACT(MONTH FROM ds.date)::INT AS month_num,
            -- Calculate Daily Budget
            COALESCE(
                ba.budget_amount, -- 1. Manual Adjustment
                CASE 
                    WHEN h.type = 'holiday' THEN 150 -- 2. Holiday
                    WHEN h.type = 'workday' THEN 100 -- 3. Workday (even if weekend)
                    WHEN EXTRACT(ISODOW FROM ds.date) IN (6, 7) THEN 150 -- 4. Weekend
                    ELSE 100 -- 5. Weekday
                END
            ) AS daily_budget,
            -- Calculate Daily Spending
            COALESCE(SUM(e.amount), 0) AS daily_spending
        FROM DateSeries ds
        LEFT JOIN budget_adjustments ba ON ds.date = ba.date
        LEFT JOIN holidays h ON ds.date = h.date
        LEFT JOIN expenses e ON DATE(e.transaction_datetime AT TIME ZONE 'Asia/Shanghai') = ds.date
        GROUP BY ds.date, ba.budget_amount, h.type
    )
    SELECT
        DailyData.month_num AS month,
        SUM(daily_spending)::DECIMAL(10, 2) AS total_spending,
        SUM(daily_budget)::DECIMAL(10, 2) AS total_budget,
        COUNT(CASE WHEN daily_spending > daily_budget THEN 1 END)::INT AS days_over_budget,
        COUNT(CASE WHEN daily_spending <= daily_budget THEN 1 END)::INT AS days_under_budget
    FROM DailyData
    GROUP BY DailyData.month_num
    ORDER BY DailyData.month_num;
END;
$$ LANGUAGE plpgsql;

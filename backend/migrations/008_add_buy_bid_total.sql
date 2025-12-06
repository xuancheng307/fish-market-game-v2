-- 新增當日買入標單總額欄位
ALTER TABLE daily_results ADD COLUMN buy_bid_total DECIMAL(15,2) DEFAULT 0;

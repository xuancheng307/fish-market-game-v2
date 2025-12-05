/**
 * 資料轉換工具 - 處理 snake_case (資料庫) ↔ camelCase (API) 轉換
 *
 * 這是確保命名一致性的核心工具
 */

/**
 * 將 snake_case 轉換為 camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 將 camelCase 轉換為 snake_case
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 轉換物件的所有鍵從 snake_case 到 camelCase
 */
function objectSnakeToCamel(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => objectSnakeToCamel(item));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = snakeToCamel(key);
        camelObj[camelKey] = objectSnakeToCamel(value);
    }
    return camelObj;
}

/**
 * 轉換物件的所有鍵從 camelCase 到 snake_case
 */
function objectCamelToSnake(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => objectCamelToSnake(item));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = camelToSnake(key);
        snakeObj[snakeKey] = objectCamelToSnake(value);
    }
    return snakeObj;
}

/**
 * 遊戲資料 (games 表) 轉換為 API 格式
 */
function gameToApi(dbRow) {
    if (!dbRow) return null;

    return {
        id: dbRow.id,
        gameName: dbRow.name,
        description: dbRow.description,
        status: dbRow.status,

        totalDays: dbRow.total_days,
        currentDay: dbRow.current_day,
        numTeams: dbRow.num_teams,

        initialBudget: parseFloat(dbRow.initial_budget),
        dailyInterestRate: parseFloat(dbRow.daily_interest_rate),
        loanInterestRate: parseFloat(dbRow.loan_interest_rate),
        maxLoanRatio: parseFloat(dbRow.max_loan_ratio),

        unsoldFeePerKg: parseFloat(dbRow.unsold_fee_per_kg),
        fixedUnsoldRatio: parseFloat(dbRow.fixed_unsold_ratio),

        distributorFloorPriceA: parseFloat(dbRow.distributor_floor_price_a),
        distributorFloorPriceB: parseFloat(dbRow.distributor_floor_price_b),
        targetPriceA: parseFloat(dbRow.target_price_a),
        targetPriceB: parseFloat(dbRow.target_price_b),

        // 新增：預設每日供給量和餐廳資金池
        defaultFishASupply: dbRow.default_fish_a_supply || 100,
        defaultFishBSupply: dbRow.default_fish_b_supply || 100,
        defaultFishARestaurantBudget: parseFloat(dbRow.default_fish_a_restaurant_budget) || 50000,
        defaultFishBRestaurantBudget: parseFloat(dbRow.default_fish_b_restaurant_budget) || 50000,

        buyingDuration: dbRow.buying_duration,
        sellingDuration: dbRow.selling_duration,

        // 新增：庫存設定
        clearInventoryDaily: dbRow.clear_inventory_daily !== 0 && dbRow.clear_inventory_daily !== false,

        teamNames: dbRow.team_names ? JSON.parse(dbRow.team_names) : [],
        isForceEnded: Boolean(dbRow.is_force_ended),
        forceEndedAt: dbRow.force_ended_at,
        forceEndDay: dbRow.force_end_day,

        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at
    };
}

/**
 * 每日資料 (game_days 表) 轉換為 API 格式
 */
function gameDayToApi(dbRow) {
    if (!dbRow) return null;

    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        dayNumber: dbRow.day_number,
        status: dbRow.status,

        fishASupply: dbRow.fish_a_supply,
        fishARestaurantBudget: parseFloat(dbRow.fish_a_restaurant_budget),

        fishBSupply: dbRow.fish_b_supply,
        fishBRestaurantBudget: parseFloat(dbRow.fish_b_restaurant_budget),

        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at
    };
}

/**
 * 團隊資料 (game_participants 表) 轉換為 API 格式
 */
function teamToApi(dbRow) {
    if (!dbRow) return null;

    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        userId: dbRow.user_id,
        teamName: dbRow.team_name,
        teamNumber: dbRow.team_number,

        cash: parseFloat(dbRow.cash),
        initialBudget: parseFloat(dbRow.initial_budget),
        totalLoan: parseFloat(dbRow.total_loan),
        totalLoanPrincipal: parseFloat(dbRow.total_loan_principal),

        fishAInventory: dbRow.fish_a_inventory,
        fishBInventory: dbRow.fish_b_inventory,

        cumulativeProfit: parseFloat(dbRow.cumulative_profit),
        roi: parseFloat(dbRow.roi),

        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at
    };
}

/**
 * 投標資料 (bids 表) 轉換為 API 格式
 */
function bidToApi(dbRow) {
    if (!dbRow) return null;

    const price = parseFloat(dbRow.price);
    const quantityFulfilled = dbRow.quantity_fulfilled || 0;
    const totalCost = price * quantityFulfilled;

    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        gameDayId: dbRow.game_day_id,
        dayNumber: dbRow.day_number,
        teamId: dbRow.team_id,
        teamName: dbRow.team_name,
        teamNumber: dbRow.team_number,

        bidType: dbRow.bid_type,
        fishType: dbRow.fish_type,

        price: price,
        quantitySubmitted: dbRow.quantity_submitted,
        quantityFulfilled: quantityFulfilled,

        totalCost: totalCost,
        failReason: null,  // 保留給未來教學功能使用

        status: dbRow.status,

        createdAt: dbRow.created_at
    };
}

/**
 * 每日結果 (daily_results 表) 轉換為 API 格式
 */
function dailyResultToApi(dbRow) {
    if (!dbRow) return null;

    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        gameDayId: dbRow.game_day_id,
        teamId: dbRow.team_id,
        dayNumber: dbRow.day_number,

        // 財務數據
        totalRevenue: parseFloat(dbRow.revenue),
        totalCost: parseFloat(dbRow.cost),
        dailyProfit: parseFloat(dbRow.profit),
        loanInterest: parseFloat(dbRow.interest_paid),
        unsoldPenalty: parseFloat(dbRow.unsold_fee),

        // 期末狀態
        dayEndCash: parseFloat(dbRow.cash),
        totalLoan: parseFloat(dbRow.total_loan),
        fishAInventory: dbRow.fish_a_inventory,
        fishBInventory: dbRow.fish_b_inventory,

        // 累計數據
        cumulativeProfit: parseFloat(dbRow.cumulative_profit),
        roi: parseFloat(dbRow.roi),

        // 交易量數據
        fishAPurchased: dbRow.fish_a_purchased || 0,
        fishASold: dbRow.fish_a_sold || 0,
        fishBPurchased: dbRow.fish_b_purchased || 0,
        fishBSold: dbRow.fish_b_sold || 0,

        // 滯銷數量
        fishAUnsold: dbRow.fish_a_unsold || 0,
        fishBUnsold: dbRow.fish_b_unsold || 0,

        // 團隊編號
        teamNumber: dbRow.team_number || null,

        createdAt: dbRow.created_at
    };
}

/**
 * 用戶資料 (users 表) 轉換為 API 格式
 */
function userToApi(dbRow) {
    if (!dbRow) return null;

    return {
        id: dbRow.id,
        username: dbRow.username,
        role: dbRow.role,
        displayName: dbRow.display_name,
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at
        // 注意: 不返回 password_hash
    };
}

/**
 * API 格式的遊戲資料轉換為資料庫格式
 */
function apiToGame(apiData) {
    return {
        name: apiData.gameName,
        description: apiData.description,
        status: apiData.status,

        total_days: apiData.totalDays,
        current_day: apiData.currentDay,
        num_teams: apiData.numTeams,

        initial_budget: apiData.initialBudget,
        daily_interest_rate: apiData.dailyInterestRate,
        loan_interest_rate: apiData.loanInterestRate,
        max_loan_ratio: apiData.maxLoanRatio,

        unsold_fee_per_kg: apiData.unsoldFeePerKg,
        fixed_unsold_ratio: apiData.fixedUnsoldRatio,

        distributor_floor_price_a: apiData.distributorFloorPriceA,
        distributor_floor_price_b: apiData.distributorFloorPriceB,
        target_price_a: apiData.targetPriceA,
        target_price_b: apiData.targetPriceB,

        // 新增：預設每日供給量和餐廳資金池
        default_fish_a_supply: apiData.defaultFishASupply,
        default_fish_b_supply: apiData.defaultFishBSupply,
        default_fish_a_restaurant_budget: apiData.defaultFishARestaurantBudget,
        default_fish_b_restaurant_budget: apiData.defaultFishBRestaurantBudget,

        buying_duration: apiData.buyingDuration,
        selling_duration: apiData.sellingDuration,

        // 新增：庫存設定
        clear_inventory_daily: apiData.clearInventoryDaily !== false ? 1 : 0,

        team_names: Array.isArray(apiData.teamNames) ? JSON.stringify(apiData.teamNames) : null
    };
}

/**
 * API 格式的投標資料轉換為資料庫格式
 */
function apiToBid(apiData) {
    return {
        game_id: apiData.gameId,
        game_day_id: apiData.gameDayId,
        day_number: apiData.dayNumber,
        team_id: apiData.teamId,
        bid_type: apiData.bidType,
        fish_type: apiData.fishType,
        price: apiData.price,
        quantity_submitted: apiData.quantitySubmitted,
        quantity_fulfilled: apiData.quantityFulfilled || 0,
        status: apiData.status || 'pending'
    };
}

module.exports = {
    // 基本轉換
    snakeToCamel,
    camelToSnake,
    objectSnakeToCamel,
    objectCamelToSnake,

    // 資料庫 → API
    gameToApi,
    gameDayToApi,
    teamToApi,
    bidToApi,
    dailyResultToApi,
    userToApi,

    // API → 資料庫
    apiToGame,
    apiToBid
};

import { loginIG } from './helper_functions/login_ig.js';
import { getAccountBalance } from './helper_functions/account_balance.js';
import { getOpenPositions } from './helper_functions/open_positions.js';
import { getClosedTrades } from './helper_functions/closed_trades.js';
import {isMarketOpen} from './helper_functions/is_market_open.js';
import { closePosition } from './helper_functions/close_position.js';

export async function executeScheduledTask(request, env, ctx, usingDemoAccount) {

    let baseURL;
    if (usingDemoAccount) {
        baseURL = 'https://demo-api.ig.com/gateway/deal';
    } else {
        baseURL = 'https://api.ig.com/gateway/deal';
    }

    const { CST, X_SECURITY_TOKEN } = await loginIG(env, baseURL);

    // Check if nasdaq 100 futures are open & exit if not
	const marketStatus = await isMarketOpen(env, CST, X_SECURITY_TOKEN, baseURL);
	if (marketStatus === "EDITS_ONLY") {
		return;
	}

    const accountBalance = await getAccountBalance(env, CST, X_SECURITY_TOKEN, baseURL);

    const openPositionsData = await getOpenPositions(env, CST, X_SECURITY_TOKEN, baseURL, accountBalance);

    // Initialize an empty object to store the summed profit and loss for each market
    let openSummedPositions = {};

    openPositionsData.positions.forEach(position => {

        const instrumentName = position.market.instrumentName;
        const direction = position.position.direction;
        const positionSize = position.position.size;

        let pl;

        if (direction === 'BUY') {
            const price = position.market.bid;
            // Using Math.round() to keep the pl at 2 decimal places
            pl = Math.round((price - position.position.level) * positionSize * 100) / 100;
        } else if (direction === 'SELL') {
            const price = position.market.offer;
            pl = Math.round((position.position.level - price) * positionSize * 100) / 100;
        }

        if (openSummedPositions[instrumentName]) {
            // Using Math.round() to keep the pl at 2 decimal places
            openSummedPositions[instrumentName].pl = Math.round((openSummedPositions[instrumentName].pl + pl) * 100) / 100;
            openSummedPositions[instrumentName].positions.push(position);
        } else {
            openSummedPositions[instrumentName] = { pl: pl, positions: [position] };
        }

    });

    // Add a plRatio property to each instrumentName and the market status
    for (const instrumentName in openSummedPositions) {
        const plRatio = openSummedPositions[instrumentName].pl / accountBalance;
        openSummedPositions[instrumentName].plRatio = plRatio;
        const marketStatus = openSummedPositions[instrumentName].positions[0].market.marketStatus;
        openSummedPositions[instrumentName].marketStatus = marketStatus;
    }

    const closedSummedPositions = await getClosedTrades(env, 7);

    // Check if any closed position pl plus open position pl is less than -2% of account balance
    // If so, add the instrumentName to the instrumentNamesToClose array
    const instrumentNamesToClose = [];
    for (const [key, value] of Object.entries(closedSummedPositions)) {
        let totalValue = value;
        if (openSummedPositions[key]) {
            totalValue += openSummedPositions[key].pl;
        }
        if (totalValue / accountBalance < -0.02) {
            instrumentNamesToClose.push(key);
        }
    }

    // Below return shows which instruments have a 7 day ban
    //return instrumentNamesToClose;

    // Now check if there are any open positions for the instrumentNamesToClose
    const positionsToClose = [];

    for (const instrumentName of instrumentNamesToClose) {
        if (openSummedPositions[instrumentName] && openSummedPositions[instrumentName].marketStatus === "TRADEABLE") { 
            for (const position of openSummedPositions[instrumentName].positions) {
                const positionDetailsForClosure = {
                    dealId: position.position.dealId,
                    epic: null,
                    expiry: null,
                    direction: position.position.direction === "BUY" ? "SELL" : "BUY",
                    size: String(position.position.size),
                    level: null,
                    orderType: "MARKET",
                    timeInForce: "FILL_OR_KILL",
                    quoteId: null,
                };
                positionsToClose.push(positionDetailsForClosure);
            }
        }
    }

    // Now close each position in positionsToClose
    
    // Iterate over positionsToClose and make a request for each
    let closedPositionsErrors = [];
    for (const position of positionsToClose) {
        try {
            await closePosition(env, CST, X_SECURITY_TOKEN, baseURL, position);
        } catch (error) {
            closedPositionsErrors.push(error);
        }
    }

    if (closedPositionsErrors.length > 0) {
        throw new Error(`Failed to close positions: ${closedPositionsErrors.map(error => error.message).join(", ")}`);
    }

}
import { loginIG } from './helper_functions/login_ig.js';
import { getAccountBalance } from './helper_functions/account_balance.js';
import { getOpenPositions } from './helper_functions/open_positions.js';
import { getClosedTrades } from './helper_functions/closed_trades.js';

export async function tradingBan(request, env, ctx, usingDemoAccount) {

    let baseURL;
    if (usingDemoAccount) {
        baseURL = 'https://demo-api.ig.com/gateway/deal';
    } else {
        baseURL = 'https://api.ig.com/gateway/deal';
    }

    const { CST, X_SECURITY_TOKEN } = await loginIG(env, baseURL);

    const accountBalance = await getAccountBalance(env, CST, X_SECURITY_TOKEN, baseURL);

    const openSummedPositions = await getOpenPositions(env, CST, X_SECURITY_TOKEN, baseURL, accountBalance);

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

            //Remove this when EU Stocks 50 is normalized
            if (key !== "EU Stocks 50") {
                instrumentNamesToClose.push(key);
            }
        }
    }

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
    
    // Define the headers
    const closePositionHeaders = {
        'Content-Type': 'application/json',
        'X-IG-API-KEY': env.IG_API_KEY,
        'Version': '1',
        'CST': CST,
        'X-SECURITY-TOKEN': X_SECURITY_TOKEN,
        '_method': 'DELETE'
    };

    // Iterate over positionsToClose and make a request for each
    for (const position of positionsToClose) {
        const response = await fetch(`${baseURL}/positions/otc`, {
            method: 'POST',
            headers: closePositionHeaders,
            body: JSON.stringify(position)
        });

        if (!response.ok) {
            console.error(`Failed to close position. Status code: ${response.status}`);
        } else {
            console.log(`Position closed successfully.`);
        }
    }

    //return positionsToClose;


}
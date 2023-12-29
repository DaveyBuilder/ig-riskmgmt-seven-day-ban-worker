export async function getClosedTrades(env, days) {

    // Get closed trades from the past 7 days from the database
    const sqlStatement = await env.DB.prepare(`
        SELECT * FROM CLOSEDPOSITIONS WHERE datetime(closedDateUtc) >= datetime('now', '-${days} days', 'utc')
    `);
    const dbResults = await sqlStatement.all();

    if (dbResults.success === false) {
        throw new Error(`Error getting closed positions from the database.`);
    }

    let summedResults = {};
    for (const row of dbResults.results) {
        // Remove the currency symbol and convert to number
        let profitAndLoss = Number(row.profitAndLoss.replace('£', ''));
        
        // If the instrumentName is not in summedResults, add it with a starting value of 0
        if (!summedResults[row.instrumentName]) {
            summedResults[row.instrumentName] = 0;
        }
        
        // Add the profitAndLoss to the existing value
        summedResults[row.instrumentName] += profitAndLoss;
    }

    return summedResults;
}
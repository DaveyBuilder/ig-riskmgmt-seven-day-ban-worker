export async function getClosedTrades(env, days) {

    let attempts = 1;
    let dbResults;

    while (attempts <= 3) {

        try {
            // Get closed trades from the past X days from the database
            const sqlStatement = await env.DB.prepare(`
                SELECT * FROM CLOSEDPOSITIONS WHERE datetime(closedDateUtc) >= datetime('now', '-${days} days', 'utc')
            `);
            dbResults = await sqlStatement.all();

            if (dbResults.success === false) {
                throw new Error(`Error getting closed positions from the database.`);
            }

            // If data is successfully retrieved, break out of the loop
            console.log(`Closed positions retrieved successfully from db on attempt ${attempts}`);
            break;

        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts}: Failed to get closed positions from DB - ${error.message}`);
            if (attempts > 3) {
                throw new Error(`Failed to get closed positions after ${attempts} attempts.`);
            }
        }

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
export async function getAccountBalance(env, CST, X_SECURITY_TOKEN, baseURL) {

    const accountResponse = await fetch(`${baseURL}/accounts`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-IG-API-KEY': env.IG_API_KEY,
            'Version': '1',
            'CST': CST,
            'X-SECURITY-TOKEN': X_SECURITY_TOKEN
        }
    });

    if (!accountResponse.ok) {
        throw new Error(`Error getting account. HTTP status: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();

    let accountBalance;
    let account;
    // (If it's the demo account)
    if (baseURL === 'https://demo-api.ig.com/gateway/deal') {
        accountBalance = accountData.accounts[1].balance.balance;
    } else {
        account = accountData.accounts.find(acc => acc.accountName === "Spread bet 2");
        accountBalance = account.balance.balance;
    }

    return accountBalance;
}
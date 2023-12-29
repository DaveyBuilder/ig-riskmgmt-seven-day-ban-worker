import { tradingBan } from './main.js';

export default {

	async fetch(request, env, ctx) {

		// const usingDemoAccount = false;

		// const data = await tradingBan(request, env, ctx, usingDemoAccount)
		// const jsonData = JSON.stringify(data, null, 2);
		// // Return the JSON data when the worker URL is visited
		// return new Response(jsonData, {
		// 	headers: { "content-type": "application/json" },
		// });

		// Return a simple message when the worker URL is visited
		return new Response("Cloudflare worker is running.", {
			headers: { "content-type": "text/plain" },
		});
	},

	async scheduled(event, env, ctx) {

		const usingDemoAccount = false;

		// Call processRequest on the cron schedule
		return tradingBan(event, env, ctx, usingDemoAccount);
	},

};
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');

const app = new Koa();
const router = Router({prefix: '/api'});

app.use(cors())

function sleep() {
	const time = Math.random() * 5;
	return new Promise(resolve => setTimeout(resolve, time　* 1000));
}


router
	.use(async (ctx, next) => {
		await sleep();
		await next();
	})
	.get('/store/:id', (ctx) => {
		ctx.body = {
			id: ctx.params.id,
			name: '真好味美食館',
			lat: 22.732948,
			lng: 120.288153,
			address: '高雄市楠梓區高雄大學路 700 號',
			news: '中天新聞',
			switchable: false,
			lastModified: new Date().toISOString(),
			ip: '140.127.220.3',
		};
	})
	.get('/search/:name', (ctx) => {
		ctx.body = [
			{
				id: ctx.params.id,
				name: '真好味美食館',
				lat: 22.732948,
				lng: 120.288153,
				address: '高雄市楠梓區高雄大學路 700 號',
				news: '中天新聞',
				switchable: false,
				lastModified: new Date().toISOString(),
				ip: '140.127.220.3',
			},
			{
				id: ctx.params.id,
				name: '真好味美食館２',
				lat: 22.733717,
				lng: 120.288341,
				address: '高雄市楠梓區高雄大學路 700 號',
				news: '公視新聞',
				switchable: false,
				lastModified: new Date().toISOString(),
				ip: '140.127.220.3',
			},
			{
				id: ctx.params.id,
				name: '真好味美食館３',
				lat: 22.733525,
				lng: 120.281847,
				address: '高雄市楠梓區高雄大學路 700 號',
				news: '台視新聞',
				switchable: false,
				lastModified: new Date().toISOString(),
				ip: '140.127.220.3',
			}
		]
	})
	.post('/api/store', (ctx) => {
		ctx.body = Math.floor(Math.random() * 1000);
	})
	.put('/api/store/:id', (ctx) => {
		ctx.body = ctx.params.id;
	});

app.use(router.routes());
app.listen(5000);
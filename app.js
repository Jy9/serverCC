var http = require("http"),
	https = require("https"),
	express = require('express'),
	app = express(),
	fs = require('fs'),
	bodyParser = require('body-parser'),
	async = require('async'),
	mongoClient = require('mongodb').MongoClient;

var url = "mongodb://localhost:27017/CC";
	
/*mongoClient.connect(url,function(err,db){
	var dbase = db.db("CC");
	var user = dbase.collection('user')
	user.find({})
})*/

//设置跨域访问
app.all('*', function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");
   res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
   res.header("X-Powered-By",' 3.2.1');
   res.header("Content-Type", "application/json;charset=utf-8");
   
   next();
});
app.use(bodyParser.json({ extended: false }));

app.use(bodyParser.json());
 

(async function(){
    let db = await MongoClient.connect(url);
    let coll = db.collection('user');
    app.post('/user', function(req, res){
		https.get("https://api.weixin.qq.com/sns/jscode2session?appid=wx433c5da9f8727025&secret=16b840a8b6eb1d4cb674934bdf717d52&js_code="+req.body.code+"&grant_type=authorization_code",function(ress){
			var datas = {};
	        ress.on('data', function(data){
	            datas=data;
	        })
	        ress.on('end', function(data){
	        	var openid = JSON.parse(datas.toString()).openid; 
	            console.log(openid)
	            var user = coll.find({"openid":openid})
	            var len = user.toArray().length;
	            if(len == 0)
	        	console.log(user);
	        	res.send(user)
	        })
		})
	});
})().catch(err=> {
    console.log(err);
});


var options = {
	key:fs.readFileSync('./2_ccskill.club.key'),
	cert:fs.readFileSync('./1_ccskill.club_bundle.crt')
};
 
var httpsServer = https.createServer(options, app).listen(80,function(){
	console.log("80端口已启动！")
});
/*app.listen(3000, function () {
	  console.log("3000端口启动成功")
})*/
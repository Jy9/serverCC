var http = require("http"),
	https = require("https"),
	express = require('express'),
	app = express(),
	fs = require('fs'),
	bodyParser = require('body-parser');
	
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

// 创建 application/x-www-form-urlencoded 编码解析  
app.post('/user', function(req, res){
	console.log(req.body)
	res.send({
          name: req.body.userInfo.name,
          sex: req.body.userInfo.sex,
          image: req.body.userInfo.image,
          city: req.body.userInfo.city,
          introduce: "这个人很懒，什么也没留下。",
          hreat:0
    })
});

/*var options = {
	pfx:fs.readFileSync('./server.pfx'),
	passphrase:'jiayue999'
};
 
var httpsServer = https.createServer(options, app).listen(3000,function(){
	console.log("3000端口已启动！")
});*/
app.listen(3000, function () {
	  console.log("3000端口启动成功")
})
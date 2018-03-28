var http = require("http"),
	https = require("https"),
	express = require('express'),
	app = express(),
	fs = require('fs'),
	bodyParser = require('body-parser'),
	async = require('async'),
	mongoClient = require('mongodb').MongoClient;

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

var url = "mongodb://localhost:27017/CC";

mongoClient.connect(url,function(err,db){
	var dbs = db.db("CC");
	mongocallback(dbs)
});
function mongocallback(dbs){
	var users = dbs.collection('user');
	//获取用户信息及创建用户/更新用户
	app.post('/user', function(req, res){
		https.get("https://api.weixin.qq.com/sns/jscode2session?appid=wx433c5da9f8727025&secret=16b840a8b6eb1d4cb674934bdf717d52&js_code="+req.body.code+"&grant_type=authorization_code",function(ress){
			var datas = {};
	        ress.on('data', function(data){
	            datas=data;
	        })
	        ress.on('end', function(data){
	        	openid = JSON.parse(datas.toString()).openid;
	        	var userfind = users.find({"openid":openid})
		        userfind.toArray(function(err1, user) {
		        	if(user.length == 0){
		            	console.log("没有用户 开始创建");
		            	var peoplenum = 0;
		            	users.find().toArray(function(err2, user1) {
		            		peoplenum = user1.length-0+1;
		            		req.body.userInfo.openid = openid;
		    				req.body.userInfo.uid = peoplenum;
		    				req.body.userInfo.utype = 0;
		    				users.insertOne(req.body.userInfo, function(err3, data) {
			                    if(err3){
			                    	console.log(err3);
			                    }else{
			                    	console.log("用户创建成功");
			                    	delete req.body.userInfo.openid;
			                    	delete req.body.userInfo._id;
			                    	res.send(req.body.userInfo)
			                    }
			                });
		            	})
		            }else{
		            	user = user[0];
		            	user.name = req.body.userInfo.name;
		            	user.sex = req.body.userInfo.sex;
		            	user.image = req.body.userInfo.image;
		            	user.city = req.body.userInfo.city;
		            	users.updateOne({"openid":openid}, {$set:user}, function(err2, data) {
					        if (!err2){
						        console.log("用户更新成功");
						        delete user.openid;
						        delete user._id;
				        		res.send(user);
				        	}else{
				        		console.log("err2")
				        	}
					    });
		            	
		            }
		        });
	        })
        })
	});
	
	//更改用户introduce
	app.post("/setintroduce",function(req,res){
		users.updateOne({"uid":req.body.uid}, {$set:{"introduce":req.body.introduce}}, function(err, data) {
	        if (!err){
		        console.log("用户修改成功");
        		res.send("ok");
        	}else{
        		console.log(err)
        	}
	    });
	});
}

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
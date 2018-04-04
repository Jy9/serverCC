var http = require("http"),
	https = require("https"),
	express = require('express'),
	app = express(),
	fs = require('fs'),
	path = require('path'),
	bodyParser = require('body-parser'),
	mongoClient = require('mongodb').MongoClient,
	multer = require("multer");


//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({
	extended: false
}));

var url = "mongodb://localhost:27017/CC";

mongoClient.connect(url, function(err, db) {
	var dbs = db.db("CC");
	mongocallback(dbs)
});

function mongocallback(dbs) {
	var users = dbs.collection('user');
	var article = dbs.collection('article');
	var discuss = dbs.collection('discuss');
	var report = dbs.collection('report');

	//获取平台注册人数
	app.post("/userlength", function(req, res) {
		users.find().toArray(function(err, user) {
			if(!err) {
				res.send(user.length + "");
			} else {
				console.log(err);
			}
		})
	})

	//获取用户信息及创建用户/更新用户
	app.post('/user', function(req, res) {
		https.get("https://api.weixin.qq.com/sns/jscode2session?appid=wx433c5da9f8727025&secret=16b840a8b6eb1d4cb674934bdf717d52&js_code=" + req.body.code + "&grant_type=authorization_code", function(ress) {
			var datas = {};
			ress.on('data', function(data) {
				datas = data;
			})
			ress.on('end', function(data) {
				openid = JSON.parse(datas.toString()).openid;
				users.find({
					"openid": openid
				}).toArray(function(err1, user) {
					if(user.length == 0) {
						console.log("没有用户 开始创建");
						users.find().toArray(function(err2, user1) {
							req.body.userInfo.openid = openid;
							req.body.userInfo.uid = user1.length - 0 + 1;
							req.body.userInfo.utype = 0;
							req.body.userInfo.articlelist = [];
							req.body.userInfo.attent = [];
							users.insertOne(req.body.userInfo, function(err3, data) {
								if(err3) {
									console.log(err3);
								} else {
									console.log("用户创建成功");
									delete req.body.userInfo.openid;
									delete req.body.userInfo._id;
									delete req.body.userInfo.articlelist;
									delete req.body.userInfo.attent;
									res.send(req.body.userInfo);
								}
							});
						})
					} else {
						user = user[0];
						user.name = req.body.userInfo.name;
						user.sex = req.body.userInfo.sex;
						user.image = req.body.userInfo.image;
						user.city = req.body.userInfo.city;
						users.updateOne({
							"openid": openid
						}, {
							$set: user
						}, function(err2, data) {
							if(!err2) {
								console.log("用户更新成功");
								delete user.openid;
								delete user._id;
								delete user.articlelist;
								delete user.attent;
								res.send(user);
							} else {
								console.log(err2)
							}
						});
					}
				});
			})
		})
	});

	//获取指定uid的user信息
	app.post("/getuser", function(req, res) {
		/*
		 *req.body = {
		 * 	uid:1, 自己id
		 *  useid:1, 查找的id
		 * }
		 * */
		var userinfo = {},
			articledate = null,
			articleheart = null,
			articlenoshow = null,
			userattent = null,
			isattent = null;
		//获取人物信息
		users.find({
			"uid": req.body.useid
		}).toArray(function(err, user) {
			user = user[0];
			userinfo = user;
			getlist({
				"articleid": {
					$in: user.articlelist
				}
			}, "date", false, function(list) {
				articledate = list;
			});
			getlist({
				"articleid": {
					$in: user.articlelist
				}
			}, "heart", false, function(list) {
				articleheart = list;
			});
			if(req.body.uid == req.body.useid) {
				getlist({"isshow":0,"articleid": {$in: user.articlelist}}, "date", true, function(list) {
					articlenoshow = list;
				});
				users.find({
					"uid": {
						$in: user.attent
					}
				}).toArray(function(err1, data) {
					if(!err1) {
						userattent1 = [];
						for(let i = 0; i < data.length; i++) {
							userattent1.push({
								"uid": data[i].uid,
								"name": data[i].name,
								"city": data[i].city,
								"sex": data[i].sex,
								"image": data[i].image
							})
						}
						userattent = userattent1;
					} else {
						console.log(err1)
					}
				})
			} else {
				userattent = [];
				articlenoshow = [];
			}
		})

		var isattentlook = false;
		if(req.body.uid == req.body.useid) {
			isattent = true;
			isattentlook = true;
		} else {
			users.find({
				"uid": req.body.uid
			}).toArray(function(err, user) {
				for(let i = 0; i < user[0].attent.length; i++) {
					if(user[0].attent[i] == useid) {
						isattent = true;
						break;
					}
				}
				isattentlook = true
			})
		}

		var t = setInterval(function() {
			if(isattentlook && articledate && articleheart && userattent && articlenoshow) {
				clearInterval(t);
				delete userinfo.openid;
				delete userinfo._id;
				delete userinfo.articlelist;
				delete userinfo.attent;
				userinfo.isattent = isattent;
				var dataObj = {
					userinfo: userinfo,
					articledate: articledate,
					articleheart: articleheart,
					articlenoshow: articlenoshow,
					userattent: userattent
				}
				res.send(dataObj)
			}
		}, 100)

	})

	//更改用户introduce
	app.post("/setintroduce", function(req, res) {
		users.update({
			"uid": req.body.uid
		}, {
			$set: {
				"introduce": req.body.introduce
			}
		}, function(err, data) {
			if(!err) {
				console.log("用户修改成功");
				res.send("ok");
			} else {
				console.log(err)
			}
		});
	});

	//关注/取消关注 用户
	app.post("/loveuser", function(req, res) {
		/*
		 	req.body = {
		 		uid:1,
		 		useid:2,
		 		love:true
		 	}
		 * */
		var setData = {
			$pull: {
				"attent": req.body.useid
			}
		}
		if(req.body.love) {
			setData = {
				$push: {
					"attent": req.body.useid
				}
			}
		}
		users.update({
			"uid": req.body.uid
		}, setData, function(err, data) {
			if(!err) {
				res.send("ok");
			} else {
				console.log(err)
			}
		});
	});

	//举报用户
	app.post("/reportuser", function(req, res) {
		/*
		 req.body = {
		 	uid:1, //举报的人
		 	useid:1,//被举报的人
		 	text:""
		 }
		 * */
		report.find({}).toArray(function(err,datas){
			if(!err){
				req.body.id = datas.length-0+1;
				report.insertOne(req.body, function(err1, data) {
					if(!err1) {
						res.send("ok");
					} else {
						console.log(err1)
					}
				});
			}else{
				console.log(err)
			}
		})
	})

	//保存文章
	app.post("/postarticle", function(req, res) {
		var articleObj = req.body;
		if(req.body.articleid){
			article.remove({"articleid":Number(req.body.articleid)},function(err,result){
            	if(!err){
					postarticle(req.body.articleid);
            	}else{
            		console.log(err);
            	}
            });
		}else{
			article.find().toArray(function(err, articlelists) {
				var id = articlelists.length - 0 + 1;
				postarticle(id);
			})
		}
		function postarticle(articleid){
			articleObj.articleid = articleid
			articleObj.attent = [];
			articleObj.str = "";
			users.find({
				"uid": articleObj.user.uid
			}).toArray(function(err1, user) {
				articlelist = user[0].articlelist;
				articlelist.push(articleObj.articleid);
				users.updateOne({
					"uid": articleObj.user.uid
				}, {
					$set: {
						"articlelist": articlelist
					}
				}, function(err, data) {
					if(!err1) {
						article.insertOne(articleObj, function(err2, data) {
							if(!err2) {
								res.send("ok");
							} else {
								console.log(err2)
							}
						})
					} else {
						console.log(err1)
					}
				})
			})
		}
	})

	//读取文章列表
	app.post("/getarticlelist", function(req, res) {
		getlist({}, "date", false, function(artilcelist) {
			res.send(artilcelist);
		});
	})

	//读取未审核文章列表
	app.post("/getarticlelistisshow", function(req, res) {
		getlist({"str":"","istrue":true}, "date", true, function(list) {
			res.send(list);
		});
	})

	//按专题查找文章
	app.post("/getarticlelistlabel", function(req, res) {
		getlist({
			"label": req.body.label
		}, "date", false, function(artilcelist) {
			res.send(artilcelist);
		});
	})

	//获取文章详情
	app.post("/articleinfo", function(req, res) {
		article.find({
			"articleid": Number(req.body.id)
		}).toArray(function(err, articles) {
			articles = articles[0];
			var date = new Date(articles.date);
			var y = date.getFullYear(),
				m = date.getMonth() - 0 + 1,
				d = date.getDate();
			articles.date = y + "-" + m + "-" + d;
			articles.love = false;
			var heart = articles.attent.length;
			for(let i = 0; i < heart; i++) {
				if(articles.attent[i] == req.body.uid) {
					articles.love = true;
					break;
				}
			}
			articles.heart = heart;
			res.send(articles);
		})
	})

	//读取文章评论
	app.post("/getarticlecomment", function(req, res) {
		/*
		 *req.body = {
		 *	articleid:1,
		 *  uid:1
		 *}
		 * */
		discuss.find({
			"articleid": Number(req.body.articleid)
		}).toArray(function(err, datas) {
			if(!err) {
				var info = [];
				var fornum = 0;
				//for(let i=0;i<datas.length;i++){
				function getdata() {
					var data = datas[fornum];
					var date = new Date(data.date),
						y = date.getFullYear(),
						m = date.getMonth() - 0 + 1,
						d = date.getDate(),
						discussdate = y + "/" + m + "/" + d;

					users.find({
						"uid": data.uid
					}).toArray(function(err1, user) {
						var isgood = isrubbish = false;
						for(let i = 0; i < data.good.length; i++) {
							if(data.good[i] == req.body.uid) {
								isgood = true;
								break;
							}
						}
						for(let i = 0; i < data.rubbish.length; i++) {
							if(data.rubbish[i] == req.body.uid) {
								isrubbish = true;
								break;
							}
						}
						info.push({
							uid: data.uid,
							discussid: data.id,
							name: user[0].name,
							image: user[0].image,
							date: discussdate,
							str: data.str,
							good: data.good.length,
							rubbish: data.rubbish.length,
							isrubbish: isrubbish,
							isgood: isgood
						})
						fornum += 1;
						if(fornum >= datas.length) {
							res.send(info);
						} else {
							getdata();
						}
					})
				}
				if(datas.length != 0) {
					getdata();
				}
			} else {
				console.log(err)
			}
		})
	})

	//赞赏/取消赞赏 文章
	app.post("/heartarticle", function(req, res) {
		/*
		 req.body = {
		 	uid:1,
		 	articleid:1,
		 	love:true
		 }
		 * */
		console.log(req.body)
		var attent = {
			$pull: {
				"attent": req.body.uid
			}
		}
		if(req.body.love) {
			attent = {
				$push: {
					"attent": req.body.uid
				}
			}
		}
		article.update({
			"articleid": req.body.articleid
		}, attent, function(err, data) {
			if(!err) {
				res.send("ok")
			} else {
				console.log(err)
			}
		})
	});

	//评论文章
	app.post("/commentarticle", function(req, res) {
		/*
		 *req.body = {
		 *	articleid:1,
		 *  uid:1,
		 *  str:"asd",
		 * date:date
		 *}
		 * */
		var info = req.body;
		var date = new Date(info.date),
			y = date.getFullYear(),
			m = date.getMonth() - 0 + 1,
			d = date.getDate();
		discussdate = y + "/" + m + "/" + d;
		users.find({}).toArray(function(err, user) {
			if(!err) {
				discuss.find({}).toArray(function(err1, discusss) {
					if(!err1) {
						info.id = discusss.length - 0 + 1;
						info.good = [];
						info.rubbish = [];
						discuss.insertOne(info, function(err2, data) {
							if(!err2) {
								info.image = user[0].image;
								info.name = user[0].name;
								info.date = discussdate;
								info.good = 0;
								info.rubbish = 0;
								res.send(info)
							} else {
								console.log(err2)
							}
						})
					} else {
						console.log(err1)
					}
				})
			} else {
				console.log(err);
			}
		})
	})

	//给评论好评 / 取消好评
	app.post("/discussgood", function(req, res) {
		/*
		req.body = {
		  uid:1,
		  id:1,
		  isgood:true
		}
		 */
		console.log(req.body)
		var set = {
			$pull: {
				"good": req.body.uid
			}
		};
		if(req.body.isgood) {
			set = {
				$push: {
					"good": req.body.uid
				}
			}
		}
		console.log(set)
		discuss.update({
			"id": Number(req.body.id)
		}, set, function(err, data) {
			if(!err) {
				res.send("ok");
			} else {
				console.log(err);
			}
		})
	})

	//给评论差评 / 取消差评
	app.post("/discussrubbish", function(req, res) {
		/*
		req.body = {
		  uid:1,
		  id:1,
		  isrubbish:true
		}
		 */
		var set = {
			$pull: {
				"rubbish": req.body.uid
			}
		};
		if(req.body.isrubbish) {
			set = {
				$push: {
					"rubbish": req.body.uid
				}
			}
		}
		discuss.update({
			"id": Number(req.body.id)
		}, set, function(err, data) {
			if(!err) {
				res.send("ok");
			} else {
				console.log(err);
			}
		})
	})

	//文章通过审核
	app.post("/passarticle", function(req, res) {
		article.update({
			"articleid": req.body.id
		}, {
			$set: {
				"isshow": 1
			}
		}, function(err, data) {
			if(!err) {
				res.send("ok");
			} else {
				console.log(err)
			}
		});
	})

	//拒绝文章
	app.post("/nopassarticle", function(req, res) {
		article.update({
			"articleid": req.body.articleid
		}, {
			$set: {
				"str": req.body.text
			}
		}, function(err, data) {
			if(!err) {
				res.send("ok");
			} else {
				console.log(err)
			}
		});
	})
	
	//删除文章
	app.post("/cleararticle",function(req,res){
		article.remove({"articleid":Number(req.body.articleid)},function(err,data){
			if(!err){
				res.send("ok")
			}else{
				console.log(err)
			}
		})
	})

	//上传图片
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			cb(null, './public/image');
		},
		filename: function(req, file, cb) {
			var fileFormat = (file.originalname).split(".");
			cb(null, Date.now() + "." + fileFormat[fileFormat.length - 1]);
		}
	})
	var upload = multer({
		storage: storage
	});
	app.post('/upload/image', upload.single('image'), function(req, res) {
		res.send("http://140.143.62.48/image/" + req.file.filename);
	})

	function getlist(getObj, sort, isshow, success) {
		var mysort = {};
		if(sort == "date") {
			mysort = {
				"date": -1
			}
		} else if(sort == "heart") {
			mysort = {
				"heart": 1
			}
		}
		if(isshow) {
			getObj.isshow = 0;
		} else {
			getObj.isshow = 1;
		}
		console.log(getObj)
		article.find(getObj).sort(mysort).toArray(function(err, articlelist) {
			var articles = [];
			for(let i = 0; i < articlelist.length; i++) {
				details = null;
				image = null;
				for(let j = 0; j < articlelist[i].article.length; j++) {
					if(articlelist[i].article[j].type == "image" && !image) {
						image = articlelist[i].article[j].src;
					}
					if(articlelist[i].article[j].type == "text" && !details) {
						details = articlelist[i].article[j].text;
					}
					if(details && image) {
						break;
					}
				}
				if(!details) {
					details = "此文章没有文字内容"
				}
				if(!image) {
					image = URL + "icon/logo.png";
				}
				var date = new Date(articlelist[i].date);
				var y = date.getFullYear(),
					m = date.getMonth() - 0 + 1,
					d = date.getDate();
				date = y + "/" + m + "/" + d;

				articles.push({
					id: articlelist[i].articleid,
					date: date,
					title: articlelist[i].title,
					name: articlelist[i].user.name,
					praise: articlelist[i].attent.length,
					details: details,
					image: image,
					str:articlelist[i].str,
					istrue:articlelist[i].istrue
				})
			}
			success(articles);
		})
	}
}

var options = {
	key:fs.readFileSync('./2_ccskill.club.key'),
	cert:fs.readFileSync('./1_ccskill.club_bundle.crt')
};
 
var httpsServer = https.createServer(options, app).listen(80,function(){
	console.log("80端口已启动！")
});
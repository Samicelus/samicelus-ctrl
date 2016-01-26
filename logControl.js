var fs = require('fs');
var querystring = require('querystring');
var post = require('./post');

//记录日志	
function logCtrl(sendLog,appid,ip,port,log){
	//本地记录
	logFile(log,function(err){
		if(err){
			console.log(err);
			}
		});		
	//网络记录
	if(sendLog == 1){
		var jsonData = {command:"logCtrl",log:log,appid:appid};
		var postData = querystring.stringify({'data':JSON.stringify(jsonData)});
		post.sendPostDataCallback(ip,port,postData,function(receivedData){
			console.log(receivedData);
			});		
		}
	}
	
//本地日志	
function logFile(log,callback){
	console.log("记录本地消息:"+log);
	var d = new Date();
	//获取YYYYMMDD样式年月日作为文件夹路径
	var date = treatStr(d.getFullYear().toString(),4)+treatStr((d.getMonth()+1).toString(),2)+treatStr(d.getDate().toString(),2);
	//获取HH作为log文件名
	var hour = treatStr(d.getHours().toString(),2);
	var path = 'log/'+date+'/';
	var fileName = hour+'.log';
	var content = log+'\t'+getTime()+'\r\n';
	fs.access(path,function(err){
		if(err){
			fs.mkdir(path,function(err){
				if(err){
					callback(err);
					}else{
						fs.appendFile(path+fileName,content,function(err){
							if(err){
								callback(err);
								}else{
									callback(err);
									}
							});
						}
				});
			}else{
				fs.appendFile(path+fileName,content,function(err){
					if(err){
						callback(err);
						}else{
							callback(err);
							}
					});
				}
		});
	}

//补位函数	
function treatStr(str,n){
	if(str.length < Number(n)){
		return treatStr('0'+str,n);
		}else{
			return str;
			}
	}
	
//获取当前时间
function getTime(){
	var d = new Date();
	var str = d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日 "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
	return str;
	}
	
exports.logCtrl = logCtrl;

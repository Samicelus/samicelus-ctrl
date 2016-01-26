var fs = require('fs');
var net = require('net');
var stateControl = require("./stateControl");

var crypto = require('crypto');
var password = "ABCDEF";

var machineList = new Array();

var powerOnCommand = [0x25,0x31,0x50,0x4f,0x57,0x52,0x20,0x31,0x0d];
var powerOffCommand = [0x25,0x31,0x50,0x4f,0x57,0x52,0x20,0x30,0x0d];

function connectServer(ip,port,commandArr,machine,state,callback){
	var retured = 0;
	//这里connect函数返回一个socket对象，所以这之后的client为socket对象
	client = net.connect({host:ip,port:port},function() {
		console.log('connected to server!');
	});
	client.setKeepAlive(true,1000);
	client.on('data', function(data){
		var recievedMsg = data.toString();
		console.log('recieved msg:'+recievedMsg);
		
		if(recievedMsg.slice(0,6) == 'PJLINK'){
			console.log("receive PJLINK msg, authentication indicator is ["+recievedMsg.slice(7,8)+"]");
			if(recievedMsg.slice(7,8) == '1'){
				var randomNum = recievedMsg.slice(9,-1);
				console.log("random number is ["+randomNum+"]");
				var str1 = randomNum + password;
				console.log("str1 :["+str1+"]");
				//使用md5 算法算出str3
				var md5sum = crypto.createHash('md5');
				md5sum.update(str1);
				var digest = md5sum.digest('hex');
				console.log(digest);
				//连接digest和command
				var send = digest;
				for (var i in commandArr){
					send += String.fromCharCode(commandArr[i]);
					}
				console.log(send);
				var commandBuffer = new Buffer(send,'utf-8');	
				client.write(commandBuffer,function(){
					client.end();
					});
				}
			}
			
			if(recievedMsg.slice(0,6)=="%1POWR"){
				var info = recievedMsg.slice(7,-1);
				console.log("receive power command execution info:["+info+"]");
				if(info == "OK"){
					returned = 1;
					var ret = "成功执行,改变投影机"+machine+"的状态为"+state;
					callback(ret)
					console.log(ret);
					stateControl.changeState("machine",machine,state);
					}
				if(info == "ERR1"){
					returned = 1;
					var ret = "执行对投影机"+machine+"的"+state+"指令时出错,错误的指令";
					callback(ret)
					console.log(ret);
					}
				if(info == "ERR2"){
					returned = 1;
					var ret = "执行对投影机"+machine+"的"+state+"指令时出错,错误的参数";
					callback(ret)
					console.log(ret);
					}
				if(info == "ERR3"){
					returned = 1;
					var ret = "执行对投影机"+machine+"的"+state+"指令时出错,另一个指令正在执行中,请稍候";
					callback(ret)
					console.log(ret);
					}
				if(info == "ERR4"){
					returned = 1;
					var ret = "执行对投影机"+machine+"的"+state+"指令时出错,投影机设置或显示失败";
					callback(ret)
					console.log(ret);
					}
				}
				
		});
					
	client.on('end', function() {
		console.log('disconnected from server');
	});	
	
	//判断代码执行5秒后是否有执行结果
	setTimeout(function(){
		if(returned != 1){
			var ret = "操作执行是遇到未知错误或操作执行延迟超过5秒";
			callback(ret)
			}
		},50000);
}


//开机
function powerOn(machine,response){

	readMachineList(machineList);
	console.log("尝试打开投影机"+machine);
	if(typeof(machineList[machine])!="undefined"){
		var ip = machineList[machine].serverIp;
		var port = 4352;
		connectServer(ip,port,powerOnCommand,machine,"on",function(ret){
			retHttp(response,"success",ret,"0");	
			});
		}else{
			retHttp(response,"error","该机器:"+machine+"不存在",'0');
			}
	}
	
//关机
function powerOff(machine,response){
	readMachineList(machineList);
	console.log("尝试关闭投影机"+machine);
	if(typeof(machineList[machine])!="undefined"){
		var ip = machineList[machine].serverIp;
		var port = 4352;
		connectServer(ip,port,powerOffCommand,machine,"off",function(ret){
			retHttp(response,ret,"0");
			});
		}else{
			retHttp(response,"error","该机器:"+machine+"不存在",'0');
			}
	}

	
//返回http的response
function writeResponse(response,content){
	response.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache, no-store, must-revalidate","Pragma":"no-cache","Expires":"0"});
	response.write(content);
	response.end();
	}	
//回复http消息
function retHttp(response,result,msg,data){
	console.log(msg);
	var ret = JSON.stringify({result:result,msg:msg,data:data});
	writeResponse(response,ret);	
	}

//读取机器列表
function readMachineList(machineList){
	fs.readFile('./state.json',function(err,data){
		if(err) throw err;
		try{
			var obj = JSON.parse(data);
			}catch(e){
				console.log(e);
				}
		if(typeof(obj)!="undefined"){
			for(var i in obj.machine){
				machineList[obj.machine[i].name] =  obj.machine[i];
				}
			}else{
				console.log("机器列表读取失败");
				}
		console.log(machineList);
	});	
}

	
exports.powerOn = powerOn;
exports.powerOff = powerOff;

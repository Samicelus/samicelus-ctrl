var wol = require('wake_on_lan');
var fs = require('fs');
var querystring = require('querystring');
var post = require('./post');

var machineList = new Array();

//远程唤醒
function wakeup(machine,response){
	readMachineList(machineList);
	console.log("尝试唤醒机器:"+machine);
	if(typeof(machineList[machine])!="undefined"){
		var mac = machineList[machine].mac;
		wol.wake(mac);
		wol.wake(mac,function(error){
			if (error){
				//handle error
				console.log(error);
				retHttp(response,"error","发送唤醒数据包失败",error);
				}else{
					console.log("done sending packets");
					retHttp(response,"success","成功向:"+machine+"发送唤醒数据包","0");
					//done sending packets
					}
			});		
		var magic_packet = wol.createMagicPacket(mac);		
		}else{
			retHttp(response,"error","该机器:"+machine+"不存在",'0');
			}
	}
//远程关机
function shutdown(machine,response){
	readMachineList(machineList);
	console.log("尝试关闭机器:"+machine);
	if(typeof(machineList[machine])!="undefined"){
		var shutdownConfig = machineList[machine];
		var ip = shutdownConfig.serverIp;
		var port = shutdownConfig.serverPort;
		var jsonData = {command:"shutdown"};
		var postData = querystring.stringify({'data':JSON.stringify(jsonData)});
		console.log("关闭机器配置"+JSON.stringify(shutdownConfig));
		retHttp(response,"info","已向:"+machine+"发送关机指令",'0');
		post.sendPostDataCallback(ip,port,postData,function(receivedData){
			console.log("machine:"+machine+"已成功关机");
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

//增添机器
function addMachine(machine,type,serverIp,serverPort,mac,response){
	console.log("增加机器"+machine+" 服务ip:"+serverIp+" 服务端口:"+serverPort+" mac地址:"+mac);
	var addedMachine = {name:machine,state:"off",type:type,serverIp:serverIp,serverPort:Number(serverPort),mac:mac};
	var data = fs.readFileSync('./state.json');
	try{
		var obj = JSON.parse(data);
		}catch(e){
			console.log(e);
			}				
	if(typeof(obj)!="undefined"){
		//查看是否有这台机器
		var hasMachine = 0;
		for(var i in obj.machine){
			if(obj.machine[i].name == machine){
				hasMachine = 1;
				//已有该机器，改变机器配置
				obj.machine[i].type = type;
				obj.machine[i].serverIp = serverIp;
				obj.machine[i].serverPort = Number(serverPort);
				obj.machine[i].mac = mac;
				retHttp(response,'success',"已修改机器:"+machine+"信息",'0');
				readMachineList(machineList);
				}
			}
		if(hasMachine == 0){
			//没有此机器，可以添加
			obj.machine.push(addedMachine);
			retHttp(response,'success',"已添加机器:"+machine+"信息",'0');
			readMachineList(machineList);
			}
		hasMachine = 0;
		fs.writeFileSync('./state.json',JSON.stringify(obj));
		}else{
			retHttp(response,'error',"读取state.json数据错误",'0');
			}
	}

//删除机器
function removeMachine(machine,response){
	console.log("删除机器"+machine);
	var data = fs.readFileSync('./state.json');
	try{
		var obj = JSON.parse(data);
		}catch(e){
			console.log(e);
			}				
	if(typeof(obj)!="undefined"){
		//查看是否有这台机器
		var hasMachine = 0;
		for(var i in obj.machine){
			if(obj.machine[i].name == machine){
				hasMachine = 1;
				//已有该机器，删除机器
				obj.machine.splice(i,1);
				retHttp(response,'success',"已删除机器:"+machine,'0');
				readMachineList(machineList);
				}
			}
		if(hasMachine == 0){
			//没有此机器，无法删除
			retHttp(response,'error',"该机器:"+machine+"不存在，无法删除",'0');
			}
		hasMachine = 0;
		fs.writeFileSync('./state.json',JSON.stringify(obj));
		}else{
			retHttp(response,'error',"读取state.json数据错误",'0');
			}
	}	

	
exports.wakeup = wakeup;
exports.shutdown = shutdown;
exports.addMachine = addMachine;
exports.removeMachine = removeMachine;

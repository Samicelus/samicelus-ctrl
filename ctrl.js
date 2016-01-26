var fs=require('fs');
var http = require('http');
var net = require('net');
var wol = require('wake_on_lan');
var http = require('http');
var querystring = require('querystring');
var relayControl = require('./relayControl');
var stateControl = require('./stateControl');
var logControl = require('./logControl');
var projectorControl = require('./projectorControl');
var post = require('./post');
var machineControl = require('./machineControl');
var os = require('os');
//机器列表
var machineList = new Array();

fs.readFile('./config.json',function(err,data){
	if (err) throw err;
	console.log("--------------config data---------------");
	//是否采用外部网络模式
	netMode = JSON.parse(data).netMode;
	console.log("netMode:["+netMode+"]");
	//是否向网络服务器发送实时日志
	sendLog = JSON.parse(data).sendLog;
	console.log("sendLog:["+sendLog+"]");	
	//串口 COM口 及 波特率
	COMPort = JSON.parse(data).COMPort;
	console.log("COMPort:["+COMPort+"]");
	baudrate = JSON.parse(data).baudrate;
	console.log("baudrate:["+baudrate+"]");
	//网络服务器连接
	remoteIp = JSON.parse(data).remoteIp;
	console.log("remoteIp:["+remoteIp+"]");
	remotePort = JSON.parse(data).remotePort;
	console.log("remotePort:["+remotePort+"]");
	//socket连接时限
	var timerLimit = JSON.parse(data).timer;
	console.log("timerLimit:["+timerLimit+"]");
	//服务器http,用于上传日志
	var serverIp = JSON.parse(data).serverIp;
	console.log("serverIp:["+serverIp+"]");
	var serverPort = JSON.parse(data).serverPort;
	console.log("serverPort:["+serverPort+"]");
	//appid
	var appid = JSON.parse(data).appid;
	console.log("appid:["+appid+"]");
	//webService
	var httpPort = JSON.parse(data).httpPort;
	console.log("httpPort:["+httpPort+"]");
	//config信息对象
	var config = JSON.parse(data);
	console.log("----------------------------------------");
	if(netMode == 1){
		console.log("联网模式");
		//设置看门狗喂狗时限
		setSchedule(config);
		//进行socket连接
		ConnectServer(config);		
		}else{
			console.log("离线模式");
			}
	//初始化串口
	relayControl.serialPortInit(config.COMPort,config.baudrate);
	//初始化webService
	httpInit(config);
	//读取机器列表
	readMachineList(config);
	});	
	
function httpInit(config){
	http.createServer(function(request,response){
		request.setEncoding("utf8");
			var postData = "";
			request.addListener("data", function(postDataChunk) {
				postData += postDataChunk;
				console.log("Received POST data chunk '"+ postDataChunk + "'.");
				});
			request.addListener("end", function(){
				//处理postData
				var data = querystring.parse(postData).data;
				if(typeof(data)!= "undefined"){	
				try{
					var obj = JSON.parse(data);
					}catch(e){
						console.log(e);
						}
				if(typeof(obj)!="undefined"){
					var command = obj.command;
					console.log("command:"+command);
					
					//查看系统运行情况
					if(command == "mySys"){
						var resultat = showSys();
						console.log(resultat);
						logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort.sendLog,config.appid,config.serverIp,config.serverPort,resultat);
						retHttp(response,'error',"CPUs running state got",resultat);
						}
					//查看其他机器运行情况
					if(command == "getSys"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							getSys(config,machine,response);
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}
					//唤醒命令
					if(command == "wakeup"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试唤醒机器:"+machine);
							machineControl.wakeup(machine,response);
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}
						
					//接收状态
					if(command == "reportState"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							if(typeof(obj.state)!="undefined"){
								var state = obj.state;
								logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"machine:"+machine+"发来状态报告,state改变为:"+state);
								stateControl.changeState("machine",machine,state);
								retHttp(response,'success',"machine state reported",'0');
								}else{
									retHttp(response,'error',"state is not defined",'0');
									}
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}
						
					//关机命令
					if(command == "shutdown"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试关闭机器:"+machine);
							machineControl.shutdown(machine,response);
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}
						
					//获取设备状态
					if(command == "getState"){
						stateControl.getState(function(state){
							retHttp(response,'success',"state got",state); 	
							});
						}

					//增添/修改机器设备
					if(command == "addMachine"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							if(typeof(obj.type)!="undefined"){
								var type = obj.type;
								if(typeof(obj.serverIp)!="undefined"){
									var serverIp = obj.serverIp;
									if(typeof(obj.serverPort)!="undefined"){
										var serverPort = obj.serverPort;
										if(typeof(obj.mac)!="undefined"){
											var mac = obj.mac;
											logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"在state.json中增添machine:"+machine);
											machineControl.addMachine(machine,type,serverIp,serverPort,mac,response);
											}else{
												retHttp(response,'error',"mac is not defined",'0');
												}
										}else{
											retHttp(response,'error',"serverPort is not defined",'0');
											}
									}else{
										retHttp(response,'error',"serverIp is not defined",'0');
										}
									}else{
									retHttp(response,'error',"type is not defined",'0');
									}
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}

					//删除机器设备
					if(command == "removeMachine"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"从state.json中删除machine:"+machine);
							machineControl.removeMachine(machine,response);
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}

					//增添继电器板
					if(command == "addBoard"){
						if(typeof(obj.board)!="undefined"){
							var board = obj.board;
							logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"在state.json中增添继电器板board:"+board);
							relayControl.addBoard(board,response);
							}else{
								retHttp(response,'error',"board is not defined",'0');
								}
						}

					//删除继电器板
					if(command == "removeBoard"){
						if(typeof(obj.board)!="undefined"){
							var board = obj.board;
							logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"从state.json中删除继电器板board:"+board);
							relayControl.removeBoard(board,response);
							}else{
								retHttp(response,'error',"board is not defined",'0');
								}
						}						
						
					//修改继电器标识
					if(command == "giveRelaySign"){
						if(typeof(obj.name)!="undefined"){
							var name = obj.name;
							if(typeof(obj.sign)!="undefined"){
								var sign = obj.sign;
								logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"在state.json中修改继电器name:"+name+"的标识sign为:"+sign);
								relayControl.giveRelayName(name,sign,response);
								}else{
									retHttp(response,'error',"sign is not defined",'0');
									}
							}else{
								retHttp(response,'error',"name is not defined",'0');
								}
						}
						
					//开关继电器命令
					if(command == "relay"){	
						if(typeof(obj.board)!="undefined"){
							var board = Number(obj.board);
							if(typeof(obj.relay)!="undefined"){
								var relay = Number(obj.relay);							
								if(typeof(obj.onoff)!="undefined"){
									var onoff = Number(obj.onoff);
									logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试操作继电器板board:"+board+" relay:"+relay+" onoff");
									relayControl.sendControlCommand(board,relay,onoff,function(ret){
										writeResponse(response,JSON.stringify(ret));
										});
									}else{
										retHttp(response,'error',"onoff is not defined",'0');
										}								
								}else{
									retHttp(response,'error',"relay is not defined",'0');
									}
							}else{
								retHttp(response,'error',"board is not defined",'0');
								}
						}
						
					//AS控制命令
					if(command == "asControl"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							if(typeof(obj.asCode)!="undefined"){
								var asCode = obj.asCode;
								var target = obj.target;
								asControl(config,machine,asCode,target,response);
								}else{
									retHttp(response,'error',"asCode is not defined",'0');
									}							
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}						

					//投影机控制
					if(command == "projectorControl"){
						if(typeof(obj.machine)!="undefined"){
							var machine = obj.machine;
							if(typeof(obj.onOff)!="undefined"){
								var onOff = obj.onOff;
								if(onOff == "1"){
									logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试开启投影机:"+machine);
									projectorControl.powerOn(machine,response);
									}
								if(onOff == "0"){
									logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试关闭投影机:"+machine);
									projectorControl.powerOff(machine,response);
									}										
									
								}else{
									retHttp(response,'error',"onoff is not defined",'0');
									}							
							}else{
								retHttp(response,'error',"machine is not defined",'0');
								}
						}	

						
					}
				}
			});
	}).listen(config.httpPort);
	console.log("webService start on "+config.httpPort);	
	}
	
		
//获取远程机器os信息
function getSys(config,machine,response){
	logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"获取机器:"+machine+"的运行状态");
	var machineState = JSON.parse(fs.readFileSync('./state.json')).machine;
	var currentState = "";
	for(var i in machineState){
		if(machineState[i].name == machine){
			currentState = machineState[i].state;
			}
		}
	if(currentState == "off"){
		retHttp(response,"error","机器:"+machine+"处于关机状态",'0');
		}else{
			if(typeof(machineList[machine])!= "undefined"){
				var getSysConfig = machineList[machine];
				var ip = getSysConfig.serverIp;
				var port = getSysConfig.serverPort;
				var jsonData = {command:"getSys"};
				var postData = querystring.stringify({'data':JSON.stringify(jsonData)});
				post.sendPostDataCallback(ip,port,postData,function(receivedData){
					logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"机器:"+machine+"的运行状态为\r\n"+receivedData);
					retHttp(response,"success","成功获取机器:"+machine+"的运行状态",receivedData);
					});			
				}else{
					retHttp(response,"error","该机器:"+machine+"不存在",'0');
					}
			}
	}

//设置看门狗喂狗时限
function setSchedule(config){
	//定时任务，需要安装 node-schedule包
	var schedule = require("node-schedule");
	var rule = new schedule.RecurrenceRule();
	var times = [];
	for(var i=1; i<60; i++){
		times.push(i);
		}
	rule.second = times;
	var Timer = 0;
	var j = schedule.scheduleJob(rule, function(){
			Timer++;
			//console.log("Current timer: "+Timer);
			if (Timer>config.timerLimit){
				Timer = 0;
				logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"长时间未收到socketManager服务器看门狗喂狗消息,重联");
				ConnectServer(config);
				}			
		});	
	}
	
//socket数据包解包，防止粘包	
function treatPackage(config,client,data){
	if(typeof(data)!="undefined"){		
		var dataStr = data.toString();		
		try{
			var dataLen = Number(dataStr.slice(0,10));
			}catch(e){
				console.log(e);
				}				
		if (typeof(dataLen)!="undefined"){
			console.log("dataLen : "+dataLen);
			var packagedata = dataStr.slice(11,11+dataLen);	
			//处理解包后内容
			console.log("process data with appid: "+config.appid);
			processData(config,client,packagedata);
			if(dataStr.length > dataLen+12){
				logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"粘包,回滚处理");
				treatPackage(config,client,dataStr.slice(dataLen+12));	
				}		
			}	
		}else{
			logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"收到不明消息包,放弃处理");
			console.log("data undefined");
			}
	}	
// 服务器重连，Socket通信
function ConnectServer(config){
	//这里connect函数返回一个socket对象，所以这之后的client为socket对象
	client = net.connect({host:config.remoteIp,port: config.remotePort},function() {
		console.log('connected to server!');
		});
	logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"尝试连接socketManager服务器ip:"+config.remoteIp+" port:"+config.remotePort);
	client.setKeepAlive(true,1000);
	client.on('data', function(data){
		console.log("treatPackage with appid: "+config.appid);
		treatPackage(config,client,data);
		});					
	client.on('end', function() {
		console.log('disconnected from server');
		});		
	}	
function resetTimer(){
	Timer = 0;
	console.log("Timer reseted");
	}
	
function processData(config,client,data){
	console.log("Data received:["+data.toString()+"]");	
	try{
		var obj = JSON.parse(data);
		}catch(e){
			console.log(e);
			}	
	if (typeof(obj)!="undefined"){	
		var command = obj.command;
		if(command == "ID"){
			console.log("sending appid: "+config.appid);
			logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"向socketManager上报appid:"+config.appid);
			client.write(JSON.stringify({command:"ID",appid:config.appid})); 
			}
		if(command == "connectionOK"){
			logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"收到socketManager发来看门狗消息,连接正常");
			resetTimer();
			}				
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
	
//返回当前CPU信息
function showSys(){
	//CPU情况
	var ret = "";
	for (var i in os.cpus()){
		var allTimes = 0;
		for(var j in os.cpus()[i].times){
			allTimes += os.cpus()[i].times[j];
			}
		var sysRate = 100*os.cpus()[i].times.sys/allTimes;
		var userRate = 100*os.cpus()[i].times.user/allTimes;
		var idleRate = 100*os.cpus()[i].times.idle/allTimes;
		ret += "CPU核 "+i+"("+os.cpus()[i].model+"):\r\n\t频率="+os.cpus()[i].speed+"MHz\r\n\t系统占用率:"+sysRate+"%\r\n\t应用程序占用率:"+userRate+"%\r\n\t空闲比:"+idleRate+"%\r\n"
		}
	//内存情况
	ret += "剩余内存:"+os.freemem()/(1024*1024)+"MB"
	return ret;
	}



//读取机器列表
function readMachineList(config){
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
				logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"机器列表读取失败")
				}
		console.log(machineList);
	});	
}

//AS控制指令	
function asControl(config,machine,asCode,target,response){
	logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"向机器:"+machine+"的AS程序发送指令:"+asCode);
	var machineState = JSON.parse(fs.readFileSync('./state.json')).machine;
	var currentState = "";
	for(var i in machineState){
		if(machineState[i].name == machine){
			currentState = machineState[i].state;
			}
		}
	if(currentState == "off"){
		retHttp(response,"error","机器:"+machine+"处于关机状态",'0');
		}else{
			if(typeof(machineList[machine])!= "undefined"){
				var asCodeConfig = machineList[machine];
				var ip = asCodeConfig.serverIp;
				var port = asCodeConfig.serverPort;
				var jsonData = {command:asCode,target:target};
				var postData = querystring.stringify({'data':JSON.stringify(jsonData)});
				post.sendPostDataCallback(ip,port,postData,function(receivedData){
					logControl.logCtrl(config.sendLog,config.appid,config.serverIp,config.serverPort,"机器:"+machine+"的asCode操作结果是"+receivedData);
					retHttp(response,"success","成功获取机器:"+machine+"的AS程序操作结果",receivedData);
					});
				}else{
					retHttp(response,"error","该机器:"+machine+"不存在",'0');
					}
			}
	}	

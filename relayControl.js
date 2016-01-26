var SerialPort = require("serialport").SerialPort;
var stateControl = require("./stateControl");
var fs = require('fs');

function serialPortInit(COMPort,baudrate){
	var SerialPort = require("serialport").SerialPort;
	serialPort = new SerialPort(COMPort, {
		baudrate: baudrate
	}, false); // this is the openImmediately flag [default is true]
	console.log("serialport open at ["+COMPort+"] with ["+baudrate+"] baudrate.");
	serialPort.open(function(error){
		if(error){
			console.log('failed to open: '+error);
			}else{
				console.log('open');
				serialPort.on('data', function(data){
					//串口消息
					});
				}
    });
}


function sendControlCommand(board,relay,onoff,callback){
		if((relay > 0)&&(relay < 17)){
			if(onoff == 1){
				stateControl.changeState("relay",treatStr(board.toString(),2)+treatStr(relay.toString(),2),"on");
				}
			if(onoff == 0){	
					stateControl.changeState("relay",treatStr(board.toString(),2)+treatStr(relay.toString(),2),"off");
					}
			}
		if(relay > 16){
			if(((relay - 16)%16 == 1)||(relay == 242)){
				if(relay == 242){
					var relayNum = 16;
					}else{
						var relayNum = (relay - 1)/16;
						}
				stateControl.changeState("relay",treatStr(board.toString(),2)+treatStr(relayNum.toString(),2),"off");
				}
			}
		if((relay == 26)&&(onoff == 1)){
			for(var i=1;i<17;i++){
				stateControl.changeState("relay",treatStr(board.toString(),2)+treatStr(i.toString(),2),"on");
				}
			}
		if((relay == 28)&&(onoff == 1)){
			for(var i=1;i<17;i++){
				stateControl.changeState("relay",treatStr(board.toString(),2)+treatStr(i.toString(),2),"off");
				}
			}
		//code的转化...
		var code = [170,187,board,relay,onoff,(101+board+relay+onoff)%256];						
		sendSerialcode(code,function(ret){
			callback(ret);
			});	
	}
	
//发送串口消息
function sendSerialcode(code,callback){
	var buf = new Buffer(code, 'uft8');
	serialPort.write(buf, function(err, results) {
		if(err){
			console.log('err ' + err);
			var ret = {result:"error",msg:"向串口写入消息时出错",data:"0"};
			callback(ret);
			}else{
				console.log('results ' + results);
				var ret = {result:"success",msg:"成功向串口写入消息",data:results};
				callback(ret);
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
	

//命名继电器
function giveRelayName(name,sign,response){
	console.log("修改继电器"+name+"的标识为:"+sign);
	var data = fs.readFileSync('./state.json');
	try{
		var obj = JSON.parse(data);
		}catch(e){
			console.log(e);
			}
	if(typeof(obj)!="undefined"){
		//查看是否有这个继电器
		var hasRelay = 0;
		for(var i in obj.relay){
			if(obj.relay[i].name == name){
				hasRelay = 1;
				//已有该继电器，改变标识
				obj.relay[i].sign = sign;
				retHttp(response,'success',"已修改继电器:"+name+"的标识为"+sign,'0');
				}
			}
		if(hasRelay == 0){
			//没有此继电器，无法修改
			retHttp(response,'error',"没有此继电器"+name+"，无法修改",'0');
			}
		hasRelay = 0;
		fs.writeFileSync('./state.json',JSON.stringify(obj));
		}else{
			retHttp(response,'error',"读取state.json数据错误",'0');
			}	
}	
	

//增添继电器板
function addBoard(board,response){
	if((board>0)&&(board<100)){
		console.log("增添继电器板"+board);
		var boardname = treatStr(board,2);
		var data = fs.readFileSync('./state.json');
		try{
			var obj = JSON.parse(data);
			}catch(e){
				console.log(e);
				}
		if(typeof(obj)!="undefined"){
			for(var j=1;j<17;j++){
				var relayName = treatStr(j.toString(),2);
				var wholeName = boardname + relayName;
				var newRelay = {name:wholeName,state:"off"};
				//查看是否有这个继电器
				var hasRelay = 0;
				for(var i in obj.relay){
					if(obj.relay[i].name == wholeName){
						hasRelay = 1;
						//已有该继电器，不写入
						}
					}
				if(hasRelay == 0){
					//没有此继电器，添加
					obj.relay.push(newRelay);
					}
				hasRelay = 0;
				}
			fs.writeFileSync('./state.json',JSON.stringify(obj));
			retHttp(response,'success',"添加继电器板"+board+"完成",'0');			
			}else{
				retHttp(response,'error',"读取state.json数据错误",'0');
				}
		}else{
			retHttp(response,'error',"board超出取值范围1~99",'0');
			}				
}

//删除继电器板
function removeBoard(board,response){
	if((board>0)&&(board<100)){
		console.log("删除继电器板"+board);
		var boardname = treatStr(board,2);
		var data = fs.readFileSync('./state.json');
		try{
			var obj = JSON.parse(data);
			}catch(e){
				console.log(e);
				}
		if(typeof(obj)!="undefined"){
			for(var i=obj.relay.length;i>0;i--){
				var currentBoard = obj.relay[i-1].name.slice(0,2);
				if(currentBoard == boardname){
					//匹配，删除该继电器
					obj.relay.splice(i-1,1);
					}
				}
			fs.writeFileSync('./state.json',JSON.stringify(obj));
			retHttp(response,'success',"删除继电器板"+board+"完成",'0');			
			}else{
				retHttp(response,'error',"读取state.json数据错误",'0');
				}			
		}else{
			retHttp(response,'error',"board超出取值范围1~99",'0');
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
	
exports.serialPortInit = serialPortInit;
exports.sendControlCommand = sendControlCommand;
exports.giveRelayName = giveRelayName;
exports.addBoard = addBoard;
exports.removeBoard = removeBoard;

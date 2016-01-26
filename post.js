var http = require('http');

//发送post请求，回调模式
function sendPostDataCallback(ip,port,postData,callback){
	var options = {
		hostname: ip,
		port: port,
		path: '',
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded','Content-Length': postData.length}
		};
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		printReq(res);
		var receivedData = "";
		res.on('data',function(chunk){
			receivedData += chunk;
			});
		res.on('end',function(){
			callback(receivedData);
			receivedData = "";
			});
		});
	req.on('error', function(e){
		console.log('problem with request: ' + e.message);
		});
	req.write(postData);
	req.end();	
	}

//打印请求信息
function printReq(req){
	console.log("-------------Incoming message-------------");
	var origin = req.headers.origin;
	console.log("origin:["+origin+"]");
	var method = req.method;
	console.log("method:["+method+"]");	
	var statusCode = req.statusCode;
	console.log("statusCode:["+statusCode+"]");
	var statusMessage = req.statusMessage;
	console.log("statusMessage:["+statusMessage+"]");	
	console.log("------------------------------------------");
	
}	

exports.sendPostDataCallback = sendPostDataCallback;

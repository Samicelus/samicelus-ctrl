var fs = require('fs');

//改变状态	
function changeState(type,name,state){
	console.log("改变"+type+":"+name+"的状态为:"+state);
	var data = fs.readFileSync('./state.json');
	try{
		var obj = JSON.parse(data);
		}catch(e){
			console.log(e);
			}				
	if(typeof(obj)!="undefined"){
		for(var i in obj){
			console.log("比对"+i+"和"+type);
			if(i == type){
				for(var j in obj[i]){
					console.log("比对"+obj[i][j].name+"和"+name);
					if(obj[i][j].name == name){
						console.log("找到:"+j);
						obj[i][j].state = state;
						fs.writeFileSync('./state.json',JSON.stringify(obj));
						}
					}
				}
			}
		}	
	}
	
//读取状态	
function getState(callback){
	fs.readFile('./state.json',function(err,data){
		if (err) throw err;
		try{
			var obj = JSON.parse(data);
			}catch(e){
				console.log(e);
				}
		if(typeof(obj)!="undefined"){
			callback(obj);			
			}
		});
	}
	
	
exports.changeState = changeState;
exports.getState = getState;

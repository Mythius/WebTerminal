var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var system = require('child_process');

var file = {
	save: function(name,text){
		fs.writeFile(name,text,e=>{
			if(e) console.log(e);
		});
	},
	read: function(name,callback){
		fs.readFile(name,(error,buffer)=>{
			if (error) console.log(error);
			else callback(buffer.toString());
		});
	}
}

class client{
	static all = [];
	constructor(socket){
		this.socket = socket;
		this.name = null;
		this.tiles = [];
		client.all.push(this);
		socket.on('disconnect',e=>{
			let index = client.all.indexOf(this);
			if(index != -1){
				client.all.splice(index,1);
			}
		});
	}
	emit(name,dat){
		this.socket.emit(name,dat);
	}
}

const port = 8080;
const path = __dirname+'/';

app.use(express.static(path+'site/'));
app.get(/.*/,function(request,response){
	response.sendFile(path+'site/');
});

async function runCommand(socket,comm,exsp=true){
	let args = [];
	let com = '';
	if(comm.includes(' ')){
		args = comm.split(' ');
		com = args.shift();
	} else {
		com = comm;
	}
	// console.log(com,args);
	let prom = new Promise((res,rej)=>{
		let proc;
		if(exsp){
			proc = system.exec(com,args);
		} else {
			proc = system.spawn(com,args);
		}
		let result = [];
		proc.stdout.on('data',data=>{
			result.unshift(data.toString());
		});
		proc.on('close',e=>{
			if(result == '' && exsp){
				runCommand(socket,comm,false);
			} else {
				if(socket) socket.emit('result',result.join(''));
				res(result);
			}
		});
		proc.on('error',e=>{
			res(e);
			socket.emit('result',e);
		});
		setTimeout(()=>{
			proc.kill('SIGINT');
		},10000);
	});

	return await prom;
}

http.listen(port,()=>{console.log('Serving Port: '+port)});

io.on('connection',socket=>{
	var c = new client(socket);
	socket.on('com',data=>{
		runCommand(socket,data).catch(e=>{
			socket.emit(result,e);
		})
	});
});


// runCommand(null,'dir').then(console.log).catch(console.log);
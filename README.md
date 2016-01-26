# samicelus-ctrl
The lite product serial code generation and client management system by Samicelus and Xcoder

Install
================

You should have Node.js and MongoDB installed on your server.
The current version is tested on Windows Server 2008 R2 Enterprise 64x.
* [mongodb-win32-x86_64-2008plus-3.0.4-signed](http://pan.baidu.com/s/1c07aj7a) -MongoDB for windows 64bit
* [node-v0.10.26-x64](http://pan.baidu.com/s/1i3JbpIl) -node for windows 64bit

[mongoDB's official site](https://www.mongodb.org/) 
[nodejs' official site](https://nodejs.org/en/)
Initialize server
================

Enter the root repository in cmd, enter command line "npm install" to install the necessary requirement.
```bash
   npm install
```
Edit config.json for your mongoPort and httpPort.
```js
   {
   "mongoPort":27037,
   "httpPort":6007
   }
```
Create a folder to store the database, in the command line, enter command line "mongod --port "+ your mongoPort +" --dbpath "+ your database folder path.
```bash
   mongod --port 27037 --dbpath D:\MyDb
```
Once your mongo database is running correctly, you can start productManager.js and socketManager.js by entering the command "node "+file name in the cmd command line.
```bash
   node productManager
   node socketManager
```
Then, the server is settled.


Initialize client
================

Install node.js on the target PC, download and install downloadservice:
* [downloadservice](https://github.com/Samicelus/samicelus-downloadservice) -client download service

config and start the client service...
Here you go.



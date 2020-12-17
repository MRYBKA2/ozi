const fs = require('fs');
const {encryptAES} = require('./cryptoapi');
const {saveOneTime} = require('./onetime');

const usersFile = 'users.json';

const defaultUsers = [
	{
		"user":"ADMIN",
		"password":"",
		"blocked":0,
		"restrictions":0
	}
];


exports.checkUsersFile = () => {
	if(!fs.existsSync(__dirname+'/'+usersFile)) {
		let encryptKey = 'first';
		fs.writeFileSync(__dirname+'/'+usersFile, JSON.stringify(encryptAES(JSON.stringify(defaultUsers), encryptKey)));
		saveOneTime(encryptKey);
		return usersFile;
	} else {
		console.log('im here');
		return usersFile;
	}
}
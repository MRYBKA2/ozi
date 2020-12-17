const fs = require('fs');

exports.saveOneTime = (pass) => {
	const bufftobase64 = Buffer.from(pass).toString('base64');
	const crypt = fs.writeFileSync(__dirname+'/onetimekey', bufftobase64);
}

exports.getOneTime = () => {
	const crypt = fs.readFileSync(__dirname+'/onetimekey');
	const decrypt = Buffer.from(crypt.toString(), 'base64').toString();
	return decrypt;
}
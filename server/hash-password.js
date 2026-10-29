import bcrypt from 'bcryptjs';
import fs from 'node:fs';
// Prefer stdin so the password is not recorded in shell history or process arguments.
const password=process.argv[2] || fs.readFileSync(0,'utf8').replace(/\r?\n$/, '');
if(!password || password.length<12){console.error('Provide a password of at least 12 characters');process.exit(1)}
console.log(bcrypt.hashSync(password,12));

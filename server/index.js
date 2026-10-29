import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import {createApp} from './app.js';
const {app}=createApp();
const dist=path.resolve('dist');
if(fs.existsSync(dist)) { app.use(express.static(dist,{index:false})); app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html'))); }
const port=Number(process.env.PORT||3001); app.listen(port,'0.0.0.0',()=>console.log(`Project server listening on ${port}`));

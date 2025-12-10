// server.js
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors:{ origin:'*' } });

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.static(__dirname)); // sirve beastbet.html

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beastbet');

const UserSchema = new mongoose.Schema({
  email:String, password:String, role:{type:String, default:'pending'}
});
const ResultSchema = new mongoose.Schema({
  date:String, band:String, pick3:String, pick4:String, state:String
}, {timestamps:true});

const User = mongoose.model('User', UserSchema);
const Result = mongoose.model('Result', ResultSchema);

/* AUTH */
function sign(u) { return jwt.sign({id:u._id}, 'secret'); }
app.post('/api/register', async (req,res)=>{
  const {email,password}=req.body;
  if(await User.findOne({email})) return res.status(400).json({error:'Usuario existe'});
  const hash = await bcrypt.hash(password, 10);
  await User.create({email, password:hash});
  res.json({ok:1});
});
app.post('/api/login', async (req,res)=>{
  const {email,password}=req.body;
  const user = await User.findOne({email});
  if(!user || !await bcrypt.compare(password,user.password)) return res.status(401).json({error:'Credenciales inválidas'});
  if(user.role==='pending') return res.status(401).json({error:'Usuario pendiente'});
  res.json({email:user.email, role:user.role, token:sign(user)});
});

/* ADMIN */
app.get('/api/admin/users', async (_,res)=> res.json(await User.find()));
app.post('/api/admin/approve', async (req,res)=>{
  await User.findByIdAndUpdate(req.body.id,{role:'user'});
  res.json({ok:1});
});
app.delete('/api/admin/users/:id', async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({ok:1});
});
app.post('/api/admin/upload', async (req,res)=>{
  const rows = req.body.rows;
  const docs = rows.map(r=>({
    date: r.Fecha, band: r.Franja, pick3: String(r.Pick3).padStart(3,'0'),
    pick4: String(r.Pick4).padStart(4,'0'), state: r.Estado
  }));
  await Result.insertMany(docs);
  io.emit('newAlert');
  res.json({ok:1});
});

/* RESULTS */
app.get('/api/results', async (_,res)=>{
  res.json(await Result.find().sort({createdAt:-1}));
});

/* ALERTS */
function calcP90(arr){ // ceil(percentile 90)
  const sorted = arr.slice().sort((a,b)=>a-b);
  const pos = Math.ceil(0.9 * sorted.length) - 1;
  return sorted[pos] || 0;
}
app.get('/api/alerts', async (_,res)=>{
  const all = await Result.find().sort({createdAt:1});
  const bands = [...new Set(all.map(r=>r.band))];
  const alerts=[];
  for(const b of bands){
    const hist = all.filter(r=>r.band===b);
    const gaps=[];
    let gap=0;
    for(const r of hist){
      const first = r.pick3.slice(-2);
      if(/(\d)\1/.test(first)){ gaps.push(gap); gap=0; } else gap++;
    }
    const p90 = calcP90(gaps);
    if(gap >= p90) alerts.push({band:b, gap, p90, step:1});
  }
  res.json(alerts);
});

/* SOCKET */
io.on('connection', ()=> console.log('Socket connected'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server on', PORT));

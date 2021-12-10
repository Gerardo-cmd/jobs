import fetch from "node-fetch";
import express from 'express';
import cors from 'cors';
import fs from "fs";
import path from 'path';
import md5 from "md5";
import jwt from "jsonwebtoken";
import env from "dotenv";
import admin from 'firebase-admin';
import auth from "./middleware/auth.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = express();

// Load in .ENV file contents
env.config();

// Use express's body parser for post requests
app.use(express.json());

// Activate cors
app.use(cors({
    origin: ['http://localhost:3000', 'https://www.jobs.herokuapp.com'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET, POST', 'DELETE'],
    optionsSuccessStatus: 200
}));

// Firebase starter code
let serviceAccount;
if (fs.existsSync('./secrets/jobs-e3a7e-firebase-adminsdk-z8tfx-b30a64c8f8.json')) {
    serviceAccount = require('./secrets/jobs-e3a7e-firebase-adminsdk-z8tfx-b30a64c8f8.json');
} else {
    serviceAccount = JSON.parse(process.env.JOBS_FIREBASE_KEY);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Endpoints start below

app.get('/', (req, res) => {
  res.send({
    "code": 200,
    "msg": "Connected"
  });
});

app.post("/login", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.send({
      "code": 400,
      "msg": "Need email and password"
    });
  }
  const data = await db.collection('users').doc(`${req.body.email}`).get();
  if (!data.exists) {
    res.send({
      "code": 401,
      "msg": "There is not an account registered with this email!"
    });
    return;
  }
  if (md5(req.body.password) !== data._fieldsProto.password.stringValue) {
    res.send({
      "code": 402,
      "msg": "Incorrect Password"
    });
    return;
  }
  else {
    const token = jwt.sign(req.body.email, process.env.SECRET);
    res.send({
      "code": 200,
      "data": {
        token
      }
    });
    return;
  }
})

app.post('/new-user', async (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.send({
      "code": 400,
      "data": "Must include all necessary info!"
    });
    return;
  }
  const docRefTest = await db.collection('users').doc(`${req.body.email}`).get();
  if (docRefTest.exists) {
    res.send({
      "code": 401,
      "msg": "There is already an accont registered with this email!"
    });
    return;
  }
  const docRef = db.collection('users').doc(`${req.body.email}`);
  const newUser = {
    email: req.body.email,
    password: md5(req.body.password),
    token: jwt.sign(req.body.email, process.env.SECRET)
  }

  const setBody =  docRef.set(newUser);
  res.send({
    "code": 200,
    "data": newUser
  });
  return;
})

// Saves a position to the database
app.post('/new-job', auth, async (req, res) => {
  if (!req.body.company || !req.body.title || !req.body.workEnvironment || !req.body.salary || !req.body.status) {
    res.send({
      "code": 400,
      "data": "Must include all necessary info!"
    });
    return;
  }
  const docRefTest = await db.collection(`${req.email}-positions`).doc(`${req.body.company}-${req.body.title}`).get();
  if (docRefTest.exists) {
    res.send({
      "code": 401,
      "msg": "A position from this company with this title is already saved!"
    });
    return;
  }
  const docRef = db.collection(`${req.email}-positions`).doc(`${req.body.company}-${req.body.title}`);
  const newPosition = {
    title: req.body.title.toString(),
    company: req.body.company.toString(),
    salary: req.body.salary.toString(),
    workEnvironment: req.body.workEnvironment.toString(),
    status: req.body.status.toString()
  }
  const setBody =  docRef.set(newPosition);
  res.send({
    "code": 200,
    "data": {
      position: newPosition
    }
  });
  return;
});

// Returns all saved positions
app.get('/jobs', auth, async (req, res) => {
  const firebaseData = (await db.collection(`${req.email}-positions`).get()).docs;
  let result = [];
  firebaseData.forEach((position) => {
    result.push({
      title: position._fieldsProto.title.stringValue,
      company: position._fieldsProto.company.stringValue,
      salary: position._fieldsProto.salary.stringValue,
      workEnvironment: position._fieldsProto.workEnvironment.stringValue,
      status: position._fieldsProto.status.stringValue,
    });
  })
  if (firebaseData.length > 0) {
    res.send({
      "code": 200,
      "data": result
    });
    return;
  }
  else { //No positions saved in firebase
    res.send({
      "code": 400,
      "msg": "You currently have no positions saved"
    });
    return;
  }
});

// Deletes a position from the database
app.delete('/job', auth, async (req, res) => {
  if (!req.body.company || !req.body.title) {
    res.send({
      "code": 400,
      "msg": "Must include all necessary info!"
    });
    return;
  }
  const docRefTest = await db.collection(`${req.email}-positions`).doc(`${req.body.company}-${req.body.title}`).get();
  if (docRefTest.exists) {
    const result = await db.collection(`${req.email}-positions`).doc(`${req.body.company}-${req.body.title}`).delete();
    res.send({
      "code": 200,
      "msg": "Success"
    });
    return;
  }
  else {
    res.send({
      "code": 400,
      "msg": "The position at the specified company was not found"
    });
    return;
  }
});

app.listen(process.env.PORT || 5000, () => console.log("server starting on port 5000!"));
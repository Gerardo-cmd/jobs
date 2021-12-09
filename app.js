import fetch from "node-fetch";
import express from 'express';
import cors from 'cors';
import fs from "fs";
import path from 'path';
import admin from 'firebase-admin';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = express();

app.use(express.json());

app.use(cors({
    origin: ['http://localhost:3000', 'https://www.jobs.herokuapp.com'],
    allowedHeaders: ['Content-Type'],
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
    "msg": "Welcome Gerardo!"
  });
});

// Saves a position to the database
app.post(('/new-job'), async (req, res) => {
  if (!req.body.company || !req.body.title || !req.body.workEnvironment || !req.body.salary) {
    res.send({
      "code": 400,
      "data": "Must include all necessary info!"
    });
    return;
  }
  const docRefTest = await db.collection("positions").doc(`${req.body.company}-${req.body.title}`).get();
  if (docRefTest.exists) {
    res.send({
      "code": 400,
      "msg": "A position from this company with this title is already saved!"
    });
    return;
  }
  const docRef = db.collection('positions').doc(`${req.body.company}-${req.body.title}`);
  const newPosition = {
    title: req.body.title,
    company: req.body.company,
    salary: req.body.salary,
    workEnvironment: req.body.workEnvironment
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
app.get('/jobs', async (req, res) => {
    const firebaseData = (await db.collection('positions').get()).docs;
    let result = [];
    firebaseData.forEach((position) => {
      result.push({
        title: position._fieldsProto.title.stringValue,
        company: position._fieldsProto.company.stringValue,
        salary: position._fieldsProto.salary.stringValue,
        workEnvironment: position._fieldsProto.workEnvironment.stringValue
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
app.delete('/job', async (req, res) => {
  if (!req.body.company || !req.body.title) {
    res.send({
      "code": 400,
      "msg": "Must include all necessary info!"
    });
    return;
  }
  const docRefTest = await db.collection("positions").doc(`${req.body.company}-${req.body.title}`).get();
  if (docRefTest.exists) {
    const result = await db.collection("positions").doc(`${req.body.company}-${req.body.title}`).delete();
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
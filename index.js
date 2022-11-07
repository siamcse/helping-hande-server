const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.leesidy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message:"Unauthorized access"});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_SECRET_TOKEN, function(err,decoded){
        if(err){
            return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const helpCollection = client.db('helpingHandDb').collection('helpsItem');
        const volunteerList = client.db('helpingHandDb').collection('volunteerList');

        app.post('/jwt', async(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN,{expiresIn:'1h'});
            res.send({token});

        })

        app.get('/helps', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const query = {};
            const cursor = helpCollection.find(query);
            const count = await helpCollection.countDocuments();
            const events = await cursor.skip(page * size).limit(size).toArray();
            res.send({ count, events });
        })

        app.get('/event/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const event = await helpCollection.findOne(query);
            res.send(event);
        })

        app.get('/volunteer',verifyJWT, async(req,res)=>{
            const decoded = req.decoded;
            console.log(decoded);
            if(decoded.email !== req.query.email){
                res.status(403).send({ message: "Unauthorized access" })
            }
            const query = {};
            const cursor = volunteerList.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/volunteer',verifyJWT, async (req, res) => {
            const volunt = req.body;
            const result =await volunteerList.insertOne(volunt);
            res.send(result);
        })

        app.delete('/volunteer/:id',verifyJWT, async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await volunteerList.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(e => console.error(e))

app.get('/', (req, res) => {
    res.json({
        status: 'Success',
        message: 'Server running successfully.'
    })
})

app.listen(port, () => {
    client.connect(err => {
        if (err) {
            console.log(err);
        }
        else {

            console.log(`Server is running on port ${port}`);
        }
    });
})
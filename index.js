const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, OrderedBulkOperation } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middle Wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.selxuid.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader) {
        return res.status(401).send({message: 'Unauthorized Access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
           return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){

    try{
        const serviceCollection = client.db('plumberBoy').collection('services');
        const reviewCollection = client.db('plumberBoy').collection('reviews');

        app.post('/jwt', async(req, res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '2h'})
            res.send({token})
        })

        app.get('/homePage', async(req, res)=>{
            const query = {}
            const cursor = serviceCollection.find(query).limit(3);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services', async(req, res)=>{
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

       
        // Reviews API

        app.get('/reviews', verifyJWT, async(req, res)=>{
            const decoded = req.decoded;
            if(decoded.email !== req.query.email){
                res.status(403).send({message: 'Unauthorized Access'})
            }

            let query = {};
            if(req.query.email){
                query = {
                    email: req.query.email
                }
            }

            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.post('/reviews', verifyJWT, async(req, res)=>{
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        app.delete('/reviews/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally{

    }

}

run().catch(error => console.error(error));


app.get('/', (req, res)=>{
    res.send('Plumber boy server is running')
})

app.listen(port, ()=>{
    console.log(`plumber boy server is running on ${port}`)
})
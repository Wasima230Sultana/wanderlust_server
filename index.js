import express from 'express'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';
const port =  process.env.PORT || 8000
const app = express()
const client = new MongoClient(process.env.MONGODB_URL);


export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.use(cors())
app.use(express.json())
const mongoClient = await connectToMongoDB()
const db= mongoClient.db('wanderlust_resources')
const destinationCollection = db.collection('destination')
const bookingsCollection = db.collection('booking')

const verifyToken = async(req,res,next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({msg:'Unauthorized!'});
  }
  const token = authHeader.split(" ")[1]
  console.log(token)
  if(!token){
        return res.status(401).send({msg:'Unauthorized!'});
  }
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
  );
  try{
    const {payload} = await jwtVerify(token,JWKS);
    console.log(payload)
    next()
  }catch(error){
    return res.status(500).send({msg:'Server Error!'})
  }

}


app.get('/',(req,res)=>{
    res.send('HELLO WORLD')
})




app.post('/add-destination',verifyToken, async (req, res) => {
 const data = req.body;
 console.log(data)
 const result = await destinationCollection.insertOne(data)
 res.send(result)
})

app.get('/destinations', async (req, res) => {
  try {
    const destinations = await destinationCollection.find().sort({ createdAt: -1 }).toArray()
    res.json({ success: true, destinations })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to load destinations' })
  }
})

app.get('/destinations/:id',verifyToken,async(req,res)=>{
    const {id} = req.params;
    const result = await destinationCollection.findOne({_id: new ObjectId(id)})
    res.send(result)
})

app.patch('/destinations/:id',verifyToken, async(req,res)=>{
  const {id} = req.params
  const data = req.body
  const result = await destinationCollection.updateOne(
    {_id : new ObjectId(id)},
    {$set: data}
  );
  res.json(result)

})

app.delete('/destinations/:id',verifyToken, async(req,res)=>{
  const {id} = req.params;
  const result = await destinationCollection.deleteOne(
    {_id : new ObjectId(id),}
  )
  res.json(result)
})

app.post('/my-booking',async(req,res)=>{
  console.log('receive')
const data = req.body;
const result = await bookingsCollection.insertOne(data)
res.send(result)
})

app.get('/my-bookings/:email',verifyToken,async(req,res)=>{
  const {email} = req.params;
  // console.log(email)
  const result = await bookingsCollection.find({email:email}).toArray();
  res.send(result);
})


app.delete('/my-bookings/:id',verifyToken, async(req,res)=>{
  const {id} = req.params;
  console.log(id)
  const result = await bookingsCollection.deleteOne(
    {_id : id,}
  )
  res.send(result)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

export default app;

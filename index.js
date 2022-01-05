const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');//mod-55.5 vid-4. img er jnno
const app = express();
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');//database tekhe ObjectId get korar jnno ei ta korte hoi
const port = 5000;
const fileUpload = require('express-fileupload');//mod-55.5 v-1.//file upload er jnno express-fileupload install kore ei gula bosate hoi.
//jwt token
const { initializeApp } = require('firebase-admin/app');
const admin = require("firebase-admin");
const serviceAccount = require("./configs/doctors-portal-460d9-firebase-adminsdk-cvqb9-faca764681.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.DB_NAME}.firebaseio.com`
});



app.use(bodyParser.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());
app.use(express.static('doctors'))//mod-55.5 v-1
app.use(fileUpload())//file er jnno middleware hisabe use kora hocce
require("dotenv").config();





app.get('/', (req, res) => {
  res.send('Hello World!')
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p8xf6.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const appointmentCollection = client.db(`${process.env.DB_NAME}`).collection(`${process.env.DB_CollectOne}`);
  const doctorsCollection = client.db(`${process.env.DB_NAME}`).collection(`${process.env.DB_CollectTwo}`);
  const adminCollection = client.db(`${process.env.DB_NAME}`).collection(`${process.env.DB_CollectAdmin}`);
  // console.log(err)

  //insert one admin
  app.post('/admin', (req, res) => {
    const admin = req.body
    adminCollection.insertOne(admin)
  })


  ///ui post appointment info
  app.post('/addAppointment', (req, res) => {
    const appointment = req.body;
    appointmentCollection.insertOne(appointment)
      .then(result => {
        // console.log(result)
        res.send(result.acknowledged)
      })
  });

  ///get method er (?date=....) req.query.date proccess e kora jaito  
  app.post('/appointmentByDate', (req, res) => {
    // console.log(req.body)
    // console.log(req.body.selectedDate)
    // console.log(req.body.email)
    const date = req.body.selectedDate;
    const email = req.body.email
    // console.log(date)//mod-55 vid-8//ei kane sudhu date dile date ta k object hisabe pabo.tai date er bitor date k newa lagbe

    doctorsCollection.find({ email: email })
      .toArray((err, doctorEmail) => {
        // console.log(doctorsDocuments)
        //shuru
        const filter = { appointmentDate: date }
        if (doctorEmail.length === 0) {//mod-55.5 vid-2
          filter.email = email
        }
        appointmentCollection.find(filter)
          .toArray((err, documents) => {
            // console.log(documents)
            err ? res.status(500).send(err) : res.send(documents)
          })
        //end

        //start
        // ei part amar kora.ei kane doctor er access and onno user er access control kora hocce.
        // if (doctorEmail) {
        //   appointmentCollection.find({appointmentDate: date })
        //     .toArray((err, documents) => {
        //       // console.log(documents)
        //       err ? res.status(500).send(err) : res.send(documents)
        //     })
        // }
        // else {
        //   appointmentCollection.find({appointmentDate: date , email:email})//appointment korar email and login korar email milte hobe taile ei email tar jei date e appointment newa ace oi date e click korle appointmentByDate e info show hobe.
        //     .toArray((err, documents) => {//appointmentDate and email mille then oi user suhdu tar appointment gula dekbe
        //       // console.log(documents)
        //       err ? res.status(500).send(err) : res.send(documents)
        //     })
        // }
        //end
      })
  });


  //post method diye authenticate kore data nicci all patients info in dashboard
  app.post('/patients', (req, res) => {
    // console.log(req.headers.authorization, "/patiens");
    const bear = req.headers.authorization;
    const loggedEmail = req.body.email
    if (bear && bear.startsWith('Bearer ')) {
      const idToken = bear.split(' ')[1];///ei kane Bearer (space) soho split kore niye token ta k decode kore email ta niye verify kora hocce
      // console.log(idToken,"idToken");
      //   console.log({idToken})//ei kane second braket dewate ei ta object akare console korbe.means {idToken:......}
      admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
          // const userDecToken = decodedToken;
          //   console.log(userDecToken)
          //   console.log({userDecToken})
          const tokenEmail = decodedToken.email
          if (tokenEmail == loggedEmail) {
            doctorsCollection.find({ email: loggedEmail }).toArray((err, result) => {
              // console.log({ result })
              if (result.length > 0) {//jodi doctors collection e email tar info takhe tahole se doctor tai ta k sob appointment dekabe.doctor na hole dekabe na
                appointmentCollection.find({})
                  .toArray((err, documents) => {
                    // console.log(documents)
                    err ? res.status(500).send(err) : res.send(documents)
                  })
              }
            })
          }
        })
        .catch((error) => {
          res.status(500).send(err)
        });
    }

  });


  //addDoctor doctor info add kora hocce database e Image/file soho
  //mod-55.5  vid-0
  app.post('/addAdoctor', (req, res) => {
    const file = req.files.file;//last er .file holo jei name e ui tekhe patanu hocce oi nam ta
    const name = req.body.name;
    const email = req.body.email;
    const loginEmail = req.body.loginEmail;
    const img = file.name
    // console.log(name, email, file, img,  loginEmail);

    adminCollection.find({ email: loginEmail }).toArray((err, doctor) => {
      if (doctor.length > 0) {
        // const filePath = `${__dirname}/doctors/${file.name}`//mod-55.5 vid-4
        // file.mv(filePath, (err) => {//mod-55.5 vid-1
        //   if (err) {
        //     console.log(err)
        //     res.status(500).send({ msg: "Failed to Upload Image" })
        //   }
        // const newImg = fs.readFileSync(filePath)//mod-55.5 vid-4
        const newImg = req.files.file.data
        const encodedImg = newImg.toString('base64')
        const imageInfo = {
          contentType: req.files.file.mimetype,
          size: req.files.file.size,
          // img: Buffer(encodedImg, 'base64')
          img: Buffer.from(encodedImg, 'base64')
        }
        doctorsCollection.insertOne({ name, email, imageInfo })
          .then(result => {
            // fs.remove(filePath, error => {//mod-55.5 vid-4
            //   if (error) {
            //     console.log(error)
            //     res.status(500).send({ msg: "Failed to Upload Image" })
            //   }
            res.send(result.acknowledged)
            // })
            console.log(result)
          })
        // res.send({ name: file.name, path: `/${file.name}` })
        // })
      }
      else { res.send(false) }
    })

  });


  //all doctors er info show hobe joto doctor add kora hobe tar tekhe 
  app.get('/allDoctors', (req, res) => {
    // const getToken=req.headers.authorization
    // if(getToken && getToken.startsWith('Bearer ')){
    //   const tokenCode=getToken.split(' ')[1]
    //   admin.auth().verifyIdToken(tokenCode)
    //     .then((decodedToken) => {
    //       const descyptedInfo=decodedToken
    //       ///upore if contion diye (/patients) e loginUser.email==decodedToken.email ei ta na korleo hobe
    doctorsCollection.find({})
      .toArray((err, documents) => {
        // console.log(documents)
        err ? res.status(500).send(err) : res.send(documents)
      })
    //     })
    // }else{
    //   res.status(401).send('Un-Authorized Access, get out from here')
    // }
  });

  app.post('/isDoctor', (req, res) => {
    const email = req.body.email;
    //  console.log(email);
    doctorsCollection.find({ email: email })
      .toArray((err, doctor) => {//mod-55.5 vid-3
        res.send(doctor.length > 0) //length jodi 0 tekhe boro hoi mane condition jodi true hoi.tahole true send korbe
      })
  });


  ///change status
  app.patch('/changeStatus/:id', (req, res) => {
    doctorsCollection.find({ email: req.body.email }).toArray((err, document) => {
      if (document.length > 0) {
        // const id = req.params.id;
        // const chnafe=req.body.change;
        //  console.log(id,chnafe);
        appointmentCollection.updateOne({ _id: ObjectId(req.params.id) },
          {
            // $set: { status: "visited" }
            $set: { status: req.body.change }
          })
          .then(result => {
            // console.log(result)
            res.send(result.modifiedCount > 0)
          })
      } else {
        res.send(false)
      }
    })
  });





});

app.listen(process.env.PORT || port, console.log("listen to port 5000"))
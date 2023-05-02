require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local')
const port = process.env.PORT || 3000
const passportLocalMongoose = require("passport-local-mongoose");

const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: 'Our little secret',
    resave: false,
    saveUninitialized: false,
  }));

app.use(passport.initialize());
app.use(passport.session());

const connectDB = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
}

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    correct: {type: Number, default: 0},
    attempts: {type: Number, default: 0},
    accuracy: {type: Number, default: 0},
    time: {type: Number, default: 0},
    quesNo: {type: Number, default: 0}
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use('userLocal', new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const about = ["Welcome to our website! We are a team of passionate individuals who are dedicated to providing high-quality products and services to our customers. Our company was founded on the principles of integrity, hard work, and a commitment to excellence.", "Our team has years of experience in our respective fields, and we bring that expertise to everything we do. We believe in constantly pushing ourselves to improve and innovate, and we are always looking for new and better ways to serve our customers.", "At our core, we believe that success comes from building strong relationships with our customers. We strive to always be responsive, helpful, and attentive to our customers' needs, and we are committed to providing personalized service that exceeds their expectations.", "Thank you for taking the time to learn more about our company. We look forward to serving you and building a lasting relationship with you!"];

const questions = [`What is the third word in the third paragraph of the "About Us" page on our website?`, `Watch this video until the end and count the number of times the word "time" is said. What is the number?`, `I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?`, `Find the hidden message in the binary code provided below. Break the binary code into groups of 8 digits and convert each group of 8 digits into decimal form. Enter the string which is formed by concatanating the first letter of every word`];



let link = "";
let binary = "";
let address = "";
let start = 0;


app.get("/", function(req, res){
    res.render("home");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/dashboard", function(req, res){
    if(req.isAuthenticated()){
        res.render("dashboard", {name:req.user.username, accuracy:req.user.accuracy, time: req.user.time});
    }
    else{
        res.redirect("/login");
    }
});

app.get("/treasurehunt", function(req, res){
    if(req.isAuthenticated()){
        if(req.user.quesNo===0){
            start = Date.now();
        }
        if(req.user.quesNo===1){
            link = "https://www.youtube.com/watch?v=S71bIo1X8kU";
        }
        if(req.user.quesNo===3){
            binary = `01001000 01100101 01101100 01101100 01101111 00100000 01110100 01101000 01100101 01110010 01100101 00101100 00100000 01110100 01101000 01101001 01110011 00100000 01101001 01110011 00100000 01100001 00100000 01110011 01100001 01101101 01110000 01101100 01100101 00100000 01101111 01100110 00100000 01100010 01101001 01101110 01100001 01110010 01111001 00100001`;
        }
        if(req.user.quesNo===4){
            address = "https://i.pinimg.com/564x/db/76/21/db76211c11230fa0bd67574c14a028b2.jpg";
            binary = "Find the 6 words hidden in the image below. (The words in the answer should be separated by ',')"
        }
        if(req.user.quesNo===5){
            address = "";
            binary = "";
            res.redirect("/final");
        }
        else{
            res.render("treasurehunt", {quesContent: questions, quesNo: req.user.quesNo, link: link, binary: binary, address: address});
        }
    }
    else{
        res.redirect("/login");
    }
});

app.get("/about", function(req, res){
    res.render("about", {aboutContent: about});
});

app.get("/dead", function(req, res){
    res.render("dead");
});

app.get("/final", function(req, res){
    res.render("final");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/logout", function(req,res){
    req.logout((err)=>{
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/");
        }
    });
});


app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("userLocal")(req, res, function(){
                res.redirect("/treasurehunt");
            });
        }
    });
   
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log(req.user.id, req.user.quesNo);
                passport.authenticate("userLocal")(req, res, function(){
                res.redirect("/treasurehunt");
            });
        }
    });
});

app.post("/treasurehunt", function(req, res){
    
    if(req.user.quesNo === 0){
        const typedAns = _.lowerCase(req.body.answer);
    const correctAns = "core";
    if(correctAns===typedAns){
        req.user.quesNo = req.user.quesNo + 1;
        req.user.correct = req.user.correct + 1;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
            
        res.redirect("/treasurehunt");
    }
    else{
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
        res.render("dead");
    }
    
    }
    else if(req.user.quesNo===1){
        const typedAns = Number(req.body.answer);
        if(typedAns===6){
            link = "";
        req.user.quesNo = req.user.quesNo + 1;
        req.user.correct = req.user.correct + 1;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
            res.redirect("/treasurehunt");
        }
        else{
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
            res.render("dead");
        }
    }
    else if(req.user.quesNo===2){
        const typedAns = _.lowerCase(req.body.answer);
        if(typedAns==="fire"){
        req.user.quesNo = req.user.quesNo + 1;
        req.user.correct = req.user.correct + 1;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
        
            res.redirect("/treasurehunt");
        }
        else{
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
            res.render("dead");
        }
    }
    else if(req.user.quesNo===3){
        const typedAns = _.lowerCase(req.body.answer);
        if(typedAns==="httiasob"){
            
            binary = "";

        req.user.quesNo = req.user.quesNo + 1;
        req.user.correct = req.user.correct + 1;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
            res.redirect("/treasurehunt");
        }
        else{
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();

            res.render("dead");
        }
    }
    else if(req.user.quesNo===4){
        let typedAns = req.body.answer.split(",");
        let trimmedAns = typedAns.map(ele => ele.trim().toLowerCase()
        );
        trimmedAns = trimmedAns.sort();
        const actualAns = ["boy", "fish", "hot", "nice", "tree", "waves"];
        let wrong = false;
        for (let i = 0; i < actualAns.length; i++){
            if(trimmedAns[i]!==actualAns[i]){
                wrong = true;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.save();
                res.render("dead");
                break;
            }
        }
        if(!wrong){
            req.user.quesNo = req.user.quesNo + 1;
            
        }
        req.user.correct = req.user.correct + 1;
            req.user.attempts = req.user.attempts + 1;
            req.user.accuracy = (req.user.correct/req.user.attempts)*100;
            req.user.time = Date.now()-start;
            req.user.save();
        res.render("final");
    }
    

});



connectDB().then(() => {
    app.listen(port, function(req, res){
        console.log("Listening to port 3000...");
    });    
})

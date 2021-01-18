const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrybt = require('bcrypt');
const dbConnection = require('./db');
const {body, validationResult } = require('express-validator');
const { throws } = require('assert');
const collection = require('./db');
const app = express();
app.use(express.urlencoded({extended:false}));
app.set('views',path.join(__dirname,'views'));
app.set('view engine', 'ejs');

app.use(cookieSession({
    name:'session',
    keys:['key1','key2'],
    maxAge:3600*100
}))

const ifNotLoggedIn = (req,res,next) =>{
    if(!req.session.isLoggedIn){
        return res.render('login-register');
    }
    console.log('....ifNotLoggedIn');
    next();
}
const ifLoggedIn = (req,res,next)=>{
    if(req.session.isLoggedIn){
        return res.redirect('/home');
    }
    next();
}
app.get('/',ifNotLoggedIn,(req,res,next) => {
    dbConnection.findOne({user_name: req.session.userID}).then((doc) => {
        res.render('home',{name:doc.user_name});
    });
})

app.get('/logout',(req,res) => {
    req.session = null;
    res.redirect('/');
})
//Register Page
app.post('/register',ifLoggedIn, [
    body('user_email','Invalid Email').isEmail().custom((value)=>{
        return dbConnection.find({user_email:value}).then((docs) => {
            if(docs.length > 0) return Promise.reject('Email ถูกใช้แล้ว');
        });
    }),
    body('user_name','User is empty !!!').trim().not().isEmpty(),
    body('user_pass','The password must be of min length 6 charecter').trim().isLength({ min:6 })
],(req,res,next) => {
    const validation_result = validationResult(req);
    const { user_name,user_pass,user_email } = req.body;
    if(validation_result.isEmpty()){
        bcrybt.hash(user_pass,12).then((hsah_pass) => {
            dbConnection.insert({user_name:user_name,user_pass:hsah_pass,user_email:user_email}).then((result) => {
                res.send('Your account has been created successfully, Now you can <a href="/"> Login</a>');
            }).catch((err)=> {
                if(err) throw err;
            })
        }).catch((err) => {
            if(err) throw err;
        })
    }else{

        let allError = validation_result.errors.map((error)=>{
            return error.msg;
        })

        res.render('login-register',{
            register_error : allError,
            old_data : req.body
        })
    }
})

//login
app.post('/',ifLoggedIn,[
    body('user_email').custom((value) => {
        return collection.findOne({user_email : value}).then((doc) => {
            if(doc !== null) return true;
            return Promise.reject('ไม่พบ Email นี้ในระบบ');
        })
    }),
    body('user_pass','กรุณาใส่ Password').trim().not().isEmpty()
],(req,res) => {
    const validation_result = validationResult(req);
    const {user_email,user_pass} = req.body;
    
    console.log('validation_result = ',validation_result);
    if(validation_result.isEmpty()){
        collection.findOne({user_email:user_email}).then((doc) => {
            console.log(doc.user_email);
            if(doc.user_email.length > 0){
                // const hash = bcrypt.hashSync(user_pass, 12);
                bcrybt.compare(user_pass,doc.user_pass).then((compareResult) => {
                    if(compareResult === true) {
                        console.log('8');
                        req.session.isLoggedIn = true;
                        req.session.userID = doc.user_name;
                        res.redirect('/');
                    }else{
                        console.log('7')
                        res.render('login-register',{
                            login_errors:['Invalid Password']
                        })
                    }
                }).catch((err)=>{
                   
                    if(err) throw err;
                })
            }
            console.log('6')
        }).catch((err)=>{
            
            if(err) throw err;
        })
    } else {
        let allErrors = validation_result.errors.map((error)=>{
            return error.msg;
        })

        res.render('login-register',{
            login_errors:allErrors
        });
    }
})

app.use('/',(req,res)=>{
    res.status(404).send('<h1>404 Page not found!</h1>');
})
app.listen(3000, () => console.log('Server is Running'));
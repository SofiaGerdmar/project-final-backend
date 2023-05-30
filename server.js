import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/project-final-api";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());
const listEndpoints = require('express-list-endpoints');

app.get("/", (req, res) => {
  res.send(listEndpoints(app));
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
});

const User = mongoose.model("User", UserSchema);

// Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = bcrypt.genSaltSync();
    const newUser = await new User({
      username: username,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.status(201).json({
      success: true,
      response: {
        username: newUser.username,
        id: newUser._id,
        accessToken: newUser.accessToken
      }
    })
  } catch (e) {
    res.status(400).json({
      success: false,
      response: e
    })
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({username: username})
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
        }
      });
    } else {
      res.status(400).json({
        success: false,
        response: "Credentials do not match"
      });
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
})

// Likes
const LikeSchema = new mongoose.Schema({
  hearts: {
    type: Number,
    default: 0
  },
  user: {
    type: String,
    required: true
  }
});

const Likes = mongoose.model("Likes", LikeSchema);

// Authenticate the user
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({accessToken});
    if (user) {
      next();
    } else {
      res.status(401).json({
        success: false,
        response: "Please log in"
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
}

app.get("/likes", authenticateUser);
app.get("/likes", async (req, res) => {
  const likes = await Likes.find({});
  res.status(200).json({success: true, response: likes})
});

app.post("/likes", authenticateUser);
app.post("/likes", async (req, res) => {
  const { message } = req.body;
  const accessToken = req.header("Authorization");
  const user = await User.findOne({accessToken});
  const likes = await new Likes({message, user: user._id}).save();

  res.status(200).json({success: true, response: likes})
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


require("dotenv").config();
const stripe = require("stripe")("sk_test_51QrCtrP7PVqCIUzGNdOXSKHCBWRx73YiJgPXwasJDbQ58ZVFGDZCIEQEniy9IR5hcr26eTq5Ovm1Om2SLqWmN1UW00eDJq54sp");
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const chalk = require("chalk");
const cors = require("cors");
const passport = require("passport");
const sessions = require("express-session");
const { RedisStore } = require("connect-redis");
const paymentRoutes = require("./routes/v1/paymentRoutes");

//? Databases
const connectMongoDB = require("./modules/database/mongodb");
const redis = require("./modules/database/redis");

// MongoDB Connection
connectMongoDB();

// Redis Connection
(async () => {
  await redis.connect();
})();

redis.on("connect", () => console.log(chalk.green("Redis Connected")));
redis.on("ready", () => console.log(chalk.green("Redis Ready")));
redis.on("error", (err) => console.log("Redis Client Error", err));

// Export Redis
module.exports = redis;

//? Redis Store for Sessions
let redisStore = new RedisStore({
  client: redis,
  prefix: "hdgtest:",
});

const app = express();

//? View Engine Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//? Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", false);

//? Sessions
app.use(
  sessions({
    secret: "secretkey",
    store: redisStore,
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: false, // Set true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

//? PassportJS
app.use(passport.initialize());
app.use(passport.session());

//? CORS Configuration
const whitelist = ["http://localhost:5173"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow requests with no origin (Postman, curl, etc.)
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST,PUT,PATCH,DELETE",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

//? Socket.io Setup
const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinActivity", (chatRoomId) => {
    socket.join(chatRoomId);
    console.log(`${socket.id} joined activity ${chatRoomId}`);
  });

  socket.on("message", ({ activityId, message }) => {
    io.to(activityId).emit("message", { activityId, message });
  });

  socket.on("leaveActivity", (chatRoomId) => {
    socket.leave(chatRoomId);
    console.log(`${socket.id} left activity ${chatRoomId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  socket.on("reaction", (data) => {
    io.to(data.chatRoomId).emit("reaction", data);
  });
});

//? Routes
const v1AuctionRoutes = require("./routes/v1/auctionRoutes");
app.use("/api/v1/auction", v1AuctionRoutes);

const v1OrderRouter = require("./routes/v1/orderRoutes");
app.use("/api/v1/order", v1OrderRouter);

const v1ProductRouter = require("./routes/v1/productRoutes");
app.use("/api/v1/products", v1ProductRouter);

const v1IndexRouter = require("./routes/v1/indexRoutes");
app.use("/api/v1", v1IndexRouter);

const v1AuthRouter = require("./routes/v1/authRoutes");
app.use("/api/v1/auth", v1AuthRouter);

const v1ChatRouter = require("./routes/v1/chatRoutes")(io);
app.use("/api/v1/chat", v1ChatRouter);

const v1AccountRouter = require("./routes/v1/accountsRoutes");
app.use("/api/v1/accounts", v1AccountRouter);

const v1FileUploadRouter = require("./routes/v1/fileUploadRoutes");
app.use("/api/v1/fileupload", v1FileUploadRouter);

const v1PostRouter = require("./routes/v1/postRoutes");
app.use("/api/v1/post", v1PostRouter);

const activityRoutes = require("./routes/v1/activityRoutes");
const v1ActivityRouter = activityRoutes(io);
app.use("/api/v1/activity", v1ActivityRouter);

const v1UserRouter = require("./routes/v1/UserRoutes");
app.use("/api/v1/users", v1UserRouter);


//เพิ่มเส้นทาง paymentRoutes
app.use(cors()); // ป้องกัน CORS error
// ✅ Mount routes ถูกต้อง
app.use("/api/v1/payments", paymentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


//? 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

//? Global Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    details: req.app.get("env") === "development" ? err : {},
  });
});

// Export App, Server, and Socket.io
module.exports = { app, server, io };

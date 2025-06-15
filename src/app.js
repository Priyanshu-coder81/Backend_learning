import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    Credential: true,
  })
);

app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(express.static("public "));

app.use(cookieParser());

// importing routes

import { router as userRouter } from "./routes/user.route.js";
import videoRouter from "./routes/video.route.js";
import commentRouter from "./routes/comment.route.js";
import  healthcheckRouter  from "./routes/healthcheck.route.js";
import likeRouter from "./routes/like.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import tweetRouter from "./routes/tweet.route.js";
import playlistRouter from "./routes/playlist.route.js";
import dashboardRouter from "./routes/dashbord.route.js";

// routes declartion
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos",videoRouter);
app.use("/api/v1/comments",commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions",subscriptionRouter);
app.use("/api/v1/tweets",tweetRouter);
app.use("/api/v1/playlists",playlistRouter);
app.use("/api/v1/dashboards",dashboardRouter);


export { app };

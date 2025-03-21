import express from "express";
import cors from "cors";
import cookieParser from "cookies-parser";

const app = express();

app.use(
  cros({
    origin: process.env.CORS_ORIGIN,
    Credential: true,
  })
);

app.use(express.json({limit: "10kb",}));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(express.static("public "));

app.use(cookieParser());

export { app };

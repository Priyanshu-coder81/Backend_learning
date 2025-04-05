import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

import { userRegister } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  userRegister
);

export { router };

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
    refreshAccessToken,
  userLoggedOut,
  userLogin,
  userRegister,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(userLogin);

// Secured Route
router.route("/loggedOut").post(verifyJWT, userLoggedOut);

router.route("/refresh-token").post(refreshAccessToken);

export { router };

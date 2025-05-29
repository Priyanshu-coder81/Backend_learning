import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  changeCurrentPassword,
    getCurrentUser,
    getCurrentUserProfile,
    getWatchHistory,
    refreshAccessToken,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
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

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/c/:username").get(verifyJWT, getCurrentUserProfile);

router.route("/watch-history").get(verifyJWT,getWatchHistory)



export { router };

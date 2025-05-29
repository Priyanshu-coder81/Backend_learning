import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../utils/removeFile.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  const accessToken = user.generateAccessTokens();
  const refreshToken = user.generateRefreshTokens();

  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  try {
    const parts = url.split("/upload/")[1].split(".");
    const publicIdWithVersion = parts[0];
    const publicId = publicIdWithVersion.replace(/v\d+\//, "");
    return publicId;
  } catch (error) {
    return null;
  }
};

const userRegister = asyncHandler(async (req, res) => {
  // Pre-plan what we gonna do
  //get user-details through Postman
  // Validate the details
  // Check if user already exists
  // check for avatar and image
  // upload to cloudinary and check it upload correctly
  // create user object : create entry in database
  // remove password & refresh token from response
  // send response

  // taking data from req.body
  const { fullName, username, email, password } = req.body;

  // Validating if all fields are filled or not
  // .some() => method in javascript, you can check multiple items at once or say -> Multipe if's  in single go!
  // feild? --> means if feild exist then proceed(it may be present or may be not)
  if (
    [fullName, username, email, password].some((feild) => feild?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  /* // Validating email with a package validator 
  if(!validator.isEmail(email)) {
    throw new ApiError(400 , "Email is incorrect");
  } */

  // Checking if already exist
  // (imp) ( $or: [{} , {},...]) => you can open for any logical operation
  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (userExist) {
    throw new ApiError(409, "User with email or username already exist");
  }

  // Checking for avatar and images
  const avatarLocalPath = req.files?.avatar[0].path;
  //   const coverImageLocalPath = req.files?.coverImage[0].path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // Checking if avatar is uploaded, which is a required feild
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required1");
  }

  // uploading on cloudinary, it takes time so await
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // checking if avatar is uploaded in cloudinary
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Adding into the database
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  // Checking if entry is created in database and also removing password and refreshToken from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // if entry is not done, sending resopone
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registration");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered"));
});

const userLogin = asyncHandler(async (req, res) => {
  // Get input data from req.body
  // check in input (username or email)
  // Validate data if user exist with username or email
  // if exist  - check for password   //   else --> User not registerd
  // Send acess and refresh token
  // Send response

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Input at least one field(Username / Email)");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(401, "User not registerd");
  }

  const userPasswordIsValid = await user.isPasswordCorrect(password);

  if (!userPasswordIsValid) {
    throw new ApiError(400, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged in Successfully"
      )
    );
});

const userLoggedOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, [], "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken == !user.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } = generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    return new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(201, {}, "Password Changed"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // We are updating  eamil or fullName or username as per user requirement
  const { email, fullName, username } = req.body;

  if (!email && !fullName && !username) {
    throw new ApiError(401, "Atleast one field is required");
  }

  const updateData = {};
  if (email) updateData.email = email;
  if (fullName) updateData.fullName = fullName;
  if (username) updateData.username = username;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: updateData,
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully"));
});

// Remove old avatar from cloudinary

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  const avatarUrlToBeDeleted = req.user?.avatar;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select(" -password -refreshToken");

  const publicId = getPublicIdFromUrl(avatarUrlToBeDeleted);

  // Only try to delete if we have a valid public ID
  console.log(publicId);
  if (publicId) {
    const response = await deleteFromCloudinary(publicId);
    if (!response) {
      console.log("Failed to delete old avatar from Cloudinary");
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const coverImage = uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Error while uploading CoverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select(" -password ");

  res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage Updated Successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Invalid Username");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscriber",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscriber",
        },
        subscribedToChannel: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subcriber.subscribe"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        subscribedToChannel: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, channel[0], "Channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id:  new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName:1,
                    username:1,
                    avatar:1
                  }
                },
              ],
            },
          },
          {
            $addFields: {
              owner : {
                $first : "$owner"
              }
            }
          }
        ],
      },
    },
    {
      $project : {
        watchHistory:1
      }
    }
  ]);

  if(!user?.length) {
    throw new ApiError(400, "Watch History Not found");
  }

  return res.status(200)
  .json(new ApiResponse(200,user[0].watchHistory, "Watch History fetched successfully"));
});

export {
  userRegister,
  userLogin,
  userLoggedOut,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getCurrentUserProfile,
  getWatchHistory
};

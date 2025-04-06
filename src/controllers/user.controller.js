import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import validator from "validator";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  const accessToken = user.generateAccessTokens();
  const refreshToken = user.generateRefreshTokens();

  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
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

  // taking data from re.body
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

const refreshAccessToken = asyncHandler(async (req,res) => {

        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

        if(!incomingRefreshToken) {
            throw new ApiError(401 , "Unauthorized Access");
        }

       try {
         const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
 
         const user = await User.findById(decodedToken?._id)
 
         if(!user) {
             throw new ApiError(401,"Invalid Refresh Token");
         }
 
         if(incomingRefreshToken ==! user.refreshToken) {
             throw new ApiError(401 , "Refresh Token is expired or used");
         }
 
          const options = {
             httpOnly:true,
             secure:true
          }
 
          const {accessToken , newRefreshToken} = generateAccessAndRefreshToken(user._id);
 
          return res.status(200)
          .cookie("accessToken",accessToken,options)
          .cookie("refreshToken",newRefreshToken,options)
          .json(new ApiResponse(
             200,
             {
                 accessToken,refreshToken:newRefreshToken,
             },
             "Access Token Refreshed"
          ))
       } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token");
       }
});

export { userRegister, userLogin, userLoggedOut , refreshAccessToken };

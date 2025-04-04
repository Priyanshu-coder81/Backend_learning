import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import  { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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


  // Checking if already exist 
  // (imp) ( $or: [{} , {},...]) => you can open for any logical operation
  const userExist = User.findOne({
     $or: [{username} , {email}]
  })

  if(userExist) {
    throw new ApiError(409 , "User with email or username already exist");
  }


// Checking for avatar and images 
  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

  // Checking if avatar is uploaded, which is a required feild
  if(!avatarLocalPath) {
    throw new ApiError(400 , "Avatar file is required");
  }

  // uploading on cloudinary, it takes time so await
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // checking if avatar is uploaded in cloudinary
  if(!avatar) {
    throw new ApiError(400 , "Avatar file is required");
  }

  // Adding into the database
  const user = await User.create({
    username:username.toLowerCase(),
    fullName,
    email,
    avatar: avatar.url,
    coverImgae: coverImage?.url || "",
    password
  });

  // Checking if entry is created in database and also removing password and refreshToken from response
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  // if entry is not done, sending resopone
  if(!createdUser) {
    throw new ApiError(500 , "Something went wrong while registration");
  }

  return res.statusCode(201).json(
    new ApiResponse(200 , createdUser, "User Registered")
  );
  

});

export { userRegister };

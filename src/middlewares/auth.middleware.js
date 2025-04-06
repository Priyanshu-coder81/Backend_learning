import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler( async (req , _ , next) => {

    try {
        const tokens = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    
        if(!tokens) {
            throw new ApiError(401, "Unauthorized Acess");
        }
    
        const decodedToken = jwt.verify(tokens,process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select(" -password -refreshToken");
    
        if(!user) {
            throw new ApiError(401,"Ivalid Access Token");
        }
    
        req.user = user;
        next();
    
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token");
    }

});
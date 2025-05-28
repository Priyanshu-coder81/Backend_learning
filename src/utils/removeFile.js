import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const deleteFromCloudinary = async (oldAvatarPublicId) => {
    try {
        if(!oldAvatarPublicId) {
            console.log("NO pubicId is provided");
            return null;
        }

        console.log("Attempting to delete from cloudinary");

        const response = await cloudinary.uploader.destroy(oldAvatarPublicId, {
            resource_type: "image"
        });

        console.log("Cloudinary Deletion response", response);

        
        if (response.result !== "ok") {
            console.error("Cloudinary deletion failed:", response);
            return null;
        }

        return response;

    } catch (error) {
        console.error("Error deleting from Cloudinary:", error.message);
       return null;
    }
}

export {deleteFromCloudinary};
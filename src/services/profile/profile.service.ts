import { Model, Schema } from "mongoose";
import { IProfileDocument } from "../../types/core/profile.types";
import { NotFoundError } from "../../utils/error.util";
import { logger } from "../../utils/logger.util";

/*** Profile Service */
class ProfileService {
  constructor(private ProfileModel: Model<IProfileDocument>) {}

  /*** Get user profile */
  async getProfile(
    userId: Schema.Types.ObjectId
  ): Promise<IProfileDocument | null> {
    try {
      const profile = await this.ProfileModel.findOne({ user: userId }).lean();

      if (!profile) {
        throw new NotFoundError("User profile");
      }

      return profile;
    } catch (error) {
      logger.error("ProfileService", "Failed to get profile", { error });
      throw error;
    }
  }

  /*** Check if user has handwriting uploaded */
  async hasHandwriting(userId: Schema.Types.ObjectId): Promise<boolean> {
    try {
      const profile = await this.ProfileModel.findOne(
        { user: userId },
        { handwritingImage: 1 }
      ).lean();

      return !!(profile?.handwritingImage);
    } catch (error) {
      logger.error("ProfileService", "Failed to check handwriting", { error });
      return false;
    }
  }
}

export const createProfileService = (
  ProfileModel: Model<IProfileDocument>
): ProfileService => {
  return new ProfileService(ProfileModel);
};
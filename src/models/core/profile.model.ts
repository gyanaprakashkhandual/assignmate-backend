import { model, Model } from "mongoose";
import { ProfileSchema } from "../../schemas/core/profile.schema";
import { IProfileDocument } from "../../types/core/profile.types";

type IProfileModel = Model<IProfileDocument>;

const Profile = model<IProfileDocument, IProfileModel>("Profile", ProfileSchema);

export default Profile;
export type { IProfileDocument, IProfileModel };
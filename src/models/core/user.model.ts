import { model, Model } from "mongoose";
import { UserSchema } from "../../schemas/core/user.schema";
import { IUserDocument, IUserMethods, OAuthProvider } from "../../types/core/user.types";

interface IUserModel extends Model<IUserDocument>, IUserMethods {
    findByOAuth(provider: OAuthProvider, providerId: string): Promise<IUserDocument | null>;
}

const User = model<IUserDocument, IUserModel>("User", UserSchema);

export default User;
export type { IUserDocument, IUserModel };
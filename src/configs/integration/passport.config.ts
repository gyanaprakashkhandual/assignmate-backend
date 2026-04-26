import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { VerifyCallback } from "passport-oauth2";
import User, { IUserDocument } from "../../models/core/user.model";
import { OAuthProvider } from "../../types/core/user.types";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

const GOOGLE_CALLBACK_URL = `${process.env.API_BASE_URL}/api/auth/google/callback`;
const GITHUB_CALLBACK_URL = `${process.env.API_BASE_URL}/api/auth/github/callback`;

async function handleOAuthProfile(
    provider: OAuthProvider,
    providerId: string,
    email: string,
    name: string,
    avatar: string,
    accessToken: string,
    refreshToken: string | undefined,
    done: VerifyCallback
): Promise<void> {
    try {
        let user: IUserDocument | null = await User.findByOAuth(provider, providerId);

        if (user) {
            const profileIndex = user.oauthProfiles.findIndex(
                (p) => p.provider === provider && p.providerId === providerId
            );

            if (profileIndex !== -1) {
                user.oauthProfiles[profileIndex].accessToken = accessToken;
                if (refreshToken) {
                    user.oauthProfiles[profileIndex].refreshToken = refreshToken;
                }
            }

            user.lastLoginAt = new Date();
            await user.save();

            logger.info("OAuthPassport", "Existing user logged in via OAuth", { provider, userId: user._id });
            console_util.success("OAuthPassport", "Existing user OAuth login", { provider, userId: user._id });

            return done(null, { ...user.toObject(), isNewUser: false });
        }

        user = await User.findOne({ email });

        if (user) {
            user.oauthProfiles.push({ provider, providerId, accessToken, refreshToken });
            user.lastLoginAt = new Date();
            await user.save();

            logger.info("OAuthPassport", "Existing email user linked OAuth profile", {
                provider,
                userId: user._id,
                email,
            });
            console_util.success("OAuthPassport", "OAuth profile linked to existing account", { provider, email });

            return done(null, { ...user.toObject(), isNewUser: false });
        }

        const newUser = await User.create({
            name,
            email,
            avatar,
            oauthProfiles: [{ provider, providerId, accessToken, refreshToken }],
            lastLoginAt: new Date(),
        });

        logger.info("OAuthPassport", "New user created via OAuth", { provider, userId: newUser._id, email });
        console_util.success("OAuthPassport", "New user registered via OAuth", { provider, email });

        return done(null, { ...newUser.toObject(), isNewUser: true });
    } catch (error) {
        logger.error("OAuthPassport", "OAuth profile handling failed", { provider, email, error });
        console_util.error("OAuthPassport", "OAuth profile handling failed", { provider, error });
        return done(error as Error);
    }
}

// No serializeUser/deserializeUser needed — JWT only, no sessions

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: GOOGLE_CALLBACK_URL,
            scope: ["profile", "email"],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: GoogleProfile,
            done: VerifyCallback
        ) => {
            const email = profile.emails?.[0]?.value ?? "";
            const avatar = profile.photos?.[0]?.value ?? "";
            await handleOAuthProfile(
                "google",
                profile.id,
                email,
                profile.displayName,
                avatar,
                accessToken,
                refreshToken,
                done
            );
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL: GITHUB_CALLBACK_URL,
            scope: ["user:email"],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: GitHubProfile,
            done: VerifyCallback
        ) => {
            const email = profile.emails?.[0]?.value ?? "";
            const avatar = profile.photos?.[0]?.value ?? "";
            await handleOAuthProfile(
                "github",
                profile.id,
                email,
                profile.displayName || profile.username || "",
                avatar,
                accessToken,
                refreshToken,
                done
            );
        }
    )
);

export default passport;
import { NextApiRequest, NextApiResponse, NextPageContext } from "next";
import { Adapter } from "next-auth/adapters";
import { parseCookies, destroyCookie } from "nookies";
import { prisma } from "../prisma";

export function PrismaAdapter(
  req: NextApiRequest | NextPageContext["req"],
  res: NextApiResponse | NextPageContext["res"]
): Adapter {
  return {
    async createUser(user) {
      const { "@ignitecall:userId": userIdOnCookies } = parseCookies({ req });

      if (!userIdOnCookies) {
        throw new Error("User ID not found on cookies.");
      }

      const prismaUser = await prisma.user.update({
        where: {
          id: userIdOnCookies,
        },
        data: {
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });

      destroyCookie({ res }, "@ignitecall:userId", {
        path: "/",
      });

      return {
        id: prismaUser.id,
        name: prismaUser.name,
        avatar_url: prismaUser.avatar_url!,
        username: prismaUser.username,
        email: prismaUser.email!,
        emailVerified: null,
      };
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url!,
        username: user.username,
        email: user.email!,
        emailVerified: null,
      };
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url!,
        username: user.username,
        email: user.email!,
        emailVerified: null,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_provider_account_id: {
            provider,
            provider_account_id: providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      if (!account) {
        return null;
      }

      return {
        id: account.user.id,
        name: account.user.name,
        avatar_url: account.user.avatar_url!,
        username: account.user.username,
        email: account.user.email!,
        emailVerified: null,
      };
    },

    async updateUser(user) {
      const primaUser = await prisma.user.update({
        where: {
          id: user.id!,
        },
        data: {
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });

      return {
        id: primaUser.id,
        name: primaUser.name,
        username: primaUser.username,
        email: primaUser.email!,
        emailVerified: null,
        avatar_url: primaUser.avatar_url!,
      };
    },

    async linkAccount(account) {
      await prisma.account.create({
        data: {
          user_id: account.userId,
          type: account.type,
          provider: account.provider,
          provider_account_id: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        },
      });
    },

    async createSession({ sessionToken, userId, expires }) {
      await prisma.session.create({
        data: {
          user_id: userId,
          expires,
          session_token: sessionToken,
        },
      });

      return {
        userId,
        sessionToken,
        expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const session = await prisma.session.findUnique({
        where: {
          session_token: sessionToken,
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        return null;
      }

      const { user, ...prismaSession } = session;
      return {
        session: {
          expires: prismaSession.expires,
          userId: prismaSession.user_id,
          sessionToken: prismaSession.session_token,
        },
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email!,
          emailVerified: null,
          avatar_url: user.avatar_url!,
        },
      };
    },

    async updateSession({ sessionToken, userId, expires }) {
      const prismaSession = await prisma.session.update({
        where: {
          session_token: sessionToken,
        },
        data: {
          expires,
          user_id: userId,
        },
      });

      return {
        sessionToken: prismaSession.session_token,
        userId: prismaSession.user_id,
        expires: prismaSession.expires,
      };
    },

    async deleteSession(sessionToken) {
      await prisma.session.delete({
        where: {
          session_token: sessionToken,
        },
      });
    },
  };
}

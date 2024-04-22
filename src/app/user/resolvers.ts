import axios from "axios";
import { prismaClient } from "../../clients/db";
import JWTServices from "../../services/jwt";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../clients/redis";

const queries = {
  verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
    const resultToken = await UserService.verifyGoogleAuthToken(token);
    return resultToken;
  },

  getCurrentUser: async (parent: any, args: any, ctx: GraphqlContext) => {
    const id = ctx.user?.id;

    console.log("current uiser id", id);

    if (!id) return null;

    const user = UserService.getUserById(id);

    return user;
  },

  getUserById: async (
    parent: any,
    { id, userId }: { id: string; userId: string },
    ctx: GraphqlContext
  ) => {
    const user = await UserService.getUserById(id);

    return user;
  },
};

const extraResolvers = {
  User: {
    tweets: (parent: User) =>
      prismaClient.tweet
        .findMany({
          where: { authorId: parent.id },
          orderBy: { createdAt: "desc" },
          include: {
            likes: {
              include: { user: true },
              where: { userId: parent.id },
            },
          },
        })
        .then((tweets) =>
          tweets.map((tweet) => ({
            ...tweet,
            likeCount: tweet.likes.length, // Count of likes for each tweet
          }))
        ),

    followers: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { following: { id: parent.id } },
        include: {
          follower: true,
        },
      });
      return result.map((el) => el.follower);
    },

    following: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { follower: { id: parent.id } },
        include: {
          following: true,
        },
      });

      return result.map((el) => el.following);
    },
    recommendedUsers: async (parent: any, _: any, ctx: GraphqlContext) => {
      if (!ctx.user) return [];

      const cashedValue = await redisClient.get(
        `RECOMMENDED_USERS:${ctx.user.id}`
      );

      if (cashedValue) {
        return JSON.parse(cashedValue);
      }

      const myFollowers = await prismaClient.follows.findMany({
        where: { follower: { id: ctx.user.id } },
        include: { following: { include: { followers: true } } },
      });

      const myFollowings = await prismaClient.follows.findMany({
        where: {
          follower: { id: ctx.user.id },
        },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });

      const users: User[] = [];

      for (const followings of myFollowings) {
        for (const followingOfFollowedUser of followings.following.followers) {
          if (
            followingOfFollowedUser.following.id !== ctx.user.id &&
            myFollowings.findIndex(
              (e) => e?.followingId === followingOfFollowedUser.following.id
            ) < 0
          ) {
            users.push(followingOfFollowedUser.following);
          }
        }
      }

      await redisClient.set(
        `RECOMMENDED_USERS:${ctx.user.id}`,
        JSON.stringify(users)
      );

      return users;
    },
  },
};

const mutations = {
  followUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");
    await UserService.followUser(ctx.user.id, to);
    redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);
    return true;
  },
  unFollowUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("unauthenticated");

    await UserService.unFollowUser(ctx.user.id, to);
    redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);

    return true;
  },
};

export const resolvers = { queries, extraResolvers, mutations };

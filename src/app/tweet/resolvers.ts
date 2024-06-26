import { Tweet } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import UserService from "../../services/user";
import TweetService, { CreateTweetPayload } from "../../services/Tweet";

//keys are stored inside the env file
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});

const queries = {
  getAllTweets: (_: any, {}, ctx: GraphqlContext) =>
    TweetService.getAllTweet(1, String(ctx.user?.id)),

  getSignedURLForTweet: async (
    parent: any,
    { imageType, imageName }: { imageType: string; imageName: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("Unauthenticated");
    const allowedImageTypes = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webpack",
    ];

    if (!allowedImageTypes.includes(imageType))
      throw new Error("Unsupported Image Type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `uploads/${
        ctx.user.id
      }/tweets/${imageName}-${Date.now()}.${imageType}`,
    });

    const signedUrl = await getSignedUrl(s3Client, putObjectCommand);
    return signedUrl;
  },

  getTweetPerPage: (
    parent: any,
    { page }: { page: number },
    ctx: GraphqlContext
  ) => TweetService.getAllTweet(page, String(ctx.user?.id)),

  getLikeByUserId: (userId: string) => TweetService.getLikeByUserId(userId),
};

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");

    const tweet = await TweetService.createTweet({
      ...payload,
      userId: ctx.user.id,
    });

    return tweet;
  },

  createLike: async (
    parent: any,
    { tweetId, userId }: { tweetId: string; userId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");
    const like = await TweetService.createLike(userId as string, tweetId);

    return like;
  },
  unLike: async (
    parent: any,
    { likeId }: { likeId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");
    return TweetService.unLike(likeId);
  },
};

const extraResolvers = {
  Tweet: {
    author: (parent: Tweet) => UserService.getUserById(parent.authorId),
  },
};
export const resolvers = { mutations, extraResolvers, queries };

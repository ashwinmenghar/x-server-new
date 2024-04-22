import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";
import UserService from "./user";

export interface CreateTweetPayload {
  content: string;
  imageURL?: string;
  userId: string;
}

export interface CreateLikePayload {
  userId: string;
}
class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`
    );

    if (rateLimitFlag) return { id: "error", error: "Please wait...." };

    const newTweet = await prismaClient.tweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL,
        author: { connect: { id: data.userId } },
      },
    });

    await redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 2, 1);
    const keys = await redisClient.keys("PAGE:*");

    if (keys.length > 0) {
      for (let i = 0; i < keys.length; i++) {
        await redisClient.del(keys[i]);
      }
    }
    await redisClient.del("PAGE");

    return newTweet;
  }

  public static async getAllTweet(page: number = 1, userId: string) {
    const cachedTweets = await redisClient.get(`PAGE:${page}`);
    if (cachedTweets) {
      return JSON.parse(cachedTweets);
    }

    const limit = 10;
    const skip = (page - 1) * limit;

    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        likes: {
          include: { user: true },
          where: { userId: userId },
        },
      },
      skip: skip,
      take: limit,
    });

    const newData = [
      ...(cachedTweets ? JSON.parse(cachedTweets) : []),
      ...tweets,
    ];

    await redisClient.setex(`PAGE:${page}`, 3600, JSON.stringify(newData));
    await redisClient.set("PAGE", page);

    return tweets;
  }

  public static async createLike(userId: string, tweetId: string) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });

    if (!user) throw new Error(`User with id ${userId} not found.`);

    const likeData = await prismaClient.like.findFirst({
      where: {
        userId: userId,
        tweetId: tweetId,
      },
    });

    if (likeData) {
      return likeData;
    }

    try {
      const like = await prismaClient.like.create({
        data: {
          user: { connect: { id: userId } },
          tweet: { connect: { id: tweetId } },
        },
      });
      return like;
    } catch (error) {
      console.log(error);
    }
  }

  public static async getLikeByUserId(userId: string) {
    try {
      const like = await prismaClient.like.findMany({
        where: { userId: userId },
      });
      return like;
    } catch (error) {
      console.log(error);
    }
  }

  public static async unLike(likeId: string) {
    if (!likeId) return;
    const likeData = await prismaClient.like.delete({
      where: { id: likeId },
    });

    return likeData;
  }
}

export default TweetService;

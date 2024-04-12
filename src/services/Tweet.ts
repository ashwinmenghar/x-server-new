import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";

export interface CreateTweetPayload {
  content: string;
  imageURL?: string;
  userId: string;
}
class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`
    );

    if (rateLimitFlag) throw new Error("Please wait....");

    const newTweet = await prismaClient.tweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL,
        author: { connect: { id: data.userId } },
      },
    });

    await redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 10, 1);
    await redisClient.del("ALL_TWEETS");

    return newTweet;
  }

  public static async getAllTweet() {
    const cashedTweets = await redisClient.get("ALL_TWEETS");
    if (cashedTweets) return JSON.parse(cashedTweets);

    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
    });

    await redisClient.set("ALL_TWEETS", JSON.stringify(tweets));

    return tweets;
  }
}

export default TweetService;

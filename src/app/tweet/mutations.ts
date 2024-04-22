export const mutations = `#graphql
    createTweet(payload: CreateTweetData!): Tweet
    createLike(userId: String!, tweetId: String!): Like
    unLike(likeId: String!): Like
`;

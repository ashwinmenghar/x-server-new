export const queries = `#graphql
    getAllTweets: [Tweet]
    getSignedURLForTweet(imageName: String!, imageType: String!): String
    getTweetPerPage(page: Int!): [Tweet]
    getLikeByUserId(userId: String!): [Like]
`;

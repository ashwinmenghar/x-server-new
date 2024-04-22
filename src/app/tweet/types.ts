export const types = `#graphql

    input CreateTweetData {
        content: String!
        imageURL: String
    }

    type Tweet {
        id: ID!
        content: String!
        imageURL: String
        createdAt: String

        author: User
        likes: [Like]
    }

    input CreateLikeData {
        userId  : String!
        tweetId  : String!
    }

    type Like {
        id: ID!

        user  : User
        tweet : [Tweet]
    }
    type User {
        id: ID!
        username: String!
        email: String!

    }
`;

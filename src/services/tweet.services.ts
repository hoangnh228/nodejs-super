import { ObjectId } from 'mongodb'
import { CreateTweetRequestBody } from '~/models/requests/Tweet.requests'
import Hashtag from '~/models/schemas/Hashtag.schema'
import Tweet from '~/models/schemas/Tweet.schema'
import databaseServices from '~/services/database.services'

class TweetService {
  async checkAndCreateHashtags(hashtags: string[]) {
    const result = await Promise.all(
      hashtags.map((hashtag) => {
        return databaseServices.hashtags.findOneAndUpdate(
          { name: hashtag },
          { $setOnInsert: new Hashtag({ name: hashtag }) },
          { upsert: true, returnDocument: 'after' }
        )
      })
    )
    return result.map((doc) => doc!._id!)
  }

  async createTweet(body: CreateTweetRequestBody, user_id: string) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags)
    const insertTweet = await databaseServices.tweets.insertOne(
      new Tweet({
        user_id: new ObjectId(user_id),
        audience: body.audience,
        content: body.content,
        guest_views: 0,
        user_views: 0,
        hashtags,
        mentions: body.mentions,
        medias: body.medias,
        type: body.type,
        parent_id: body.parent_id
      })
    )

    return databaseServices.tweets.findOne({ _id: insertTweet.insertedId })
  }

  async getTweet(tweet_id: string) {
    return databaseServices.tweets.findOne({ _id: new ObjectId(tweet_id) })
  }
}

export default new TweetService()

import Like from '~/models/schemas/Like.schema'
import databaseServices from './database.services'
import { ObjectId } from 'mongodb'

export class LikeServices {
  likeTweet(user_id: string, tweet_id: string) {
    return databaseServices.likes.findOneAndUpdate(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      { $setOnInsert: new Like({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) }) },
      { upsert: true, returnDocument: 'after' }
    )
  }

  unlikeTweet(user_id: string, tweet_id: string) {
    return databaseServices.likes.findOneAndDelete({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) })
  }
}

export default new LikeServices()

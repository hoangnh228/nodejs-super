import { ObjectId } from 'mongodb'
import Bookmark from '~/models/schemas/Bookmark.schema'
import databaseServices from '~/services/database.services'

class BookmarksServices {
  bookmarkTweet(user_id: string, tweet_id: string) {
    return databaseServices.bookmarks.findOneAndUpdate(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      { $setOnInsert: new Bookmark({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) }) },
      { upsert: true, returnDocument: 'after' }
    )
  }

  unbookmarkTweet(user_id: string, tweet_id: string) {
    return databaseServices.bookmarks.findOneAndDelete({
      user_id: new ObjectId(user_id),
      tweet_id: new ObjectId(tweet_id)
    })
  }
}

export default new BookmarksServices()

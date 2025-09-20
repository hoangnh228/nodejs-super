import { ObjectId } from 'mongodb'

export interface LikeType {
  _id?: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  created_at?: Date
  updated_at?: Date
}

export default class Like {
  _id?: ObjectId
  user_id: ObjectId
  tweet_id: ObjectId
  created_at?: Date
  updated_at?: Date

  constructor(like: LikeType) {
    const date = new Date()
    this._id = like._id || new ObjectId()
    this.user_id = like.user_id
    this.tweet_id = like.tweet_id
    this.created_at = like.created_at || date
    this.updated_at = like.updated_at || date
  }
}

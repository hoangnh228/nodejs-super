import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType } from '~/constants/enum'
import { Media } from '~/models/Other'

interface TweetConstructor {
  _id?: ObjectId
  user_id: ObjectId
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | string
  hashtags: ObjectId[]
  mentions: string[]
  medias: Media[]
  guest_views?: number
  user_views?: number
  createdAt?: Date
  updatedAt?: Date
}

export default class Tweet {
  _id?: ObjectId
  user_id: ObjectId
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | ObjectId
  hashtags: ObjectId[]
  mentions: ObjectId[]
  medias: Media[]
  guest_views?: number
  user_views?: number
  createdAt?: Date
  updatedAt?: Date

  constructor(tweet: TweetConstructor) {
    const date = new Date()
    this._id = tweet._id
    this.user_id = tweet.user_id
    this.type = tweet.type
    this.audience = tweet.audience
    this.content = tweet.content
    this.parent_id = tweet.parent_id ? new ObjectId(tweet.parent_id) : null
    this.hashtags = tweet.hashtags
    this.mentions = tweet.mentions.map((mention) => new ObjectId(mention))
    this.medias = tweet.medias
    this.guest_views = tweet.guest_views || 0
    this.user_views = tweet.user_views || 0
    this.createdAt = tweet.createdAt || date
    this.updatedAt = tweet.updatedAt || date
  }
}

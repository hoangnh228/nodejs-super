import { ObjectId } from 'mongodb'

export interface HashtagType {
  _id?: ObjectId
  name: string
  created_at?: Date
  updated_at?: Date
}

export default class Hashtag {
  _id?: ObjectId
  name: string
  created_at?: Date
  updated_at?: Date

  constructor(hashtag: HashtagType) {
    const date = new Date()
    this._id = hashtag._id || new ObjectId()
    this.name = hashtag.name
    this.created_at = hashtag.created_at || date
    this.updated_at = hashtag.updated_at || date
  }
}

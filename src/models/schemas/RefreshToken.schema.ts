import { ObjectId } from 'mongodb'

interface RefreshTokenType {
  _id?: ObjectId
  user_id: ObjectId
  token: string
  iat: number
  exp: number
  created_at?: Date
  updated_at?: Date
}

export default class RefreshToken {
  _id?: ObjectId
  user_id: ObjectId
  token: string
  iat: Date
  exp: Date
  created_at: Date
  updated_at: Date

  constructor(refreshToken: RefreshTokenType) {
    this._id = refreshToken._id
    this.user_id = refreshToken.user_id
    this.token = refreshToken.token
    this.iat = new Date(refreshToken.iat * 1000) // convert Epoch time to Date
    this.exp = new Date(refreshToken.exp * 1000)
    this.created_at = refreshToken.created_at || new Date()
    this.updated_at = refreshToken.updated_at || new Date()
  }
}

import { TokenType } from '~/constants/enum'
import type { SignOptions } from 'jsonwebtoken'
import { RegisterRequestBody } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import databaseServices from '~/services/database.services'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import { USER_MESSAGES } from '~/constants/messages'
dotenv.config()

class UsersService {
  private signAccessToken(userId: string) {
    return signToken({
      payload: { user_id: userId, token_type: TokenType.AccessToken },
      options: {
        expiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as SignOptions['expiresIn']
      }
    })
  }

  private signRefreshToken(userId: string) {
    return signToken({
      payload: { user_id: userId, token_type: TokenType.RefreshToken },
      options: {
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn']
      }
    })
  }

  private async signTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([this.signAccessToken(userId), this.signRefreshToken(userId)])

    return {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  }

  async login(userId: string) {
    const tokens = await this.signTokens(userId)
    databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(userId), token: tokens.refresh_token })
    )
    return tokens
  }

  async register(payload: RegisterRequestBody) {
    const user = await databaseServices.users.insertOne(
      new User({ ...payload, date_of_birth: new Date(payload.date_of_birth), password: hashPassword(payload.password) })
    )

    const userId = user.insertedId.toString()
    const tokens = await this.signTokens(userId)
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(userId), token: tokens.refresh_token })
    )

    return tokens
  }

  async checkEmailExists(email: string) {
    return !!(await databaseServices.users.findOne({ email }))
  }

  async logout(refreshToken: string) {
    const result = await databaseServices.refreshTokens.deleteOne({ token: refreshToken })
    console.log(result)
    return {
      message: USER_MESSAGES.LOGOUT_SUCCESS
    }
  }
}

export default new UsersService()

import { TokenType } from '~/constants/enum'
import type { SignOptions } from 'jsonwebtoken'
import { RegisterRequestBody } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import databaseServices from '~/services/database.services'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'

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

  async register(payload: RegisterRequestBody) {
    const user = await databaseServices.users.insertOne(
      new User({ ...payload, date_of_birth: new Date(payload.date_of_birth), password: hashPassword(payload.password) })
    )

    const userId = user.insertedId.toString()
    const [accessToken, refreshToken] = await Promise.all([this.signAccessToken(userId), this.signRefreshToken(userId)])

    return {
      accessToken,
      refreshToken
    }
  }

  async checkEmailExists(email: string) {
    return !!(await databaseServices.users.findOne({ email }))
  }
}

export default new UsersService()

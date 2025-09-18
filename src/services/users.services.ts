import { TokenType, UserVerifyStatus } from '~/constants/enum'
import type { SignOptions } from 'jsonwebtoken'
import { RegisterRequestBody, ResetPasswordRequestBody } from '~/models/requests/User.requests'
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
  private signAccessToken({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    return this.signTokens(
      userId,
      verify,
      TokenType.AccessToken,
      process.env.JWT_SECRET_ACCESS_TOKEN as string,
      (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as SignOptions['expiresIn']
    )
  }

  private signRefreshToken({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    return this.signTokens(
      userId,
      verify,
      TokenType.RefreshToken,
      process.env.JWT_SECRET_REFRESH_TOKEN as string,
      (process.env.REFRESH_TOKEN_EXPIRES_IN || '30d') as SignOptions['expiresIn']
    )
  }

  private signEmailVerifyToken({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    return this.signTokens(
      userId,
      verify,
      TokenType.EmailVerifyToken,
      process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      (process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn']
    )
  }

  private signForgotPasswordToken({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    return this.signTokens(
      userId,
      verify,
      TokenType.ForgotPasswordToken,
      process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      (process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn']
    )
  }

  private signTokens(
    userId: string,
    verify: UserVerifyStatus,
    tokenType: TokenType,
    privateKey: string,
    expiresIn: SignOptions['expiresIn']
  ) {
    return signToken({
      payload: { user_id: userId, verify: verify, token_type: tokenType },
      privateKey: privateKey,
      options: {
        expiresIn: expiresIn
      }
    })
  }

  private async signAccessAndRefreshTokens({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken({ userId, verify }),
      this.signRefreshToken({ userId, verify })
    ])

    return {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  }

  async login({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    const tokens = await this.signAccessAndRefreshTokens({ userId, verify })
    databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(userId), token: tokens.refresh_token })
    )
    return tokens
  }

  async register(payload: RegisterRequestBody) {
    const userId = new ObjectId().toString()
    const emailVerifyToken = await this.signEmailVerifyToken({ userId, verify: UserVerifyStatus.Unverified })
    await databaseServices.users.insertOne(
      new User({
        ...payload,
        _id: new ObjectId(userId),
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password),
        email_verify_token: emailVerifyToken
      })
    )

    const tokens = await this.signAccessAndRefreshTokens({ userId, verify: UserVerifyStatus.Unverified })
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(userId), token: tokens.refresh_token })
    )
    console.log('emailVerifyToken', emailVerifyToken)
    return tokens
  }

  async checkEmailExists(email: string) {
    return !!(await databaseServices.users.findOne({ email }))
  }

  async logout(refreshToken: string) {
    return await databaseServices.refreshTokens.deleteOne({ token: refreshToken })
  }

  async verifyEmail(userId: string) {
    const [tokens] = await Promise.all([
      this.signAccessAndRefreshTokens({ userId, verify: UserVerifyStatus.Verified }),
      databaseServices.users.updateOne(
        { _id: new ObjectId(userId) },
        [{ $set: { verify: UserVerifyStatus.Verified, email_verify_token: '', updated_at: '$$NOW' } }]
        // { $set: { verify: UserVerifyStatus.Verified, email_verify_token: '' }, $currentDate: { updated_at: true } }
      )
    ])

    return tokens
  }

  async resendVerifyEmail(userId: string) {
    const emailVerifyToken = await this.signEmailVerifyToken({ userId, verify: UserVerifyStatus.Unverified })
    await databaseServices.users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { email_verify_token: emailVerifyToken }, $currentDate: { updated_at: true } }
    )
    console.log('emailVerifyToken', emailVerifyToken)
    return { message: USER_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS }
  }

  async forgotPassword({ userId, verify }: { userId: string; verify: UserVerifyStatus }) {
    const forgotPasswordToken = await this.signForgotPasswordToken({ userId, verify })
    await databaseServices.users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { forgot_password_token: forgotPasswordToken }, $currentDate: { updated_at: true } }
    )
    console.log('forgotPasswordToken', forgotPasswordToken)
    return { message: USER_MESSAGES.FORGOT_PASSWORD_SUCCESS }
  }

  async resetPassword(userId: string, password: string) {
    await databaseServices.users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashPassword(password), forgot_password_token: '' }, $currentDate: { updated_at: true } }
    )
    return { message: USER_MESSAGES.RESET_PASSWORD_SUCCESS }
  }

  async getMe(userId: string) {
    return await databaseServices.users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
  }
}

export default new UsersService()

import User from '~/models/schemas/User.schema'
import { JwtPayload } from 'jsonwebtoken'

declare module 'express' {
  interface Request {
    user?: User
    decoded_authorization?: JwtPayload
    decoded_refresh_token?: JwtPayload
    decoded_email_verify_token?: JwtPayload
    decoded_forgot_password_token?: JwtPayload
  }
}

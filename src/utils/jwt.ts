import { JwtPayload, SignOptions, sign, verify } from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayload } from '~/models/requests/User.requests'
dotenv.config()

export const signToken = ({
  payload,
  privateKey = process.env.JWT_SECRET as string,
  options = { algorithm: 'HS256' }
}: {
  payload: string | Buffer | object
  privateKey?: string
  options?: SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    sign(payload, privateKey, options, (err, token) => {
      if (err) throw reject(err)
      resolve(token as string)
    })
  })
}

export const verifyToken = ({
  token,
  publicKey = process.env.JWT_SECRET as string
}: {
  token: string
  publicKey?: string
}) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    verify(token, publicKey, (err, decoded) => {
      if (err) throw reject(err)
      resolve(decoded as TokenPayload)
    })
  })
}

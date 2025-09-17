import { SignOptions, sign, verify } from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayload } from '~/models/requests/User.requests'
dotenv.config()

export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | Buffer | object
  privateKey?: string
  options?: SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    sign(payload, privateKey as string, options, (err, token) => {
      if (err) throw reject(err)
      resolve(token as string)
    })
  })
}

export const verifyToken = ({ token, scretOrPublicKey }: { token: string; scretOrPublicKey?: string }) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    verify(token, scretOrPublicKey as string, (err, decoded) => {
      if (err) throw reject(err)
      resolve(decoded as TokenPayload)
    })
  })
}

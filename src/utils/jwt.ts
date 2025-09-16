import { SignOptions, sign } from 'jsonwebtoken'

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
      if (err) reject(err)
      resolve(token as string)
    })
  })
}

import { NextFunction, Request, Response } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { JsonWebTokenError, JwtPayload } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/messages'
import { usernameRegex } from '~/constants/regex'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/User.requests'
import databaseServices from '~/services/database.services'
import usersServices from '~/services/users.services'
import { hashPassword } from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

const passwordSchema: ParamSchema = {
  isLength: {
    options: { min: 6, max: 50 },
    errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS
  },
  isString: { errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_A_STRING },
  notEmpty: { errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED },
  errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
}

const confirmPasswordSchema: ParamSchema = {
  isLength: {
    options: { min: 6, max: 50 },
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS
  },
  isString: { errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING },
  notEmpty: { errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED },
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.password) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      return true
    }
  },
  errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
}

const forgotPasswordTokenSchema: ParamSchema = {
  trim: true,
  custom: {
    options: async (value, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }

      try {
        const decoded = await verifyToken({
          token: value,
          scretOrPublicKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        })
        const { user_id } = decoded as JwtPayload
        const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id as string) })

        if (user === null) {
          throw new ErrorWithStatus({
            message: USER_MESSAGES.USER_NOT_FOUND,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }

        if (user.forgot_password_token !== value) {
          throw new ErrorWithStatus({
            message: USER_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID,
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }

        ;(req as Request).decoded_forgot_password_token = decoded
      } catch (error) {
        if (error instanceof JsonWebTokenError) {
          throw new ErrorWithStatus({
            message: capitalize(error.message),
            status: HTTP_STATUS.UNAUTHORIZED
          })
        }

        throw error
      }

      return true
    }
  }
}

const nameSchema: ParamSchema = {
  isLength: { options: { min: 1, max: 100 } },
  isString: { errorMessage: USER_MESSAGES.NAME_MUST_BE_A_STRING },
  notEmpty: { errorMessage: USER_MESSAGES.NAME_IS_REQUIRED },
  trim: true,
  errorMessage: USER_MESSAGES.NAME_MUST_BE_FROM_1_TO_100_CHARACTERS
}

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: { strict: true, strictSeparator: true },
    errorMessage: USER_MESSAGES.DATE_OF_BIRTH_MUST_BE_A_DATE
  },
  notEmpty: { errorMessage: USER_MESSAGES.DATE_OF_BIRTH_IS_REQUIRED },
  errorMessage: USER_MESSAGES.DATE_OF_BIRTH_IS_REQUIRED
}

const imageUrlSchema: ParamSchema = {
  optional: true,
  isString: { errorMessage: USER_MESSAGES.IMAGE_URL_MUST_BE_A_STRING },
  trim: true,
  isLength: { options: { min: 1, max: 400 }, errorMessage: USER_MESSAGES.IMAGE_URL_LENGTH }
}

const followedUserIdSchema: ParamSchema = {
  custom: {
    options: async (value, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.INVALID_USER_ID,
          status: HTTP_STATUS.NOT_FOUND
        })
      }

      const user = await databaseServices.users.findOne({ _id: new ObjectId(value as ObjectId) })
      if (user === null) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.USER_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND
        })
      }
    }
  }
}

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
        notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseServices.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })
            if (user === null) {
              throw new Error(USER_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)
            }

            req.user = user
            return true
          }
        }
      },
      password: passwordSchema
    },
    ['body']
  )
)

export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
        notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
        custom: {
          options: async (value) => {
            if (await usersServices.checkEmailExists(value)) {
              throw new Error(USER_MESSAGES.EMAIL_ALREADY_EXISTS)
            }
            return true
          }
        }
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            const accessToken = (value || '').split(' ')[1]
            if (!accessToken) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decoded = await verifyToken({
                token: accessToken,
                scretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              ;(req as Request).decoded_authorization = decoded
            } catch (error) {
              if (error) {
                throw new ErrorWithStatus({
                  message: capitalize((error as JsonWebTokenError).message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }

              throw error
            }

            return true
          }
        }
      }
    },
    ['headers']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.REFRESH_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const [decoded, refreshToken] = await Promise.all([
                verifyToken({
                  token: value,
                  scretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
                }) as Promise<JwtPayload>,
                databaseServices.refreshTokens.findOne({ token: value })
              ])

              if (refreshToken === null) {
                throw new ErrorWithStatus({
                  message: USER_MESSAGES.REFRESH_TOKEN_DOES_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              ;(req as Request).decoded_refresh_token = decoded
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }

              throw error
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decoded = await verifyToken({
                token: value,
                scretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })

              ;(req as Request).decoded_email_verify_token = decoded
            } catch (error) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
        notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseServices.users.findOne({ email: value })
            if (user === null) {
              throw new Error(USER_MESSAGES.USER_NOT_FOUND)
            }
            req.user = user
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const verifyForgotPasswordValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordTokenSchema
    },
    ['body']
  )
)

export const resetPasswordValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordTokenSchema,
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)

export const verifyUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const { verify } = req.decoded_authorization as TokenPayload
  if (verify !== UserVerifyStatus.Verified) {
    return next(
      new ErrorWithStatus({
        message: USER_MESSAGES.USER_NOT_VERIFIED,
        status: HTTP_STATUS.FORBIDDEN
      })
    )
  }
  next()
}

export const updateMeValidator = validate(
  checkSchema(
    {
      name: { ...nameSchema, optional: true, notEmpty: undefined },
      date_of_birth: { ...dateOfBirthSchema, optional: true },
      bio: {
        optional: true,
        isString: { errorMessage: USER_MESSAGES.BIO_MUST_BE_A_STRING },
        trim: true,
        isLength: { options: { min: 1, max: 250 }, errorMessage: USER_MESSAGES.BIO_LENGTH }
      },
      location: {
        optional: true,
        isString: { errorMessage: USER_MESSAGES.LOCATION_MUST_BE_A_STRING },
        trim: true,
        isLength: { options: { min: 1, max: 250 }, errorMessage: USER_MESSAGES.LOCATION_LENGTH }
      },
      website: {
        optional: true,
        isString: { errorMessage: USER_MESSAGES.WEBSITE_MUST_BE_A_STRING },
        trim: true,
        isLength: { options: { min: 1, max: 200 }, errorMessage: USER_MESSAGES.WEBSITE_LENGTH }
      },
      username: {
        optional: true,
        isString: { errorMessage: USER_MESSAGES.USERNAME_MUST_BE_A_STRING },
        trim: true,
        custom: {
          options: async (value) => {
            if (!usernameRegex.test(value)) {
              throw new Error(USER_MESSAGES.USERNAME_IS_INVALID)
            }

            const user = await databaseServices.users.findOne({ username: value })
            if (user) {
              throw new Error(USER_MESSAGES.USERNAME_ALREADY_EXISTS)
            }
            return true
          }
        }
      },
      avatar: imageUrlSchema,
      cover_photo: imageUrlSchema
    },
    ['body']
  )
)

export const followUserValidator = validate(
  checkSchema(
    {
      followed_user_id: followedUserIdSchema
    },
    ['body']
  )
)

export const unfollowUserValidator = validate(
  checkSchema(
    {
      followed_user_id: followedUserIdSchema
    },
    ['params']
  )
)

export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: {
        ...passwordSchema,
        custom: {
          options: async (value, { req }) => {
            const { user_id } = req.decoded_authorization as TokenPayload
            const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
            if (!user) {
              throw new ErrorWithStatus({ message: USER_MESSAGES.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
            }

            if (user.password !== hashPassword(value)) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.OLD_PASSWORD_IS_INCORRECT,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        }
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)

export const isUserLoggedInValidator = (middleware: (req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return middleware(req, res, next)
    }
    return next()
  }
}

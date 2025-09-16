import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { ErrorWithStatus } from '~/models/Errors'
import usersServices from '~/services/users.services'
import { validate } from '~/utils/validation'

export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  next()
}

export const registerValidator = validate(
  checkSchema({
    name: {
      isLength: { options: { min: 1, max: 100 } },
      isString: true,
      notEmpty: true,
      trim: true,
      errorMessage: 'Name must be between 1 and 100 characters'
    },
    email: {
      isEmail: true,
      notEmpty: true,
      trim: true,
      errorMessage: 'Email is required',
      custom: {
        options: async (value) => {
          if (await usersServices.checkEmailExists(value)) {
            throw new Error('Email already exists')
          }
          return true
        }
      }
    },
    password: {
      isLength: { options: { min: 6, max: 50 } },
      isString: true,
      notEmpty: true,
      errorMessage: 'Password is required'
    },
    confirm_password: {
      isLength: { options: { min: 6, max: 50 } },
      isString: true,
      notEmpty: true,
      custom: {
        options: (value, { req }) => {
          if (value !== req.body.password) {
            throw new ErrorWithStatus({ message: 'Password and confirm password must be the same', status: 400 })
          }
          return true
        }
      },
      errorMessage: 'Confirm password is required'
    },
    date_of_birth: {
      isISO8601: {
        options: { strict: true, strictSeparator: true }
      },
      notEmpty: true,
      errorMessage: 'Date of birth is required'
    }
  })
)

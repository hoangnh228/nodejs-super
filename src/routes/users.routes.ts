import { Router } from 'express'
import {
  loginValidator,
  registerValidator,
  accessTokenValidator,
  refreshTokenValidator
} from '~/middlewares/users.middlewares'
import { loginController, logoutController, registerController } from '~/controllers/users.controllers'
import { wrapRequestHandler } from '~/utils/handlers'
import { USER_MESSAGES } from '~/constants/messages'

const usersRouter = Router()

/**
 * Description: Login a user
 * Path: /login
 * Method: POST
 * Body: { email, password }
 * Response: { message: 'Register successfully', data: result }
 * Error: { message: 'Login failed', error }
 */
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: { name, email, password, confirm_password, date_of_birth }
 * Response: { message: 'Register successfully', data: result }
 * Error: { message: 'Register failed', error }
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Description: Logout a user
 * Path: /logout
 * Method: POST
 * Body: { refresh_token }
 * Response: { message: 'Logout successfully', data: result }
 * Error: { message: 'Logout failed', error }
 */
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

export default usersRouter

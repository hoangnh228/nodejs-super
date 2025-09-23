import { Server } from 'socket.io'
import { ObjectId } from 'mongodb'
import Conversation from '~/models/schemas/Conversation.schema'
import { verifyAccessToken } from '~/utils/commons'
import { USER_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.requests'
import { UserVerifyStatus } from '~/constants/enum'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import databaseServices from '~/services/database.services'
import { Server as HttpServer } from 'http'

const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000'
    }
  })
  const users: { [key: string]: { socket_id: string } } = {}

  io.use(async (socket, next) => {
    const { Authorization } = socket.handshake.auth
    const accessToken = (Authorization || '').split(' ')[1]
    try {
      const decoded = await verifyAccessToken(accessToken)
      const { verify } = decoded as TokenPayload

      if (verify !== UserVerifyStatus.Verified) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.USER_NOT_VERIFIED,
          status: HTTP_STATUS.FORBIDDEN
        })
      }
      socket.handshake.auth.decoded_authorization = decoded
      socket.handshake.auth.access_token = accessToken
      next()
    } catch (error) {
      next({
        message: USER_MESSAGES.ACCESS_TOKEN_IS_INVALID,
        name: 'UnauthorizedError',
        data: error
      })
    }
  })

  io.on('connection', (socket) => {
    console.log(`user ${socket.id} connected`)
    const user_id = socket.handshake.auth.decoded_authorization.user_id as string
    users[user_id] = { socket_id: socket.id }

    socket.use(async (packet, next) => {
      const { access_token } = socket.handshake.auth
      try {
        await verifyAccessToken(access_token)
        next()
      } catch (error) {
        next(new Error('Unauthorized'))
      }
    })

    socket.on('error', (error) => {
      if (error.message === 'Unauthorized') {
        socket.disconnect()
      }
    })

    socket.on('send_message', async (data) => {
      const { receiver_id, sender_id, content } = data
      const receiver_socket_id = users[receiver_id].socket_id
      const conversation = new Conversation({
        sender_id: new ObjectId(sender_id as string),
        receiver_id: new ObjectId(receiver_id as string),
        content: content
      })

      const result = await databaseServices.conversations.insertOne(conversation)
      conversation._id = result.insertedId

      if (receiver_socket_id) {
        socket.to(receiver_socket_id).emit('receive_message', {
          payload: conversation
        })
      }
    })

    socket.on('disconnect', () => {
      delete users[user_id]
      console.log(`user ${socket.id} disconnected`)
    })
  })
}

export default initSocket

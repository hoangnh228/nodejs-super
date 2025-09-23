import { ObjectId } from 'mongodb'
import databaseServices from '~/services/database.services'

class ConversationsServices {
  async getConversations({
    senderId,
    receiverId,
    limit,
    page
  }: {
    senderId: string
    receiverId: string
    limit: number
    page: number
  }) {
    const match = {
      $or: [
        { sender_id: new ObjectId(senderId), receiver_id: new ObjectId(receiverId) },
        { sender_id: new ObjectId(receiverId), receiver_id: new ObjectId(senderId) }
      ]
    }

    const conversations = await databaseServices.conversations
      .find(match)
      .skip(limit * (page - 1))
      .limit(limit)
      .toArray()

    const total = await databaseServices.conversations.countDocuments(match)

    return { conversations, total }
  }
}

export default new ConversationsServices()

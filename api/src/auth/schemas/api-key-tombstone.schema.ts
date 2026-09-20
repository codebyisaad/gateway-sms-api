import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type ApiKeyTombstoneDocument = ApiKeyTombstone & Document

@Schema({ timestamps: true })
export class ApiKeyTombstone {
  _id?: Types.ObjectId

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    unique: true,
    index: true,
  })
  apiKeyId: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId: User | Types.ObjectId

  @Prop({ type: Date, required: true })
  deletedAt: Date

  // The key document as it stood at deletion time.
  @Prop({ type: SchemaTypes.Mixed })
  apiKey?: Record<string, any>
}

export const ApiKeyTombstoneSchema =
  SchemaFactory.createForClass(ApiKeyTombstone)

ApiKeyTombstoneSchema.index({ userId: 1, deletedAt: -1 })

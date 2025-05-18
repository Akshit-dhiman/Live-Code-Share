import mongoose, { Schema, model, models } from "mongoose"

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
})

export default models.User || model("User", UserSchema)

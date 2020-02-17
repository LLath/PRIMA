import { Schema, model } from "mongoose";

const levelSchema = new Schema(
  {
    scaleY: Number,
    scaleX: Number,
    translateY: Number,
    translateX: Number,
    powerUP: {
      required: false,
      type: { name: String, color: { type: String, required: false } }
    },
    color: { required: false, type: String }
  },
  { timestamps: true, collection: "level" }
);

export default model("Level", levelSchema);

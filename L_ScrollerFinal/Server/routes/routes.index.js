import express from "express";

import levelSchema from "../model/model.level";

const router = express.Router();

// router.use("/", getLevel);

// function getLevel() {
router.get("/", async (req, res, next) => {
  console.log("GET Route /");
  try {
    let result = await levelSchema.find();
    res.status(200).send(result);
    console.log(`Found ${Object.keys(result).length} entries`);
  } catch (error) {
    next(error);
  }
  console.log("End GET Route /");
});

// Post an array of Artifacts to DB
router.post("/post", async (req, res, next) => {
  const body = req.body;
  console.log("POST Route /level/post");
  await body.map(async v => {
    levelSchema.create({ ...v }, error => {
      if (error) {
        Logger.error(error);
        res.status(400).send(error);
      }
    });
  });
  console.log(`DB got ${body.length} new entry`);
  res.status(200).send("OK");

  console.log("End POST Route /artifact/post");
});
// }

export default router;

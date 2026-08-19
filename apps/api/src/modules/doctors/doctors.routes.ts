import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import * as doctorsService from "./doctors.service";

export const doctorsRouter = Router();
doctorsRouter.use(authenticate);

doctorsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await doctorsService.listDoctors());
  }),
);

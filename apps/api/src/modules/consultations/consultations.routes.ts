import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import * as consultationsService from "./consultations.service";

export const consultationsRouter = Router();
consultationsRouter.use(authenticate);

consultationsRouter.get(
  "/:queueEntryId",
  asyncHandler(async (req, res) => {
    res.json(await consultationsService.getConsultation(req.params.queueEntryId));
  }),
);

const upsertSchema = z.object({
  diagnosis: z.string().optional(),
  medicalNotes: z.string().optional(),
  prescription: z.string().optional(),
  recommendations: z.string().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
});

consultationsRouter.patch(
  "/:queueEntryId",
  authorize("DOCTOR"),
  asyncHandler(async (req, res) => {
    const input = upsertSchema.parse(req.body);
    const consultation = await consultationsService.upsertConsultation(
      req.params.queueEntryId,
      req.user!.sub,
      {
        ...input,
        followUpDate:
          input.followUpDate === undefined
            ? undefined
            : input.followUpDate === null
              ? null
              : new Date(input.followUpDate),
      },
    );
    res.json(consultation);
  }),
);

import http from "node:http";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { initSocketServer } from "./realtime/socket-server";
import { authRouter } from "./modules/auth/auth.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { patientsRouter } from "./modules/patients/patients.routes";
import { servicesRouter } from "./modules/services/services.routes";
import { doctorsRouter } from "./modules/doctors/doctors.routes";
import { queueRouter } from "./modules/queue/queue.routes";
import { consultationsRouter } from "./modules/consultations/consultations.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { usersRouter } from "./modules/users/users.routes";
import { statisticsRouter } from "./modules/statistics/statistics.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/auth", authRouter);
app.use("/", profileRouter);
app.use("/patients", patientsRouter);
app.use("/services", servicesRouter);
app.use("/doctors", doctorsRouter);
app.use("/queue", queueRouter);
app.use("/consultations", consultationsRouter);
app.use("/notifications", notificationsRouter);
app.use("/users", usersRouter);
app.use("/statistics", statisticsRouter);

app.use(errorHandler);

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Anora Med Farm API listening on port ${env.port}`);
});

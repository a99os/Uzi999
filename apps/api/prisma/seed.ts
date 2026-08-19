import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roleNames = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "MANAGER"] as const;
  const roles = new Map<string, string>();
  for (const name of roleNames) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    roles.set(name, role.id);
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      firstName: "Aziza",
      lastName: "Yusupova",
      username: "admin",
      email: "admin@anoramedfarm.uz",
      passwordHash,
      roles: { create: [{ roleId: roles.get("ADMIN")! }] },
    },
  });

  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      firstName: "Malika",
      lastName: "Tosheva",
      username: "manager",
      email: "cashier@anoramedfarm.uz",
      passwordHash,
      roles: { create: [{ roleId: roles.get("MANAGER")! }] },
    },
  });

  const superAdminPassword = crypto.randomBytes(12).toString("base64url");
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);
  const existingSuperAdmin = await prisma.user.findUnique({ where: { username: "owner" } });
  const superAdmin = await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      firstName: "Anora",
      lastName: "Owner",
      username: "owner",
      passwordHash: superAdminPasswordHash,
      roles: { create: [{ roleId: roles.get("SUPER_ADMIN")! }] },
    },
  });

  const doctorSeeds = [
    { firstName: "Aziz", lastName: "Karimov", specialization: "Cardiology" },
    { firstName: "Dilnoza", lastName: "Usmanova", specialization: "Neurology" },
    { firstName: "Bekzod", lastName: "Rasulov", specialization: "General Practice" },
  ];

  for (const d of doctorSeeds) {
    const username = `${d.firstName.toLowerCase()}.${d.lastName.toLowerCase()}`;
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        firstName: d.firstName,
        lastName: d.lastName,
        username,
        email: `${username}@anoramedfarm.uz`,
        passwordHash,
        roles: { create: [{ roleId: roles.get("DOCTOR")! }] },
        doctorProfile: {
          create: {
            specialization: d.specialization,
            workingSchedule: {
              mon: ["09:00-13:00", "14:00-18:00"],
              tue: ["09:00-13:00", "14:00-18:00"],
              wed: ["09:00-13:00", "14:00-18:00"],
              thu: ["09:00-13:00", "14:00-18:00"],
              fri: ["09:00-13:00", "14:00-18:00"],
            },
          },
        },
      },
    });
  }

  const serviceSeeds = [
    { name: "General Consultation", category: "Consultation", price: 10, icon: "stethoscope" },
    { name: "Cardiology Consultation", category: "Consultation", price: 20, icon: "heart-pulse" },
    { name: "Neurology Consultation", category: "Consultation", price: 25, icon: "brain" },
    { name: "Ultrasound", category: "Diagnostics", price: 15, icon: "radar" },
    { name: "ECG", category: "Diagnostics", price: 10, icon: "activity" },
    { name: "Blood Test", category: "Lab", price: 8, icon: "droplet" },
  ];

  for (const s of serviceSeeds) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.service.create({ data: s });
  }

  const patientSeeds = [
    { firstName: "Anvar", lastName: "Aliyev", birthYear: 1998, phone: "+998901234567" },
    { firstName: "Sarah", lastName: "Jenkins", birthYear: 1985, phone: "+998901112233" },
    { firstName: "Jasur", lastName: "Nazarov", birthYear: 1992, phone: "+998907654321" },
  ];

  for (const p of patientSeeds) {
    const existing = await prisma.patient.findFirst({
      where: { firstName: p.firstName, lastName: p.lastName, birthYear: p.birthYear },
    });
    if (!existing) await prisma.patient.create({ data: p });
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${admin.username} / password123`);
  console.log(`Manager login: ${manager.username} / password123`);
  console.log("Doctor logins: aziz.karimov / dilnoza.usmanova / bekzod.rasulov / password123");
  if (!existingSuperAdmin) {
    console.log(`Super Admin login: ${superAdmin.username} / ${superAdminPassword}  (save this — shown only once)`);
  } else {
    console.log(`Super Admin login: ${superAdmin.username} / (unchanged, already existed)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

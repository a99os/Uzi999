import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/error-handler";

export async function listServices(opts: { activeOnly?: boolean; category?: string } = {}) {
  return prisma.service.findMany({
    where: {
      ...(opts.activeOnly ? { isActive: true } : {}),
      ...(opts.category ? { category: opts.category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createService(input: {
  name: string;
  category: string;
  price: number;
  icon?: string;
}) {
  return prisma.service.create({ data: input });
}

export async function updateService(
  id: string,
  input: Partial<{ name: string; category: string; price: number; icon: string; isActive: boolean }>,
) {
  return prisma.service.update({ where: { id }, data: input });
}

export async function deleteService(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new HttpError(404, "Service not found");
  // Past visits keep their totalPrice (a stored snapshot), they just lose
  // this one line item from their displayed service breakdown.
  await prisma.$transaction([
    prisma.queueEntryService.deleteMany({ where: { serviceId: id } }),
    prisma.service.delete({ where: { id } }),
  ]);
}

// Every admin mutation writes one of these — before/after are raw snapshots
// (or null for create/delete-style actions where one side doesn't exist).
export async function writeAuditLog(prisma, { adminId, action, targetType, targetId, before = null, after = null }) {
  await prisma.auditLog.create({
    data: { adminId, action, targetType, targetId, before, after },
  });
}

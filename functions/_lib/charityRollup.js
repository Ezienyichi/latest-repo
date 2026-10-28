// Charity-level "raised" is DERIVED from its Projects, never stored: a second
// copy of the number on CharityProfile would drift the moment a project's
// raisedAmount changed without the charity row being updated too. These
// helpers are the single read path for it. Only APPROVED campaigns count: a
// pending/rejected submission never contributes to a public total.
//
// CharityProfile.raised (legacy stored column) is intentionally left alone so
// nothing that still reads it breaks; new code should use these instead.

const toNumber = (d) => (d == null ? 0 : Number(d));

export async function getCharityRaised(prisma, charityId) {
  const agg = await prisma.project.aggregate({ where: { charityId, submissionStatus: 'APPROVED' }, _sum: { raisedAmount: true } });
  return toNumber(agg._sum.raisedAmount);
}

// Batch form for list pages — one grouped query instead of N. Charities with
// no projects are present in the map with 0.
export async function getCharityRaisedMap(prisma, charityIds) {
  const rows = await prisma.project.groupBy({
    by: ['charityId'],
    where: { charityId: { in: charityIds }, submissionStatus: 'APPROVED' },
    _sum: { raisedAmount: true },
  });
  const map = Object.fromEntries(charityIds.map(id => [id, 0]));
  for (const r of rows) map[r.charityId] = toNumber(r._sum.raisedAmount);
  return map;
}

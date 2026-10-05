const PAGE_SIZE = 500

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null
    error: { message: string } | null
  }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    if (!data) throw new Error('History request returned no data')
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

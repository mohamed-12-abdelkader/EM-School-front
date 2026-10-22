export type ActiveFilter = 'all' | 'active' | 'inactive';

export type EntityStatus = 'active' | 'inactive' | 'deleted';

export function entityStatus(input: {
  is_active: boolean;
  deleted_at?: string | null;
}): EntityStatus {
  if (input.deleted_at) return 'deleted';
  return input.is_active ? 'active' : 'inactive';
}

export function activeFilterToParam(filter: ActiveFilter): boolean | undefined {
  if (filter === 'active') return true;
  if (filter === 'inactive') return false;
  return undefined;
}

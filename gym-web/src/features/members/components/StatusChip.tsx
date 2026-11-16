import Chip from '@mui/material/Chip';
import { STATUS_META } from '../constants';
import type { MemberStatus } from '../types';

export function StatusChip({ status }: { status: MemberStatus }) {
  const meta = STATUS_META[status];
  return <Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 600 }} />;
}

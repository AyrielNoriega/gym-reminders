import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_META } from '../constants';
import type { MemberStatus } from '../types';

const ORDER: MemberStatus[] = ['activo', 'por_vencer', 'vencido'];

export function MemberStats({ counts }: { counts: Record<MemberStatus, number> }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      {ORDER.map((status) => (
        <Card
          key={status}
          sx={{ flex: 1, borderTop: 4, borderTopColor: `${STATUS_META[status].color}.main` }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {STATUS_META[status].label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {counts[status]}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

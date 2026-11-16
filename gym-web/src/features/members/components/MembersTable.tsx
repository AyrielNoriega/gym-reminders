import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Member } from "../types";
import { formatDate, formatDaysLeft } from "../utils/format";
import { StatusChip } from "./StatusChip";

export function MembersTable({ members }: { members: Member[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Último pago</TableCell>
            <TableCell>Vence</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Aviso por correo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.email} hover>
              <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell sx={{ textTransform: "capitalize" }}>
                {m.plan}
              </TableCell>
              <TableCell>{formatDate(m.lastPaymentAt)}</TableCell>
              <TableCell>
                {formatDate(m.expiresAt)}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {formatDaysLeft(m.daysLeft)}
                </Typography>
              </TableCell>
              <TableCell>
                <StatusChip status={m.status} />
              </TableCell>
              <TableCell>{m.lastNotice ? "✉️ Enviado" : "—"}</TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                align="center"
                sx={{ py: 4, color: "text.secondary" }}
              >
                Todavía no hay afiliados. Usa “Agregar miembro”.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

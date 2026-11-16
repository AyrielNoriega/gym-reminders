import { useState } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { STATUS_META } from "../constants";
import { useMembers } from "../hooks/useMembers";
import type { RegisterMemberResponse } from "../types";
import { formatDate } from "../utils/format";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberStats } from "./MemberStats";
import { MembersTable } from "./MembersTable";

const EMPTY_COUNTS = { activo: 0, por_vencer: 0, vencido: 0 };

export function MembersPage() {
  const { data, isFetching, error, refetch } = useMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // La lista se refresca sola: useRegisterMember invalida la query 'members'
  function handleCreated({ message, member }: RegisterMemberResponse) {
    setDialogOpen(false);
    setToast(
      `${message}: ${member.name} · vence el ${formatDate(member.expiresAt)} (${STATUS_META[member.status].label})`,
    );
  }

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            🏋️ Gimnasio El Barrio · Afiliados
          </Typography>
          {data && (
            <Typography variant="body2">
              Hoy: {formatDate(data.today)}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <MemberStats counts={data?.counts ?? EMPTY_COUNTS} />

          <Card>
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  mb: 2,
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", sm: "center" },
                }}
              >
                <Typography variant="h6">
                  Afiliados ({data?.total ?? 0})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => void refetch()} disabled={isFetching}>
                    Actualizar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setDialogOpen(true)}
                  >
                    + Agregar miembro
                  </Button>
                </Stack>
              </Stack>

              {isFetching && <LinearProgress sx={{ mb: 1 }} />}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  No se pudo cargar la lista: {error.message}
                </Alert>
              )}
              {data && <MembersTable members={data.members} />}
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <AddMemberDialog
        open={dialogOpen}
        today={data?.today}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToast(null)}
        >
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
}

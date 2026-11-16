import { useState } from "react";
import type { FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { PLANS } from "../constants";
import { useRegisterMember } from "../hooks/useMembers";
import type { Plan, RegisterMemberResponse } from "../types";

interface Props {
  open: boolean;
  today?: string;
  onClose: () => void;
  onCreated: (result: RegisterMemberResponse) => void;
}

const EMPTY_FORM = { name: "", email: "", plan: "mensual" as Plan, paidAt: "" };

export function AddMemberDialog({ open, today, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const mutation = useRegisterMember();
  const saving = mutation.isPending;

  const update = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleClose() {
    if (saving) return;
    setForm(EMPTY_FORM);
    mutation.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        name: form.name,
        email: form.email,
        plan: form.plan,
        ...(form.paidAt ? { paidAt: form.paidAt } : {}),
      },
      {
        onSuccess: (result) => {
          setForm(EMPTY_FORM);
          mutation.reset();
          onCreated(result);
        },
      },
    );
  }

  const error = mutation.error?.message;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Agregar miembro / registrar pago</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => update("name")(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email")(e.target.value)}
              helperText="Si el email ya existe, se registra como renovación"
              required
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Plan"
                value={form.plan}
                onChange={(e) => update("plan")(e.target.value)}
                fullWidth
              >
                {PLANS.map((plan) => (
                  <MenuItem
                    key={plan}
                    value={plan}
                    sx={{ textTransform: "capitalize" }}
                  >
                    {plan}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha de pago"
                type="date"
                value={form.paidAt}
                onChange={(e) => update("paidAt")(e.target.value)}
                helperText="Vacío = hoy"
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: today },
                }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Guardando…" : "Registrar"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

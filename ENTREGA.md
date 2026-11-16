# Gym Reminders: avisos de mensualidad 100% serverless para gimnasios de barrio

## El problema

En Colombia, la mayoría de los gimnasios de barrio controla las mensualidades en un cuaderno o en una hoja de Excel. Nadie le avisa al afiliado que su plan está por vencer: se le olvida pagar, deja de ir y el gimnasio pierde ese ingreso. Cuando la recepción quiere recuperarlo, alguien tiene que revisar la lista a mano y escribirle a cada persona.

Estos gimnasios no tienen equipo de tecnología ni presupuesto para un servidor encendido 24/7. Necesitan algo que funcione solo y que no cueste nada cuando no se usa.

## Qué hace

- **Registra pagos** (`POST /members`): guarda al afiliado y calcula su fecha de vencimiento según el plan (mensual, trimestral, semestral o anual). Respeta los fines de mes: un pago el 31 de enero vence el 28 de febrero. Si alguien renueva antes de vencer, los días que le quedan no se pierden: el nuevo plan se suma desde su vencimiento actual.
- **Lista afiliados** (`GET /members`): muestra cada afiliado con su estado (**activo**, **por vencer** o **vencido**), ordenados por vencimiento y con totales por estado. El estado no se guarda: se calcula en cada consulta con la fecha de hoy en hora Bogotá, así que nunca queda desactualizado.
- **Envía recordatorios automáticos**: todos los días a las 7:00 AM (hora Bogotá) le envía un correo a cada afiliado que vence en 3 días o menos, o que ya venció.
- **Panel de recepción** (React + MUI, carpeta `gym-web/`): una sola pantalla con totales por estado, botón para agregar un miembro y la lista de afiliados, incluida una columna que muestra si ya se le envió el aviso por correo. Para el demo corre en local, conectado a la API desplegada.
- **No repite avisos**: cada afiliado recibe un solo correo por estado. Si la tarea diaria se ejecuta dos veces, o se ejecuta a mano, nadie recibe el mismo correo dos veces. Cuando el afiliado renueva, los avisos se reinician.

## Arquitectura

```
Panel de recepción (React + MUI)
        │
        ▼
Amazon API Gateway (HTTP API)
   ├── POST /members ──► AWS Lambda: RegisterPayment ──┐
   └── GET  /members ──► AWS Lambda: ListMembers ──────┤
                                                       ▼
                                              Amazon DynamoDB
                                              (tabla de afiliados)
                                                       ▲
Amazon EventBridge Scheduler                           │
(todos los días 7:00 AM, America/Bogota)               │
        │                                              │
        ▼                                              │
AWS Lambda: SendReminders ─────────────────────────────┘
        │
        ▼
Amazon SES ──► correo al afiliado
```

## Servicios serverless y cómo se conectan

| Servicio                                        | Rol                                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Amazon API Gateway (HTTP API)**               | Expone `POST /members` y `GET /members`. Cada ruta invoca su propia Lambda.                                                             |
| **AWS Lambda** (3 funciones, Node.js 22, arm64) | `RegisterPayment` valida y guarda el pago. `ListMembers` lee y calcula estados. `SendReminders` busca vencimientos y envía correos.     |
| **Amazon DynamoDB** (on-demand)                 | Guarda los afiliados con la clave `memberId` (el email). También guarda `lastNotice`, el último aviso enviado, para no repetir correos. |
| **Amazon EventBridge Scheduler**                | Ejecuta `SendReminders` todos los días a las 7:00 AM en la zona horaria `America/Bogota`, sin convertir a UTC.                          |
| **Amazon SES**                                  | Envía los correos de recordatorio en texto y HTML.                                                                                      |
| **AWS SAM**                                     | Define toda la infraestructura en un solo `template.yaml` y la despliega con un comando.                                                |

## Decisiones de diseño

- **Escala a cero**: no hay ningún servidor encendido. Lambda y DynamoDB on-demand cobran por uso. Un gimnasio de barrio con unos cientos de afiliados cabe en la capa gratuita de Lambda, y SES cuesta centavos por cada mil correos.
- **Una Lambda por responsabilidad, con permisos mínimos**: `ListMembers` solo puede leer la tabla, y **solo `SendReminders` puede enviar correos**. Aunque la API sea pública, nadie puede usarla para enviar correos.
- **Idempotencia**: el campo `lastNotice = estado#vencimiento` hace que cada aviso se envíe una sola vez. Si SES falla para un afiliado, no se marca como avisado y se reintenta en la siguiente ejecución, sin detener el envío a los demás.
- **Fechas en hora local**: todas las fechas se calculan en hora Bogotá. Así, "vence mañana" significa mañana para el afiliado, no para un servidor en UTC.
- **Cero dependencias**: el código usa el AWS SDK v3 que ya viene incluido en Lambda. No hay `package.json` ni `node_modules` ni paso de build.

## Cómo desplegarlo (sin pipeline)

Todo se hace desde AWS CloudShell, sin instalar nada:

```bash
git clone https://github.com/AyrielNoriega/gym-reminders.git
cd gym-reminders
sam deploy --guided        # pide el correo remitente, el nombre del gimnasio y los días de aviso
bash scripts/seed.sh --reset   # opcional: carga afiliados de ejemplo
```

El correo remitente debe estar verificado en SES (`aws ses verify-email-identity`). Para borrar todo: `sam delete --stack-name gym-reminders`.

## El patrón es reutilizable

"Registrar un vencimiento, calcular su estado al consultar y enviar un aviso diario sin repetir" sirve para cualquier negocio de suscripción: academias de baile, escuelas de idiomas, coworkings, parqueaderos mensuales, alquiler de equipos. Para adaptarlo basta con cambiar los planes en `src/shared.mjs` y el texto del correo.

## Siguientes pasos

- **WhatsApp** como canal principal, porque en Colombia la gente lo revisa más que el correo.
- **Salir del sandbox de SES** para enviar a cualquier afiliado sin verificar su correo.
- **Varios gimnasios** en la misma tabla con un `gymId` y autenticación para la recepción (Amazon Cognito).
- **Índice secundario (GSI) sobre `expiresAt`** en lugar de `Scan`, para gimnasios con miles de afiliados.
- **Amazon SQS entre la detección y el envío**, para reintentos y para no depender del tiempo máximo de una sola Lambda.
- **Publicar el panel de recepción** en Amazon S3 + CloudFront dentro del mismo template de SAM.

## Enlaces

- Código: https://github.com/AyrielNoriega/gym-reminders
- Video: [\[LINK DEL VIDEO\]](https://www.youtube.com/watch?v=Z-uyOXpaxr0)

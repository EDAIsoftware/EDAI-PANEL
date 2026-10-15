# EDAI Tiendas

Plataforma de tiendas online que EDAI alquila a negocios. Un solo proyecto con tres partes:

| Dirección | Qué es |
|---|---|
| `admin.edaisoftware.com` | Panel maestro de EDAI (solo tú) |
| `panel.edaisoftware.com` | Panel de los dueños de tienda (cada uno ve solo la suya) |
| `nombre.edaisoftware.com` | Tienda pública de cada cliente |
| `invitaciones.edaisoftware.com/ana-y-luis` | Invitación digital de cada evento |

Hecho con Next.js 15 + Supabase, desplegado en Vercel.

---

## 1. Supabase (base de datos y usuarios)

1. Entra a supabase.com → **New project**. Nómbralo `edai-tiendas` y elige la región **South America (São Paulo)**, que es la más cercana a Bolivia. Guarda la contraseña de la base de datos en un lugar seguro.
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**. Esto crea las tablas, la seguridad por tienda, las funciones de las tiendas públicas y el espacio para las fotos.
3. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**. Así nadie puede crearse una cuenta solo; los usuarios los creas tú desde el panel maestro.
4. **Authentication → URL Configuration**:
   - Site URL: `https://panel.edaisoftware.com`
   - Redirect URLs: agrega `https://panel.edaisoftware.com/**`, `https://admin.edaisoftware.com/**` y `http://localhost:3000/**`
5. **Crea tu usuario de administrador**: Authentication → Users → **Add user → Create new user**, con tu correo y una contraseña fuerte, y marca **Auto Confirm User**. Luego en el SQL Editor ejecuta (con tu correo):

   ```sql
   insert into public.perfiles (user_id, rol, correo)
   select id, 'admin', email from auth.users where email = 'TU-CORREO@gmail.com';
   ```

6. **Project Settings → API**: copia la *Project URL*, la *anon public key* y la *service_role key*. Las usarás en el paso 2 y 4.

> La **service_role key** da acceso total a la base de datos. Nunca la pegues en el código, en GitHub ni la compartas.

> **Si ya tenías la base creada antes** y actualizas el proyecto, ejecuta también los archivos `supabase/migracion-XXX.sql` que no hayas corrido, en orden.

## 2. Probarlo en tu computadora

Necesitas Node.js 20 o más nuevo.

```bash
npm install
cp .env.example .env.local      # en Windows: copy .env.example .env.local
```

Abre `.env.local`, pega tus claves de Supabase y cambia `NEXT_PUBLIC_PANEL_URL=http://localhost:3000`. Después:

```bash
npm run dev
```

- `http://localhost:3000/login` → entra con tu usuario admin
- `http://localhost:3000/admin` → panel maestro
- `http://localhost:3000/panel` → panel del dueño (entra con un usuario de tienda)
- `http://localhost:3000/t/nombre-tienda` → tienda pública

## 3. Subir a GitHub

Desde la carpeta del proyecto (cambia `TU-USUARIO` por el tuyo):

```bash
git init
git add .
git commit -m "EDAI Tiendas: primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/edai-tiendas.git
git push -u origin main
```

El archivo `.gitignore` ya evita que se suban `.env.local` y `node_modules`. Antes de hacer push, revisa con `git status` que `.env.local` **no** aparezca en la lista.

Mantén el repositorio **privado**.

## 4. Publicar en Vercel

1. vercel.com → **Add New → Project** → importa el repositorio `edai-tiendas`.
2. En **Environment Variables** agrega las mismas variables de `.env.example` con tus valores reales (con `NEXT_PUBLIC_PANEL_URL=https://panel.edaisoftware.com`).
3. **Deploy**.
4. En el proyecto → **Settings → Domains**, agrega:
   - `admin.edaisoftware.com`
   - `panel.edaisoftware.com`
   - `*.edaisoftware.com` (comodín para que cada tienda nueva funcione sola)

   Tu página `www.edaisoftware.com` sigue en su propio proyecto de Vercel y no se toca.

**Sobre el comodín:** Vercel pide que el dominio use sus *nameservers* para los subdominios comodín. Si compraste `edaisoftware.com` en otro lugar (GoDaddy, Namecheap, etc.), entra ahí y cambia los nameservers por los que te indique Vercel. Tu página actual sigue funcionando porque también está en Vercel. Después del cambio, revisa en Vercel que los registros de correo (MX), si los tienes, se hayan copiado.

**Dominio propio de un cliente** (plan Negocio o Empresa): agrega el dominio del cliente en Vercel → Domains de este mismo proyecto, pide al cliente que apunte su dominio a Vercel, y escribe el dominio en la ficha de la tienda en tu panel maestro.

## 5. Primera prueba completa

1. Entra a `admin.edaisoftware.com/login` con tu usuario admin.
2. **Agregar tienda**: llena los datos, el correo del dueño y el rubro.
3. Copia el enlace de invitación (o mándalo por WhatsApp) y ábrelo en otra ventana privada: crea la contraseña del dueño.
4. En el panel del dueño agrega un producto con fotos.
5. Abre `nombre.edaisoftware.com`, agrega al carrito y envía un pedido.
6. Revisa que el pedido aparezca en **Ventas** del dueño y en las métricas de tu panel.

---

## Cómo está organizado

```
middleware.ts            decide qué mostrar según el subdominio
supabase/schema.sql      tablas, seguridad y funciones (ejecutar en Supabase)
app/login, crear-clave   acceso y creación de contraseña
app/auth/confirm         recibe los enlaces de invitación y recuperación
app/admin/...            panel maestro (tiendas, ficha, accesos, ajustes, suspender, eliminar)
app/panel/...            panel del dueño (hoy, productos, ventas)
app/t/[slug]/...         tienda pública (plantilla base)
lib/rubros.ts            campos y listas por rubro
lib/planes.ts            planes y límites (los límites reales los hace cumplir la base de datos)
```

**Seguridad:** cada tabla tiene seguridad por filas (RLS). Un dueño solo puede leer y escribir datos de su tienda, aunque intente otra cosa desde el navegador. Los precios de los pedidos de la tienda web se calculan en la base de datos, no en el navegador. Los límites de productos y fotos por plan también los controla la base de datos.

**Tiendas con diseño a medida:** reemplazan el archivo `app/t/[slug]/Tienda.tsx` (o usan una plantilla por rubro) y siguen usando las mismas funciones `tienda_publica` y `crear_pedido`.

## Invitaciones digitales

- Tú creas el evento en **Panel maestro → Nueva invitación** y le mandas el acceso al cliente.
- El cliente entra al mismo `panel.edaisoftware.com`: edita su invitación (textos, lugares, fotos, regalos, música), carga su lista de invitados con pases por familia y ve quién confirma.
- Cada familia recibe su enlace personal (`…/ana-y-luis?p=código`) y no puede confirmar más personas que sus pases.
- Planes de pago único (Esencial, Completa, Premium) en la tabla `planes_evento`.
- Requiere las migraciones `supabase/migracion-003-invitaciones.sql` y `supabase/migracion-004-apariencia-y-planes.sql`, y la variable `NEXT_PUBLIC_INVITACIONES_URL`.

## Orden de las migraciones

`schema.sql` → `migracion-002-codigos.sql` → `migracion-003-invitaciones.sql` → `migracion-004-apariencia-y-planes.sql` → `migracion-005-boveda.sql` → `migracion-006-crm.sql` (y una sola vez `datos-iniciales-crm.sql`). Todas se pueden volver a ejecutar sin romper nada.

## Bóveda de contraseñas

Sección **Bóveda** del panel maestro, solo para el administrador. Todo se cifra en el navegador con la contraseña maestra (PBKDF2 + AES-256-GCM); la base de datos guarda solo texto cifrado. Si se olvida la contraseña maestra, los datos no se pueden recuperar.

## CRM de EDAI

Dentro del panel maestro, sección **CRM**: inicio con utilidad del mes, cobrado, por cobrar, gastos, ingreso recurrente, próximas acciones, embudo y ventas por mes; **Prospectos** en tablero por etapas; **Clientes** con ficha, ventas, pagos e historial; **Ventas** con margen y saldos; **Servicios** (catálogo de paquetes) y **Gastos**. En **Ajustes** del CRM se define el tipo de cambio y las divisiones. Solo el administrador puede ver estas tablas.

## Pendiente para las siguientes versiones

- Verificación en dos pasos para tu cuenta de admin (Supabase MFA). **Actívala antes de tener muchos clientes.**
- Sección Apariencia del dueño (logo y colores) y plantillas de tienda por rubro.
- Métricas avanzadas del panel maestro (oportunidades, clientes en riesgo).
- Límite de pedidos por minuto en las tiendas públicas para frenar abusos.
- QR de entrada por invitado para controlar el ingreso al salón.

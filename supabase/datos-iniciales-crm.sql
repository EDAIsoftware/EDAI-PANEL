-- =====================================================================
--  Datos iniciales del CRM, tomados de tu planilla CRM.xlsx
--  Ejecútalo UNA sola vez, después de migracion-006-crm.sql.
--  Revisa luego en el CRM las ventas marcadas "(desde planilla)".
-- =====================================================================

do $$
declare div uuid; c uuid; v uuid; s uuid;
begin
  select id into div from crm_divisiones where nombre = 'Div. 1: Desarrollo';

  if not exists (select 1 from crm_servicios) then
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Emprendedor Start & Grow', 'unico', 'USD', 120, 180, '2 a 3 días hábiles', 'Emprendimientos emergentes, marcas personales, pequeñas tiendas en Santa Cruz.', 'Landing page / tarjeta digital responsiva, catálogo base (8-10 productos), pedido por WhatsApp, Google Maps, QR de pagos. Escalable a catálogo o carrito.', 'Arranque rápido: ofertas en WhatsApp, cobros por QR y organización de fotos de productos.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Web Express Corporativa', 'unico', 'USD', 250, 350, '3 a 5 días hábiles', 'Negocios locales consolidados, profesionales, clínicas, consultoras.', 'Landing de 1 página (Inicio, Servicios, Nosotros, Galería, Contacto), WhatsApp y formulario, SEO básico, dominio + hosting 1 año.', 'Captación: propuesta de valor, textos de venta y llamadas a la acción.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Tienda Online (E-commerce)', 'unico', 'USD', 500, 800, '7 a 14 días hábiles', 'Tiendas de ropa, accesorios, electrónica o comercios con catálogo grande.', 'Catálogo dinámico, carrito, pasarelas de pago (QR, tarjetas, PayPal), pedidos a WhatsApp, panel de stock y productos.', 'E-commerce: categorías e inventario, pasarelas de pago y capacitación del panel.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Software / App a Medida', 'unico', 'USD', 1000, null, '3 a 6 semanas', 'Empresas que necesitan automatización, reservas, inventarios o SaaS.', 'Arquitectura a medida, base de datos, usuarios con roles, panel administrativo, documentación y garantía.', 'Arquitectura y procesos: requerimientos, flujo operativo y capacitación.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Mantenimiento & Hosting Web', 'mensual', 'USD', 30, 50, null, null, 'Respaldo mensual, hosting rápido, actualizaciones y ajustes menores de contenido.', 'Reporte mensual de rendimiento y recomendaciones.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Soporte Técnico & Infraestructura', 'mensual', 'USD', 100, null, null, null, 'Soporte directo para sistemas a medida, servidores, base de datos e incidencias.', 'Monitoreo y optimización en la nube.');
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Tienda en alquiler · Emprende', 'mensual', 'BOB', 99, 99, null, 'Negocios que empiezan', 'Plataforma EDAI Tiendas, hasta 80 productos.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Tienda en alquiler · Negocio', 'mensual', 'BOB', 199, 199, null, 'Negocios en crecimiento', 'Diseño a medida, dominio propio, hasta 400 productos.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Tienda en alquiler · Empresa', 'mensual', 'BOB', 349, 349, null, 'Negocios grandes', 'Productos ilimitados, 5 usuarios, cupones.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Invitación digital · Express', 'unico', 'BOB', 49, 49, null, 'Eventos', 'Plantilla, confirmación general.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Invitación digital · Esencial', 'unico', 'BOB', 99, 99, null, 'Eventos', 'Música, mapa, 3 fotos.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Invitación digital · Completa', 'unico', 'BOB', 199, 199, null, 'Bodas y XV años', 'Pases por familia, panel, regalos con QR.', null);
    insert into crm_servicios (division_id, nombre, tipo, moneda, precio_min, precio_max, entrega, publico, incluye, asesoria) values (div, 'Invitación digital · Premium', 'unico', 'BOB', 399, 399, null, 'Eventos grandes', 'Diseño a medida, ilimitado.', null);
  end if;

  -- CLI-01 BLANCA RODALES
  if not exists (select 1 from crm_clientes where lower(nombre) = lower('BLANCA RODALES')) then
    insert into crm_clientes (nombre, empresa, telefono, email, division_id, origen, notas) values ('Blanca Rodales', 'Medalu', '598 92828243', 'blancarodales16@gmail.com', div, 'Planilla', 'Creacion de pagina para su tienda tipo bazar') returning id into c;
    select id into s from crm_servicios where nombre = 'Emprendedor Start & Grow';
    insert into crm_ventas (cliente_id, division_id, servicio_id, descripcion, tipo, moneda, valor, costo, estado, fecha, notas) values (c, div, s, 'Creacion de pagina para su tienda tipo bazar', 'unico', 'USD', 50.0, 5, 'En desarrollo', '2026-08-20', 'Importado desde planilla: revisar estado, valor y pagos.') returning id into v;
    insert into crm_pagos (venta_id, fecha, monto, metodo, nota) values (v, '2026-08-20', 20.0, null, 'Total histórico de la planilla');
  end if;

  -- CLI-02 JEANNINE ISABEL DELFIN CUELLAR
  if not exists (select 1 from crm_clientes where lower(nombre) = lower('JEANNINE ISABEL DELFIN CUELLAR')) then
    insert into crm_clientes (nombre, empresa, telefono, email, division_id, origen, notas) values ('Jeannine Isabel Delfin Cuellar', 'Isarte', null, null, div, 'Planilla', 'se creara un apagin acon catalogo para diseños manuales que realiza con opcion a imlemenar ropa') returning id into c;
    select id into s from crm_servicios where nombre = 'Emprendedor Start & Grow';
    insert into crm_ventas (cliente_id, division_id, servicio_id, descripcion, tipo, moneda, valor, costo, estado, fecha, notas) values (c, div, s, 'se creara un apagin acon catalogo para diseños manuales que realiza con opcion a imlemenar ropa', 'unico', 'USD', 20.0, 0, 'En desarrollo', current_date, 'Importado desde planilla: revisar estado, valor y pagos.') returning id into v;
    insert into crm_pagos (venta_id, fecha, monto, metodo, nota) values (v, current_date, 20.0, null, 'Total histórico de la planilla');
  end if;

  -- CLI-03 CHAVELA
  if not exists (select 1 from crm_clientes where lower(nombre) = lower('CHAVELA')) then
    insert into crm_clientes (nombre, empresa, telefono, email, division_id, origen, notas) values ('Chavela', 'CHAVELA', null, null, div, 'Planilla', null) returning id into c;
  end if;

  -- CLI-04 SAUL ACOSTA
  if not exists (select 1 from crm_clientes where lower(nombre) = lower('SAUL ACOSTA')) then
    insert into crm_clientes (nombre, empresa, telefono, email, division_id, origen, notas) values ('Saul Acosta', null, null, null, div, 'Planilla', 'Creacion de una plataforma para controlar la distibucion de cuentas') returning id into c;
  end if;

  -- CLI-05 SPANISH ADVENTURES
  if not exists (select 1 from crm_clientes where lower(nombre) = lower('SPANISH ADVENTURES')) then
    insert into crm_clientes (nombre, empresa, telefono, email, division_id, origen, notas) values ('Spanish Adventures', 'SPANISH ADVENTURES', '591 73468884', null, div, 'Planilla', 'Creación de un aplataforma para turismo ()') returning id into c;
    s := null;
    insert into crm_ventas (cliente_id, division_id, servicio_id, descripcion, tipo, moneda, valor, costo, estado, fecha, notas) values (c, div, s, 'Creación de un aplataforma para turismo ()', 'unico', 'USD', 1000.0, 0, 'En desarrollo', current_date, 'Importado desde planilla: revisar estado, valor y pagos.') returning id into v;
    insert into crm_pagos (venta_id, fecha, monto, metodo, nota) values (v, current_date, 1000.0, null, 'Total histórico de la planilla');
  end if;

  if not exists (select 1 from crm_gastos) then
    insert into crm_gastos (concepto, categoria, moneda, monto, periodicidad, inicio, renovacion) values ('Gemini', 'Herramientas IA', 'USD', 2.10, 'mensual', '2026-09-28', null);
    insert into crm_gastos (concepto, categoria, moneda, monto, periodicidad, inicio, renovacion, notas) values ('Claude', 'Herramientas IA', 'USD', 0, 'mensual', '2026-10-13', null, 'Completar el monto');
    insert into crm_gastos (concepto, categoria, moneda, monto, periodicidad, inicio, renovacion) values ('Dominio edaisoftware.com', 'Dominio y hosting', 'USD', 14, 'anual', '2026-09-28', '2027-09-28');
  end if;
end $$;
